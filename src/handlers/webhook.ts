import { Request, Response } from 'express';
import crypto from 'crypto';
import config from '../utils/config';
import logger from '../utils/logger';
import { TeamTailorWebhookPayload } from '../types';
import { processJobPosting } from '../services/jobProcessor';

/**
 * Verify TeamTailor webhook signature
 */
function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', config.teamtailor.webhookSecret)
    .update(payload, 'utf8')
    .digest('hex');

  const providedSignature = signature.replace('sha256=', '');
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(providedSignature, 'hex')
  );
}

/**
 * TeamTailor webhook handler
 */
export async function webhookHandler(req: Request, res: Response): Promise<void> {
  try {
    const signature = req.headers['x-teamtailor-signature'] as string;
    const payload = JSON.stringify(req.body);

    // Verify webhook signature for security
    if (!verifyWebhookSignature(payload, signature)) {
      logger.warn('Invalid webhook signature', {
        signature,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    const webhookData: TeamTailorWebhookPayload = req.body;

    logger.info('TeamTailor webhook received', {
      event: webhookData.event,
      jobId: webhookData.data.id,
      jobTitle: webhookData.data.title,
      timestamp: webhookData.timestamp,
    });

    // Process only job creation and update events
    if (webhookData.event === 'job.created' || webhookData.event === 'job.updated') {
      // Only process if job is published/open
      if (webhookData.data.status === 'open') {
        logger.info('Processing job for social media posting', {
          jobId: webhookData.data.id,
          jobTitle: webhookData.data.title,
          event: webhookData.event,
        });

        // Process job posting asynchronously
        processJobPosting(webhookData.data)
          .then(() => {
            logger.info('Job processing completed successfully', {
              jobId: webhookData.data.id,
            });
          })
          .catch((error) => {
            logger.error('Job processing failed', {
              jobId: webhookData.data.id,
              error: error.message,
              stack: error.stack,
            });
          });
      } else {
        logger.info('Skipping job - not published', {
          jobId: webhookData.data.id,
          status: webhookData.data.status,
        });
      }
    } else if (webhookData.event === 'job.deleted') {
      logger.info('Job deleted - no action needed', {
        jobId: webhookData.data.id,
      });
    }

    // Respond immediately to TeamTailor
    res.status(200).json({
      success: true,
      message: 'Webhook received and processed',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Webhook processing error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body,
    });

    res.status(500).json({
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}
