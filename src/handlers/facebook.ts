import axios from 'axios';
import { SocialMediaPost, FacebookPost } from '../types';
import config from '../utils/config';
import logger from '../utils/logger';

const FACEBOOK_API_BASE = 'https://graph.facebook.com/v18.0';

/**
 * Post content to Facebook Page
 */
export async function postToFacebook(post: SocialMediaPost): Promise<any> {
  try {
    logger.info('Posting to Facebook', {
      contentLength: post.content.length,
      jobUrl: post.jobUrl,
      pageId: config.facebook.pageId,
    });

    // Create Facebook post payload
    const facebookPost: FacebookPost = {
      message: post.content,
      link: post.jobUrl,
      access_token: config.facebook.accessToken,
    };

    // Make API request to Facebook
    const response = await axios.post(
      `${FACEBOOK_API_BASE}/${config.facebook.pageId}/feed`,
      facebookPost,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout
      }
    );

    logger.info('Successfully posted to Facebook', {
      postId: response.data.id,
      status: response.status,
    });

    return {
      success: true,
      platform: 'facebook',
      postId: response.data.id,
      response: response.data,
    };

  } catch (error) {
    logger.error('Failed to post to Facebook', {
      error: error instanceof Error ? error.message : 'Unknown error',
      status: axios.isAxiosError(error) ? error.response?.status : undefined,
      data: axios.isAxiosError(error) ? error.response?.data : undefined,
    });

    // Re-throw with more context
    throw new Error(
      `Facebook posting failed: ${
        axios.isAxiosError(error) 
          ? error.response?.data?.error?.message || error.message
          : error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Validate Facebook access token
 */
export async function validateFacebookToken(): Promise<boolean> {
  try {
    const response = await axios.get(
      `${FACEBOOK_API_BASE}/me`,
      {
        params: {
          access_token: config.facebook.accessToken,
        },
        timeout: 10000,
      }
    );

    logger.info('Facebook token validation successful', {
      status: response.status,
      userId: response.data.id,
    });

    return true;

  } catch (error) {
    logger.error('Facebook token validation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      status: axios.isAxiosError(error) ? error.response?.status : undefined,
    });

    return false;
  }
}

/**
 * Get Facebook page info
 */
export async function getFacebookPageInfo(): Promise<any> {
  try {
    const response = await axios.get(
      `${FACEBOOK_API_BASE}/${config.facebook.pageId}`,
      {
        params: {
          fields: 'id,name,category,about,link,fan_count',
          access_token: config.facebook.accessToken,
        },
        timeout: 10000,
      }
    );

    return response.data;

  } catch (error) {
    logger.error('Failed to get Facebook page info', {
      error: error instanceof Error ? error.message : 'Unknown error',
      pageId: config.facebook.pageId,
    });

    throw error;
  }
}

/**
 * Check Facebook page permissions
 */
export async function checkFacebookPermissions(): Promise<string[]> {
  try {
    const response = await axios.get(
      `${FACEBOOK_API_BASE}/${config.facebook.pageId}`,
      {
        params: {
          fields: 'perms',
          access_token: config.facebook.accessToken,
        },
        timeout: 10000,
      }
    );

    return response.data.perms || [];

  } catch (error) {
    logger.error('Failed to check Facebook permissions', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return [];
  }
}
