/**
 * Authentication routes
 * Defines HTTP endpoints for GitHub OAuth authentication flow
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { authService } from './auth.service';
import { logger } from '../../config/logger';
import { config } from '../../config';
import {
  loginRequestSchema,
  oauthCallbackQuerySchema,
  refreshTokenRequestSchema,
} from './auth.validation';

/**
 * Register authentication routes
 */
export async function authRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/auth/github
   * Initiate GitHub OAuth flow
   */
  fastify.get('/github', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { redirectUrl } = request.query as { redirectUrl?: string };

      // Validate redirect URL if provided
      if (redirectUrl) {
        const validated = loginRequestSchema.parse({ redirectUrl });
        const authUrl = await authService.initiateOAuth(validated.redirectUrl);
        return reply.redirect(authUrl);
      }

      const authUrl = await authService.initiateOAuth();
      return reply.redirect(authUrl);
    } catch (error) {
      logger.error('Failed to initiate OAuth', { error });
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to initiate authentication',
      });
    }
  });

  /**
   * GET /api/auth/callback
   * Handle GitHub OAuth callback
   */
  fastify.get('/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Validate query parameters
      const { code, state } = oauthCallbackQuerySchema.parse(request.query);

      // Handle OAuth callback
      const authResponse = await authService.handleCallback(code, state);

      // Redirect to frontend with tokens
      const frontendUrl = new URL(config.frontendUrl);
      frontendUrl.pathname = '/auth/callback';
      frontendUrl.searchParams.set('token', authResponse.accessToken);
      frontendUrl.searchParams.set('refreshToken', authResponse.refreshToken);

      logger.info('OAuth callback successful, redirecting to frontend', {
        userId: authResponse.user.id,
      });

      return reply.redirect(frontendUrl.toString());
    } catch (error: any) {
      logger.error('OAuth callback failed', { error: error.message });

      // Redirect to frontend with error
      const frontendUrl = new URL(config.frontendUrl);
      frontendUrl.pathname = '/auth/error';
      frontendUrl.searchParams.set('error', error.message || 'Authentication failed');

      return reply.redirect(frontendUrl.toString());
    }
  });

  /**
   * GET /api/auth/me
   * Get current authenticated user
   */
  fastify.get(
    '/me',
    {
      preHandler: async (request, reply) => {
        // This will be implemented in TASK-015 (JWT middleware)
        // For now, we'll do basic token validation
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'No authentication token provided',
          });
        }

        try {
          const token = authHeader.split(' ')[1];
          const { verifyAccessToken } = await import('../../utils/jwt');
          const payload = verifyAccessToken(token);
          (request as any).user = { id: payload.userId };
        } catch (error) {
          return reply.status(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Invalid or expired token',
          });
        }
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.id;
        const user = await authService.getCurrentUser(userId);

        return reply.send({
          success: true,
          data: user,
        });
      } catch (error: any) {
        logger.error('Failed to get current user', { error });
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: error.message || 'User not found',
        });
      }
    }
  );

  /**
   * POST /api/auth/refresh
   * Refresh access token using refresh token
   */
  fastify.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Validate request body
      const { refreshToken } = refreshTokenRequestSchema.parse(request.body);

      // Refresh tokens
      const tokens = await authService.refreshAccessToken(refreshToken);

      return reply.send({
        success: true,
        data: tokens,
      });
    } catch (error: any) {
      logger.error('Failed to refresh token', { error });
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: error.message || 'Invalid or expired refresh token',
      });
    }
  });

  /**
   * POST /api/auth/logout
   * Logout current user
   */
  fastify.post(
    '/logout',
    {
      preHandler: async (request, reply) => {
        // Basic token validation (will be replaced by middleware in TASK-015)
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'No authentication token provided',
          });
        }

        try {
          const token = authHeader.split(' ')[1];
          const { verifyAccessToken } = await import('../../utils/jwt');
          const payload = verifyAccessToken(token);
          (request as any).user = { id: payload.userId };
        } catch (error) {
          return reply.status(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Invalid or expired token',
          });
        }
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.id;
        await authService.logout(userId);

        return reply.send({
          success: true,
          message: 'Logged out successfully',
        });
      } catch (error: any) {
        logger.error('Failed to logout', { error });
        return reply.status(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to logout',
        });
      }
    }
  );

  /**
   * GET /api/auth/status
   * Check authentication status (no auth required)
   */
  fastify.get('/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.send({
        authenticated: false,
      });
    }

    try {
      const token = authHeader.split(' ')[1];
      const { verifyAccessToken, isTokenExpired } = await import('../../utils/jwt');
      
      if (isTokenExpired(token)) {
        return reply.send({
          authenticated: false,
          expired: true,
        });
      }

      const payload = verifyAccessToken(token);
      return reply.send({
        authenticated: true,
        userId: payload.userId,
      });
    } catch (error) {
      return reply.send({
        authenticated: false,
      });
    }
  });
}

