import axios from 'axios';
import config from '../utils/config';
import logger from '../utils/logger';
import { TeamTailorWebhookPayload } from '../types';

/**
 * Format job posting for Google Chat
 */
function formatJobForGoogleChat(webhook: TeamTailorWebhookPayload): any {
  const job = webhook.data;
  const jobUrl = `https://rekry.wippiiwork.com/jobs/${job.id}`;

  return {
    text: `🎯 Uusi työpaikka julkaistu!`,
    cards: [
      {
        header: {
          title: job.title || 'Uusi työpaikka',
          subtitle: job.department?.name || 'Wippii Work',
          imageUrl: 'https://wippiiwork.com/favicon.ico'
        },
        sections: [
          {
            widgets: [
              {
                textParagraph: {
                  text: `<b>Sijainti:</b> ${job.location?.name || 'Ei määritelty'}<br>` +
                        `<b>Työsuhde:</b> ${job.employment_type || 'Ei määritelty'}<br>` +
                        `<b>Tila:</b> ${job.status || 'Ei määritelty'}`
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
 * Send job posting to Google Chat
 */
export async function sendJobToGoogleChat(webhook: TeamTailorWebhookPayload): Promise<boolean> {
  try {
    if (!config.googleChat.webhookUrl) {
      logger.warn('Google Chat webhook URL not configured');
      return false;
    }

    const message = formatJobForGoogleChat(webhook);
    const job = webhook.data;

    logger.info('Sending job to Google Chat', {
      jobId: job.id,
      jobTitle: job.title,
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
    const job = webhook.data;
    logger.error('Error sending job to Google Chat', {
      jobId: job.id,
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    return false;
  }
}
