import axios from 'axios';
import config from '../utils/config';
import logger from '../utils/logger';
import { TeamTailorWebhookPayload } from '../types';

/**
 * Format job posting for Google Chat with generated content
 */
function formatJobForGoogleChat(job: any, generatedText: string, jobUrl: string): any {
  return {
    text: `🎯 Uusi työpaikka julkaistu!`,
    cards: [
      {
        header: {
          title: job.title || 'Uusi työpaikka',
          subtitle: job.company?.name || 'Wippii Work',
          imageUrl: 'https://wippiiwork.com/favicon.ico'
        },
        sections: [
          {
            widgets: [
              {
                textParagraph: {
                  text: generatedText
                }
              },
              {
                buttons: [
                  {
                    textButton: {
                      text: 'Katso työpaikka',
                      onClick: {
                        openLink: {
                          url: jobUrl
                        }
                      }
                    }
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  };
}

/**
 * Send job posting to Google Chat with generated content
 */
export async function sendJobToGoogleChat(job: any, generatedText: string, jobUrl: string): Promise<boolean> {
  try {
    if (!config.googleChat.webhookUrl) {
      logger.warn('Google Chat webhook URL not configured');
      return false;
    }

    const message = formatJobForGoogleChat(job, generatedText, jobUrl);

    logger.info('Sending job to Google Chat', {
      jobId: job.id,
      jobTitle: job.title,
      generatedTextLength: generatedText.length,
      webhookUrl: config.googleChat.webhookUrl.substring(0, 50) + '...'
    });

    const response = await axios.post(config.googleChat.webhookUrl, message, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    if (response.status === 200) {
      logger.info('Successfully sent job to Google Chat', {
        jobId: job.id,
        jobTitle: job.title,
        status: response.status
      });
      return true;
    } else {
      logger.error('Failed to send job to Google Chat', {
        jobId: job.id,
        status: response.status,
        statusText: response.statusText
      });
      return false;
    }

  } catch (error: any) {
    logger.error('Error sending job to Google Chat', {
      jobId: job.id,
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    return false;
  }
}
