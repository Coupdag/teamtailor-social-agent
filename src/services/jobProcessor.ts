import { TeamTailorJob } from '../types';
import logger from '../utils/logger';
import config from '../utils/config';
import { generateSocialMediaText } from './textGenerator';
import { postToLinkedIn } from '../handlers/linkedin';
import { postToFacebook } from '../handlers/facebook';
import { sendJobToGoogleChat } from './googleChat';

/**
 * Process a job posting for social media
 */
export async function processJobPosting(job: TeamTailorJob): Promise<void> {
  const startTime = Date.now();

  try {
    logger.info('Starting job processing', {
      jobId: job.id,
      jobTitle: job.title,
      company: job.company.name,
    });

    // Generate job URL for wippiiwork site
    logger.info('Generating job URL', { jobId: job.id });
    const jobUrl = `${config.wippiiwork.baseUrl}/careers/${job.company.slug}/${job.id}`;
    logger.info('Job URL generated', { jobId: job.id, jobUrl });

    // Generate social media texts with individual error handling
    logger.info('About to generate social media texts', { jobId: job.id });

    let linkedInText: string;
    let facebookText: string;

    try {
      logger.info('Calling generateSocialMediaText for LinkedIn', { jobId: job.id });
      linkedInText = await generateSocialMediaText(job, 'linkedin');
      logger.info('LinkedIn text generated successfully', {
        jobId: job.id,
        textLength: linkedInText.length,
        textPreview: linkedInText.substring(0, 100) + '...'
      });
    } catch (error) {
      logger.error('Failed to generate LinkedIn text', {
        jobId: job.id,
        error: (error as any)?.message || 'Unknown error',
        stack: (error as any)?.stack,
      });
      throw error;
    }

    try {
      logger.info('Calling generateSocialMediaText for Facebook', { jobId: job.id });
      facebookText = await generateSocialMediaText(job, 'facebook');
      logger.info('Facebook text generated successfully', {
        jobId: job.id,
        textLength: facebookText.length,
        textPreview: facebookText.substring(0, 100) + '...'
      });
    } catch (error) {
      logger.error('Failed to generate Facebook text', {
        jobId: job.id,
        error: (error as any)?.message || 'Unknown error',
        stack: (error as any)?.stack,
      });
      throw error;
    }

    logger.info('Generated social media texts', {
      jobId: job.id,
      linkedInLength: linkedInText.length,
      facebookLength: facebookText.length,
      elapsedMs: Date.now() - startTime,
    });

    // Post to social media platforms in parallel
    logger.info('About to post to social media platforms', { jobId: job.id });
    console.log(`🚀 CONSOLE: About to post to LinkedIn and Facebook for job ${job.id}`);

    const postingPromises = [
      postToLinkedIn({
        platform: 'linkedin',
        content: linkedInText,
        jobUrl,
      }),
      postToFacebook({
        platform: 'facebook',
        content: facebookText,
        jobUrl,
      }),
      // Send to Google Chat (convert job to webhook format)
      sendJobToGoogleChat({
        event: 'job.created',
        data: job,
        timestamp: new Date().toISOString()
      }),
    ];

    logger.info('Posting promises created, calling Promise.allSettled', {
      jobId: job.id,
      promiseCount: postingPromises.length
    });

    const results = await Promise.allSettled(postingPromises);

    console.log(`✅ CONSOLE: Social media posting completed for job ${job.id}`, {
      resultCount: results.length,
      elapsedMs: Date.now() - startTime
    });

    logger.info('Promise.allSettled completed', {
      jobId: job.id,
      resultCount: results.length,
      elapsedMs: Date.now() - startTime,
    });

    // Log results
    results.forEach((result, index) => {
      const platforms = ['LinkedIn', 'Facebook', 'Google Chat'];
      const platform = platforms[index] || `Platform ${index}`;
      
      if (result.status === 'fulfilled') {
        logger.info(`Successfully posted to ${platform}`, {
          jobId: job.id,
          platform: platform.toLowerCase(),
          result: result.value,
        });
      } else {
        logger.error(`Failed to post to ${platform}`, {
          jobId: job.id,
          platform: platform.toLowerCase(),
          error: result.reason?.message || 'Unknown error',
        });
      }
    });

    // Check if at least one posting succeeded
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    
    if (successCount === 0) {
      throw new Error('All social media postings failed');
    }

    logger.info('Job processing completed', {
      jobId: job.id,
      successfulPosts: successCount,
      totalAttempts: results.length,
    });

  } catch (error) {
    logger.error('Job processing failed in main catch block', {
      jobId: job.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      errorType: typeof error,
      errorName: error instanceof Error ? error.name : 'Unknown',
      elapsedMs: Date.now() - startTime,
      fullError: JSON.stringify(error, null, 2),
    });
    throw error;
  }
}

/**
 * Validate job data before processing
 */
export function validateJobData(job: TeamTailorJob): boolean {
  const requiredFields = ['id', 'title', 'company', 'status'];
  
  for (const field of requiredFields) {
    if (!job[field as keyof TeamTailorJob]) {
      logger.warn('Missing required job field', {
        jobId: job.id,
        missingField: field,
      });
      return false;
    }
  }

  if (!job.company.name || !job.company.slug) {
    logger.warn('Missing company information', {
      jobId: job.id,
      company: job.company,
    });
    return false;
  }

  return true;
}
