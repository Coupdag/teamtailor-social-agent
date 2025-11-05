import axios from 'axios';
import { SocialMediaPost, LinkedInPost } from '../types';
import config from '../utils/config';
import logger from '../utils/logger';

const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

/**
 * Post content to LinkedIn Company Page
 */
export async function postToLinkedIn(post: SocialMediaPost): Promise<any> {
  try {
    logger.info('Posting to LinkedIn', {
      contentLength: post.content.length,
      jobUrl: post.jobUrl,
    });

    // Create LinkedIn post payload
    const linkedInPost: LinkedInPost = {
      author: `urn:li:organization:${config.linkedin.organizationId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: post.content,
          },
          shareMediaCategory: 'ARTICLE',
          media: [
            {
              status: 'READY',
              description: {
                text: 'Katso työpaikkailmoitus Wippiiwork.com sivustolta',
              },
              media: post.jobUrl,
              title: {
                text: 'Uusi työmahdollisuus - Wippiiwork',
              },
            },
          ],
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    // Make API request to LinkedIn
    const response = await axios.post(
      `${LINKEDIN_API_BASE}/ugcPosts`,
      linkedInPost,
      {
        headers: {
          'Authorization': `Bearer ${config.linkedin.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        timeout: 30000, // 30 second timeout
      }
    );

    logger.info('Successfully posted to LinkedIn', {
      postId: response.data.id,
      status: response.status,
    });

    return {
      success: true,
      platform: 'linkedin',
      postId: response.data.id,
      response: response.data,
    };

  } catch (error) {
    logger.error('Failed to post to LinkedIn', {
      error: error instanceof Error ? error.message : 'Unknown error',
      status: axios.isAxiosError(error) ? error.response?.status : undefined,
      data: axios.isAxiosError(error) ? error.response?.data : undefined,
    });

    // Re-throw with more context
    throw new Error(
      `LinkedIn posting failed: ${
        axios.isAxiosError(error) 
          ? error.response?.data?.message || error.message
          : error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Validate LinkedIn access token
 */
export async function validateLinkedInToken(): Promise<boolean> {
  try {
    const response = await axios.get(
      `${LINKEDIN_API_BASE}/me`,
      {
        headers: {
          'Authorization': `Bearer ${config.linkedin.accessToken}`,
        },
        timeout: 10000,
      }
    );

    logger.info('LinkedIn token validation successful', {
      status: response.status,
    });

    return true;

  } catch (error) {
    logger.error('LinkedIn token validation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      status: axios.isAxiosError(error) ? error.response?.status : undefined,
    });

    return false;
  }
}

/**
 * Get LinkedIn organization info
 */
export async function getLinkedInOrganization(): Promise<any> {
  try {
    const response = await axios.get(
      `${LINKEDIN_API_BASE}/organizations/${config.linkedin.organizationId}`,
      {
        headers: {
          'Authorization': `Bearer ${config.linkedin.accessToken}`,
        },
        timeout: 10000,
      }
    );

    return response.data;

  } catch (error) {
    logger.error('Failed to get LinkedIn organization info', {
      error: error instanceof Error ? error.message : 'Unknown error',
      organizationId: config.linkedin.organizationId,
    });

    throw error;
  }
}
