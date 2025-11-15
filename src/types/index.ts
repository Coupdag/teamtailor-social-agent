// TeamTailor webhook data types (based on wippiiwork integration)
export interface TeamTailorJob {
  id: string;
  title: string;
  body: string;
  excerpt: string;
  status: 'open' | 'closed' | 'draft';
  published_at: string;
  expires_at: string | null;
  apply_url: string;
  employment_type: string;
  company: {
    id: string;
    name: string;
    slug: string;
  };
  department: {
    id: string;
    name: string;
    slug: string;
  } | null;
  location: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface TeamTailorWebhookPayload {
  event: 'job.created' | 'job.updated' | 'job.deleted';
  data: TeamTailorJob;
  timestamp: string;
}

// Social media post types
export interface SocialMediaPost {
  platform: 'linkedin' | 'facebook';
  content: string;
  jobUrl: string;
  imageUrl?: string;
}

export interface LinkedInPost {
  author: string; // Organization URN (urn:li:organization:123456)
  commentary: string;
  visibility: 'PUBLIC';
  distribution: {
    feedDistribution: 'MAIN_FEED';
    targetEntities: any[];
    thirdPartyDistributionChannels: any[];
  };
  content: {
    article: {
      source: string;
      title: string;
      description: string;
    };
  };
  lifecycleState: 'PUBLISHED';
  isReshareDisabledByAuthor: boolean;
}

export interface FacebookPost {
  message: string;
  link?: string;
  access_token: string;
}

// Configuration types
export interface Config {
  port: number;
  nodeEnv: string;
  baseUrl: string;
  teamtailor: {
    webhookSecret: string;
  };
  linkedin: {
    clientId: string;
    clientSecret: string;
    accessToken: string;
    organizationId: string;
  };
  facebook: {
    appId: string;
    appSecret: string;
    accessToken: string;
    pageId: string;
  };
  openai: {
    apiKey: string;
    model: string;
  };
  wippiiwork: {
    baseUrl: string;
  };
}
