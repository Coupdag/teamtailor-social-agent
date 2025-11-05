import { TeamTailorJob } from '../types';
import logger from '../utils/logger';
import config from '../utils/config';
import { generateSocialMediaText } from './textGenerator';
import { postToLinkedIn } from '../handlers/linkedin';
import { postToFacebook } from '../handlers/facebook';

/**
 * Process a job posting for social media
 */
export async function processJobPosting(job: TeamTailorJob): Promise<void> {
  try {
    logger.info('Starting job processing', {
      jobId: job.id,
      jobTitle: job.title,
      company: job.company.name,
    });

    // Generate job URL for wippiiwork site
    const jobUrl = `${config.wippiiwork.baseUrl}/careers/${job.company.slug}/${job.id}`;

    // Generate social media texts
    const [linkedInText, facebookText] = await Promise.all([
      generateSocialMediaText(job, 'linkedin'),
      generateSocialMediaText(job, 'facebook'),
    ]);

    logger.info('Generated social media texts', {
      jobId: job.id,
      linkedInLength: linkedInText.length,
      facebookLength: facebookText.length,
    });

    // Post to social media platforms in parallel
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
    ];

    const results = await Promise.allSettled(postingPromises);

    // Log results
    results.forEach((result, index) => {
      const platform = index === 0 ? 'LinkedIn' : 'Facebook';
      
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
    logger.error('Job processing failed', {
      jobId: job.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
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
