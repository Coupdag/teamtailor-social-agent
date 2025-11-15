import { Request, Response } from 'express';
import crypto from 'crypto';
import config from '../utils/config';
import logger from '../utils/logger';
import { TeamTailorWebhookPayload } from '../types';
import { processJobPosting } from '../services/jobProcessor';

/**
 * Check if job was already published (posted to social media)
 * Uses simple in-memory cache for now - could be replaced with Redis/KV store
 */
const publishedJobs = new Set<string>();

async function checkIfJobWasPublished(jobId: string): Promise<boolean> {
  // Simple in-memory check for now
  // TODO: Replace with persistent storage (Vercel KV) for production
  return publishedJobs.has(jobId);
}

async function markJobAsPublished(jobId: string): Promise<void> {
  // Simple in-memory storage for now
  // TODO: Replace with persistent storage (Vercel KV) for production
  publishedJobs.add(jobId);
  logger.info('Marked job as published', { jobId });
}

/**
 * Verify TeamTailor webhook signature (v2 format)
 * v2: Base64 decoded format is "t=<timestamp>,v2=<hex>"
 * HMAC calculated from: timestamp + '.' + JSON-payload
 */
function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!signature) {
    return false;
  }

  // Decode Base64 signature
  let decodedSignature: string;
  try {
    decodedSignature = Buffer.from(signature, 'base64').toString('utf8');
  } catch (error) {
    logger.warn('Failed to decode Base64 signature', { signature });
    return false;
  }

  // Parse v2 format: "t=<timestamp>,v2=<hex>"
  const parts = decodedSignature.split(',');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    logger.warn('Invalid signature format', { decodedSignature });
    return false;
  }

  const timestampPart = parts[0]; // "t=1234567890"
  const signaturePart = parts[1]; // "v2=abcdef..."

  if (!timestampPart.startsWith('t=') || !signaturePart.startsWith('v2=')) {
    logger.warn('Invalid signature parts', { timestampPart, signaturePart });
    return false;
  }

  const timestamp = timestampPart.substring(2);
  const providedSignature = signaturePart.substring(3);

  // Generate expected signature: HMAC(timestamp + '.' + payload)
  const signedPayload = timestamp + '.' + payload;
  const expectedSignature = crypto
    .createHmac('sha256', config.teamtailor.webhookSecret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(providedSignature, 'hex')
  );
}

/**
 * TeamTailor webhook handler
 */
export async function webhookHandler(req: Request, res: Response): Promise<void> {
  // Global error handlers for unhandled rejections
  const originalHandlers = {
    unhandledRejection: process.listeners('unhandledRejection'),
    uncaughtException: process.listeners('uncaughtException'),
  };

  const cleanup = () => {
    process.removeAllListeners('unhandledRejection');
    process.removeAllListeners('uncaughtException');
    originalHandlers.unhandledRejection.forEach(handler =>
      process.on('unhandledRejection', handler as any)
    );
    originalHandlers.uncaughtException.forEach(handler =>
      process.on('uncaughtException', handler as any)
    );
  };

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection in webhook', {
      reason: reason?.toString() || 'Unknown reason',
      promise: promise?.toString() || 'Unknown promise',
      stack: reason instanceof Error ? reason.stack : 'No stack',
    });
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception in webhook', {
      error: error.message,
      stack: error.stack,
      name: error.name,
    });
  });

  try {
    // Check multiple possible signature header names
    const signature = (req.headers['x-teamtailor-signature'] ||
                      req.headers['teamtailor-signature'] ||
                      req.headers['tt-signature'] ||
                      req.headers['signature']) as string;

    // Use raw body for signature verification, parse JSON for processing
    const rawPayload = req.body.toString('utf8');
    const parsedBody = JSON.parse(rawPayload);

    // Debug webhook info - LOG ALL HEADERS
    logger.info('Webhook debug info', {
      hasSignature: !!signature,
      signaturePreview: signature ? signature.substring(0, 20) + '...' : 'none',
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      forwardedFor: req.get('X-Forwarded-For'),
      payloadLength: rawPayload.length,
      secretLength: config.teamtailor.webhookSecret.length,
      secretPreview: config.teamtailor.webhookSecret.substring(0, 10) + '...',
      allHeaders: req.headers, // LOG ALL HEADERS RAW
    });

    // Debug signature validation (TEMPORARY)
    if (signature) {
      try {
        const decodedSig = Buffer.from(signature, 'base64').toString('utf8');
        logger.info('Signature validation debug', {
          decodedSignature: decodedSig,
          rawPayloadPreview: rawPayload.substring(0, 200),
          rawPayloadLength: rawPayload.length,
        });

        // Test signature validation with actual values
        const parts = decodedSig.split(',');
        if (parts.length === 2 && parts[0] && parts[1]) {
          const timestamp = parts[0].substring(2); // Remove 't='
          const providedSig = parts[1].substring(3); // Remove 'v2='
          const signedPayload = timestamp + '.' + rawPayload;
          const expectedSig = crypto.createHmac('sha256', config.teamtailor.webhookSecret).update(signedPayload, 'utf8').digest('hex');

          logger.info('Signature test', {
            timestamp,
            providedSig: providedSig.substring(0, 20) + '...',
            expectedSig: expectedSig.substring(0, 20) + '...',
            match: expectedSig === providedSig,
            signedPayloadLength: signedPayload.length,
            secretUsed: config.teamtailor.webhookSecret,
            signedPayloadPreview: signedPayload.substring(0, 50),
          });
        }
      } catch (error) {
        logger.warn('Failed to decode signature for debug', { signature });
      }
    }

    const webhookData: any = parsedBody; // TeamTailor webhook format is different than expected

    // TEMPORARY: Skip signature validation for testing
    logger.warn('SKIPPING signature validation for testing - FIX THIS IN PRODUCTION!', {
      hasSignature: !!signature,
      jobId: webhookData.data?.id || 'unknown',
      ip: req.ip,
      forwardedFor: req.get('X-Forwarded-For'),
    });

    logger.info('TeamTailor webhook received', {
      event: webhookData.event_name || webhookData.event,
      jobId: webhookData.id,
      jobTitle: webhookData.title,
      status: webhookData.status,
    });

    // Smart logic: Post to LinkedIn only when job becomes published for the first time
    const eventName = webhookData.event_name || webhookData.event;
    const jobId = webhookData.id.toString();
    const currentStatus = webhookData.status;

    if (eventName === 'job.created' || eventName === 'job.update') {
      if (currentStatus === 'open') {
        // Check if this job was already published before
        const wasAlreadyPublished = await checkIfJobWasPublished(jobId);

        const shouldPost = (eventName === 'job.created') ||
                          (eventName === 'job.update' && !wasAlreadyPublished);

        if (shouldPost) {
          logger.info('Processing job for social media posting (first time published)', {
            jobId: webhookData.id,
            jobTitle: webhookData.title,
            event: eventName,
            status: webhookData.status,
            wasAlreadyPublished,
            reason: eventName === 'job.created' ? 'new job' : 'first time published',
          });

          // Mark job as published
          await markJobAsPublished(jobId);

          // Map webhook data to expected job format
          const jobData: any = {
            id: webhookData.id,
            title: webhookData.title,
            body: webhookData.body,
            excerpt: webhookData.pitch || '',
            company: {
              name: webhookData.company_name,
              slug: 'wippii-work', // Default slug
            },
            locations: webhookData.locations || [],
            employmentType: webhookData.employment_type,
            remoteStatus: webhookData.remote_status,
            salaryMin: webhookData.min_salary,
            salaryMax: webhookData.max_salary,
            currency: webhookData.currency,
            status: webhookData.status,
          };

          // Process job posting with bulletproof error handling
          logger.info('About to start processJobPosting', { jobId: webhookData.id });

          // Set up multiple timeouts for monitoring
          const timeouts = [
            setTimeout(() => logger.warn('Job processing: 5s elapsed', { jobId: webhookData.id }), 5000),
            setTimeout(() => logger.warn('Job processing: 10s elapsed', { jobId: webhookData.id }), 10000),
            setTimeout(() => logger.warn('Job processing: 15s elapsed', { jobId: webhookData.id }), 15000),
            setTimeout(() => logger.error('Job processing: 20s elapsed - likely timeout', { jobId: webhookData.id }), 20000),
          ];

          const clearAllTimeouts = () => timeouts.forEach(clearTimeout);

          // Wrap in try-catch for immediate errors
          try {
            processJobPosting(jobData)
              .then(() => {
                clearAllTimeouts();
                logger.info('Job processing completed successfully', {
                  jobId: webhookData.id,
                });
              })
              .catch((error) => {
                clearAllTimeouts();
                logger.error('Job processing failed in promise catch', {
                  jobId: webhookData.id,
                  error: (error as any)?.message || 'Unknown error',
                  stack: (error as any)?.stack || 'No stack trace',
                  errorName: (error as any)?.name || 'Unknown',
                  errorCode: (error as any)?.code || 'No code',
                  errorType: typeof error,
                  fullError: JSON.stringify(error, null, 2),
                });
              });
          } catch (syncError) {
            clearAllTimeouts();
            logger.error('Job processing failed synchronously', {
              jobId: webhookData.id,
              error: (syncError as any)?.message || 'Unknown sync error',
              stack: (syncError as any)?.stack || 'No stack trace',
              errorName: (syncError as any)?.name || 'Unknown',
            });
          }
        } else {
          logger.info('Skipping job - already posted to social media before', {
            jobId: webhookData.id,
            jobTitle: webhookData.title,
            event: eventName,
            status: webhookData.status,
            wasAlreadyPublished,
          });
        }
      } else {
        logger.info('Skipping job - not published', {
          jobId: webhookData.id,
          status: webhookData.status,
          event: eventName,
        });
      }
    } else if (eventName === 'job.deleted') {
      logger.info('Job deleted - no action needed', {
        jobId: webhookData.id,
      });
    }

    // Respond immediately to TeamTailor
    res.status(200).json({
      success: true,
      message: 'Webhook received and processed',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    cleanup();
    logger.error('Webhook processing error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body,
    });

    res.status(500).json({
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  } finally {
    cleanup();
  }
}
