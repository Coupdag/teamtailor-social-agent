import dotenv from 'dotenv';
import { Config } from '../types';

dotenv.config();

const requiredEnvVars = [
  'LINKEDIN_CLIENT_ID',
  'LINKEDIN_CLIENT_SECRET', 
  'LINKEDIN_ACCESS_TOKEN',
  'LINKEDIN_ORGANIZATION_ID',
  'FACEBOOK_APP_ID',
  'FACEBOOK_APP_SECRET',
  'FACEBOOK_ACCESS_TOKEN',
  'FACEBOOK_PAGE_ID',
  'OPENAI_API_KEY',
  'TEAMTAILOR_WEBHOOK_SECRET'
];

// Validate required environment variables (only in non-serverless environments)
const missingVars: string[] = [];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    missingVars.push(envVar);
  }
}

// Only throw error if not in Vercel serverless environment
if (missingVars.length > 0 && !process.env.VERCEL) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Log warning for missing variables in serverless
if (missingVars.length > 0 && process.env.VERCEL) {
  console.warn(`Warning: Missing environment variables: ${missingVars.join(', ')}`);
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  teamtailor: {
    webhookSecret: process.env.TEAMTAILOR_WEBHOOK_SECRET || 'placeholder',
  },

  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID || 'placeholder',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || 'placeholder',
    accessToken: process.env.LINKEDIN_ACCESS_TOKEN || 'placeholder',
    organizationId: process.env.LINKEDIN_ORGANIZATION_ID || 'placeholder',
  },

  facebook: {
    appId: process.env.FACEBOOK_APP_ID || 'placeholder',
    appSecret: process.env.FACEBOOK_APP_SECRET || 'placeholder',
    accessToken: process.env.FACEBOOK_ACCESS_TOKEN || 'placeholder',
    pageId: process.env.FACEBOOK_PAGE_ID || 'placeholder',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || 'placeholder',
    model: process.env.OPENAI_MODEL || 'gpt-4',
  },

  wippiiwork: {
    baseUrl: process.env.WIPPIIWORK_BASE_URL || 'https://wippiiwork.com',
  },
};

export default config;
