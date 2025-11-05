import { Request, Response } from 'express';
import { TeamTailorJob } from '../types';
import { processJobPosting } from '../services/jobProcessor';
import { validateLinkedInToken } from './linkedin';
import { validateFacebookToken, getFacebookPageInfo } from './facebook';
import logger from '../utils/logger';
import config from '../utils/config';

/**
 * Test endpoint for validating API connections
 */
export async function testConnections(req: Request, res: Response): Promise<void> {
  try {
    logger.info('Testing API connections');

    const results = {
      linkedin: { status: 'unknown', error: null as string | null },
      facebook: { status: 'unknown', error: null as string | null, pageInfo: null as any },
      timestamp: new Date().toISOString(),
    };

    // Test LinkedIn connection
    try {
      const linkedInValid = await validateLinkedInToken();
      results.linkedin.status = linkedInValid ? 'connected' : 'failed';
    } catch (error) {
      results.linkedin.status = 'error';
      results.linkedin.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Test Facebook connection
    try {
      const facebookValid = await validateFacebookToken();
      if (facebookValid) {
        results.facebook.status = 'connected';
        results.facebook.pageInfo = await getFacebookPageInfo();
      } else {
        results.facebook.status = 'failed';
      }
    } catch (error) {
      results.facebook.status = 'error';
      results.facebook.error = error instanceof Error ? error.message : 'Unknown error';
    }

    logger.info('API connection test completed', results);

    res.json({
      success: true,
      results,
      config: {
        linkedinOrgId: config.linkedin.organizationId,
        facebookPageId: config.facebook.pageId,
        environment: config.nodeEnv,
      },
    });

  } catch (error) {
    logger.error('Connection test failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Test endpoint for simulating a job posting
 */
export async function testJobPosting(req: Request, res: Response): Promise<void> {
  try {
    logger.info('Testing job posting workflow');

    // Create mock job data
    const mockJob: TeamTailorJob = {
      id: 'test-job-' + Date.now(),
      title: 'Senior Full Stack Developer',
      body: 'Etsimme kokeneutta full stack kehittäjää liittymään tiimiin. Työtehtäviin kuuluu modernien web-sovellusten kehittäminen React ja Node.js teknologioilla.',
      excerpt: 'Etsimme kokeneutta full stack kehittäjää modernien web-sovellusten kehittämiseen.',
      status: 'open',
      published_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      apply_url: 'https://wippiiwork.com/apply/test-job',
      employment_type: 'permanent',
      company: {
        id: 'test-company-1',
        name: 'Wippiiwork Oy',
        slug: 'wippiiwork-oy',
      },
      department: {
        id: 'tech-dept',
        name: 'Teknologia',
        slug: 'teknologia',
      },
      location: {
        id: 'helsinki',
        name: 'Helsinki',
        slug: 'helsinki',
      },
    };

    // Process the mock job
    await processJobPosting(mockJob);

    logger.info('Test job posting completed successfully', {
      jobId: mockJob.id,
    });

    res.json({
      success: true,
      message: 'Test job posting completed successfully',
      jobData: mockJob,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Test job posting failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
