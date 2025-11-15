import { Request, Response } from 'express';
import config from '../utils/config';
import logger from '../utils/logger';

// LinkedIn OAuth endpoints
const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';

// LinkedIn OAuth scopes - Test organization scopes
const LINKEDIN_SCOPES = [
  'r_organization_social',
  'w_organization_social'
].join(' ');

/**
 * Initiate LinkedIn OAuth flow
 */
export async function linkedinAuth(req: Request, res: Response): Promise<void> {
  try {
    logger.info('Starting LinkedIn OAuth flow');

    // Generate state parameter for security
    const state = Math.random().toString(36).substring(2, 15);
    
    // Store state in session (simple in-memory for now)
    // In production, use proper session storage
    (req as any).session = { state };

    // Build LinkedIn authorization URL
    const authUrl = new URL(LINKEDIN_AUTH_URL);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', config.linkedin.clientId);
    authUrl.searchParams.set('redirect_uri', `${config.baseUrl}/auth/callback`);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', LINKEDIN_SCOPES);

    logger.info('Redirecting to LinkedIn OAuth', {
      clientId: config.linkedin.clientId,
      redirectUri: `${config.baseUrl}/auth/callback`,
      scopes: LINKEDIN_SCOPES,
    });

    // Redirect to LinkedIn
    res.redirect(authUrl.toString());
  } catch (error) {
    logger.error('LinkedIn OAuth initiation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      error: 'Failed to initiate LinkedIn OAuth',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Handle LinkedIn OAuth callback
 */
export async function linkedinCallback(req: Request, res: Response): Promise<void> {
  try {
    const { code, state, error: oauthError } = req.query;

    logger.info('LinkedIn OAuth callback received', {
      hasCode: !!code,
      hasState: !!state,
      hasError: !!oauthError,
    });

    // Check for OAuth errors
    if (oauthError) {
      logger.error('LinkedIn OAuth error', { error: oauthError });
      return res.status(400).json({
        error: 'LinkedIn OAuth failed',
        details: oauthError,
      });
    }

    // Validate required parameters
    if (!code || !state) {
      logger.error('Missing OAuth parameters', { hasCode: !!code, hasState: !!state });
      return res.status(400).json({
        error: 'Missing OAuth parameters',
        message: 'Authorization code or state parameter missing',
      });
    }

    // TODO: Validate state parameter (session check)
    // For now, just log it
    logger.info('OAuth state parameter', { state });

    // Exchange authorization code for access token
    const tokenResponse = await fetch(LINKEDIN_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: `${config.baseUrl}/auth/callback`,
        client_id: config.linkedin.clientId,
        client_secret: config.linkedin.clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error('LinkedIn token exchange failed', {
        status: tokenResponse.status,
        error: errorText,
      });
      return res.status(500).json({
        error: 'Failed to exchange authorization code for access token',
        details: errorText,
      });
    }

    const tokenData = await tokenResponse.json();
    logger.info('LinkedIn access token received', {
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope,
    });

    // TODO: Store access token securely (database, encrypted storage, etc.)
    // For now, just return it for manual configuration
    res.json({
      success: true,
      message: 'LinkedIn OAuth completed successfully!',
      accessToken: tokenData.access_token,
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope,
      instructions: 'Copy the access token and add it to your environment variables as LINKEDIN_ACCESS_TOKEN',
    });

  } catch (error) {
    logger.error('LinkedIn OAuth callback failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      error: 'LinkedIn OAuth callback failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
