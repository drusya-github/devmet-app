/**
 * Authentication service
 * Handles GitHub OAuth flow, user creation/update, and JWT token management
 */

import axios from 'axios';
import crypto from 'crypto';
import { prisma } from '../../database/prisma.client';
import { redis } from '../../database/redis.client';
import { config } from '../../config';
import { generateTokenPair, verifyRefreshToken } from '../../utils/jwt';
import { encryptGitHubToken, decryptGitHubToken } from '../../utils/encryption';
import { logger } from '../../config/logger';
import {
  GitHubUser,
  GitHubTokenResponse,
  AuthResponse,
  RefreshResponse,
  PublicUser,
  OAuthState,
  UserWithOrganizations,
} from './auth.types';

export class AuthService {
  /**
   * Initiate GitHub OAuth flow
   * Generates state parameter and redirects to GitHub authorization URL
   */
  async initiateOAuth(redirectUrl?: string): Promise<string> {
    // Generate cryptographically secure state parameter
    const state = crypto.randomBytes(32).toString('hex');

    // Store state in Redis with 5 minute expiration
    const stateData: OAuthState = {
      state,
      redirectUrl,
      createdAt: Date.now(),
    };
    await redis.setex(`oauth:state:${state}`, 300, JSON.stringify(stateData));

    // Build GitHub OAuth authorization URL
    const params = new URLSearchParams({
      client_id: config.github.clientId,
      redirect_uri: config.github.redirectUri,
      scope: config.github.scopes,
      state,
    });

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

    logger.info('OAuth flow initiated', { state });

    return authUrl;
  }

  /**
   * Handle GitHub OAuth callback
   * Exchanges authorization code for access token and creates/updates user
   */
  async handleCallback(code: string, state: string): Promise<AuthResponse> {
    // Verify state parameter
    const stateKey = `oauth:state:${state}`;
    const stateData = await redis.get(stateKey);

    if (!stateData) {
      logger.error('Invalid or expired OAuth state', { state });
      throw new Error('Invalid or expired state parameter');
    }

    // Delete state (one-time use)
    await redis.del(stateKey);

    const parsedState: OAuthState = JSON.parse(stateData);

    // Exchange code for access token
    const tokenResponse = await this.exchangeCodeForToken(code);

    // Fetch user profile from GitHub
    const githubUser = await this.fetchGitHubUser(tokenResponse.access_token);

    // Create or update user in database
    const user = await this.createOrUpdateUser(githubUser, tokenResponse.access_token);

    // Generate JWT tokens
    const tokens = generateTokenPair({
      userId: user.id,
      githubId: user.githubId,
      email: user.email,
    });

    // Cache user data
    await this.cacheUser(user);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        resource: `user:${user.id}`,
        status: 'success',
        metadata: {
          method: 'github_oauth',
        },
      },
    });

    logger.info('User authenticated successfully', {
      userId: user.id,
      githubId: user.githubId.toString(),
      email: user.email,
    });

    return {
      user: this.sanitizeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }

  /**
   * Exchange authorization code for GitHub access token
   */
  private async exchangeCodeForToken(code: string): Promise<GitHubTokenResponse> {
    try {
      const response = await axios.post<GitHubTokenResponse>(
        'https://github.com/login/oauth/access_token',
        {
          client_id: config.github.clientId,
          client_secret: config.github.clientSecret,
          code,
        },
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (!response.data.access_token) {
        throw new Error('No access token in response');
      }

      logger.debug('GitHub access token obtained');

      return response.data;
    } catch (error) {
      logger.error('Failed to exchange code for token', { error });
      throw new Error('Failed to authenticate with GitHub');
    }
  }

  /**
   * Fetch user profile from GitHub API
   */
  private async fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
    try {
      // Dynamic import for ESM compatibility
      const { Octokit } = await import('@octokit/rest');
      const octokit = new Octokit({ auth: accessToken });
      const { data } = await octokit.rest.users.getAuthenticated();

      logger.debug('GitHub user profile fetched', { username: data.login });

      return data as GitHubUser;
    } catch (error) {
      logger.error('Failed to fetch GitHub user profile', { error });
      throw new Error('Failed to fetch user profile from GitHub');
    }
  }

  /**
   * Create or update user in database
   */
  private async createOrUpdateUser(
    githubUser: GitHubUser,
    accessToken: string
  ): Promise<UserWithOrganizations> {
    const encryptedToken = encryptGitHubToken(accessToken);

    const user = await prisma.user.upsert({
      where: { githubId: BigInt(githubUser.id) },
      create: {
        githubId: BigInt(githubUser.id),
        email: githubUser.email || `github-${githubUser.id}@devmetrics.local`,
        name: githubUser.name || githubUser.login,
        avatarUrl: githubUser.avatar_url,
        accessToken: encryptedToken,
        lastLoginAt: new Date(),
      },
      update: {
        email: githubUser.email || `github-${githubUser.id}@devmetrics.local`,
        name: githubUser.name || githubUser.login,
        avatarUrl: githubUser.avatar_url,
        accessToken: encryptedToken,
        lastLoginAt: new Date(),
      },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });

    logger.info('User created/updated', {
      userId: user.id,
      githubId: user.githubId.toString(),
      email: user.email,
      isNewUser: user.createdAt.getTime() === user.updatedAt.getTime(),
    });

    return user;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<RefreshResponse> {
    try {
      // Verify refresh token
      const payload = verifyRefreshToken(refreshToken);

      // Fetch user
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: {
          organizations: {
            include: {
              organization: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Generate new token pair
      const tokens = generateTokenPair({
        userId: user.id,
        githubId: user.githubId,
        email: user.email,
      });

      // Cache updated user data
      await this.cacheUser(user);

      logger.info('Access token refreshed', { userId: user.id });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      };
    } catch (error) {
      logger.error('Failed to refresh access token', { error });
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Get current user by ID
   */
  async getCurrentUser(userId: string): Promise<PublicUser> {
    // Check cache first
    const cacheKey = `user:profile:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug('User profile cache hit', { userId });
      return JSON.parse(cached);
    }

    // Fetch from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const sanitized = this.sanitizeUser(user);

    // Cache for 15 minutes
    await redis.setex(cacheKey, 900, JSON.stringify(sanitized));

    return sanitized;
  }

  /**
   * Logout user (invalidate tokens)
   */
  async logout(userId: string): Promise<void> {
    // Invalidate cached user data
    await redis.del(`user:${userId}`);
    await redis.del(`user:profile:${userId}`);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'USER_LOGOUT',
        resource: `user:${userId}`,
        status: 'success',
      },
    });

    logger.info('User logged out', { userId });
  }

  /**
   * Cache user data in Redis
   */
  private async cacheUser(user: UserWithOrganizations): Promise<void> {
    const cacheKey = `user:${user.id}`;
    await redis.setex(cacheKey, 900, JSON.stringify(this.sanitizeUser(user)));
  }

  /**
   * Sanitize user object (remove sensitive fields)
   */
  private sanitizeUser(user: UserWithOrganizations): PublicUser {
    return {
      id: user.id,
      githubId: user.githubId ? user.githubId.toString() : null, // Convert BigInt to string for JSON serialization
      username: user.email ? user.email.split('@')[0] : 'unknown', // Derive username from email
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      bio: null, // Not stored in current schema
      location: null, // Not stored in current schema
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      organizations: user.organizations?.map((uo) => ({
        id: uo.organization.id,
        name: uo.organization.name,
        slug: uo.organization.slug,
        role: uo.role,
      })),
    };
  }

  /**
   * Get user's GitHub access token (decrypted)
   * Used internally by other services that need to call GitHub API
   */
  async getUserGitHubToken(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { accessToken: true },
    });

    if (!user || !user.accessToken) {
      throw new Error('GitHub access token not found');
    }

    return decryptGitHubToken(user.accessToken);
  }
}

// Export singleton instance
export const authService = new AuthService();

