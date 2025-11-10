/**
 * JWT Authentication Middleware
 * Provides authentication and authorization middleware for Fastify routes
 *
 * Features:
 * - JWT token verification
 * - User data caching with Redis
 * - Role-based access control
 * - Organization-based access control
 * - Optional authentication (for public routes with optional user context)
 */

import fp from 'fastify-plugin';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { prisma } from '../database/prisma.client';
import { redis, DEFAULT_TTL } from '../database/redis.client';
import { verifyAccessToken, extractTokenFromHeader } from '../utils/jwt';
import { AppError } from './error-handler';
import { logger } from '../config/logger';
import type { AuthenticatedUser } from '../types/fastify';

/**
 * Extract token from Authorization header
 */
function extractToken(request: FastifyRequest): string {
  const authHeader = request.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    throw new AppError(401, 'No token provided');
  }

  return token;
}

/**
 * Get user from cache or database
 * Caches user data for 15 minutes to reduce database load
 */
async function getUserWithCache(userId: string): Promise<AuthenticatedUser> {
  const cacheKey = `user:${userId}`;

  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    logger.debug('User cache hit', { userId });
    const parsed = JSON.parse(cached);
    // Convert githubId back to BigInt
    return {
      ...parsed,
      githubId: BigInt(parsed.githubId),
      organizations: parsed.organizations.map((org: any) => ({
        ...org,
        organization: {
          ...org.organization,
          githubId: org.organization.githubId ? BigInt(org.organization.githubId) : null,
        },
      })),
    } as AuthenticatedUser;
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
    throw new AppError(401, 'User not found');
  }

  // Cache for 15 minutes
  // Convert BigInt to string for JSON serialization
  const userSerializable = {
    ...user,
    githubId: user.githubId.toString(),
    organizations: user.organizations.map(org => ({
      ...org,
      organization: {
        ...org.organization,
        githubId: org.organization.githubId?.toString() || null,
      },
    })),
  };
  await redis.setex(cacheKey, DEFAULT_TTL.MEDIUM, JSON.stringify(userSerializable));

  return user;
}

/**
 * Invalidate user cache
 * Called when user data is updated
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await redis.del(`user:${userId}`);
  await redis.del(`user:profile:${userId}`);
  logger.debug('User cache invalidated', { userId });
}

/**
 * Register authentication middleware as Fastify plugin
 */
export default fp(async function (fastify: FastifyInstance) {
  /**
   * Authenticate middleware - verifies JWT token and attaches user to request
   * Throws AppError if authentication fails
   */
  fastify.decorate(
    'authenticate',
    async function authenticate(
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<void> {
      try {
        // Extract token from Authorization header
        const token = extractToken(request);

        // Verify JWT token
        const decoded = verifyAccessToken(token);

        // Fetch user from cache or database
        const user = await getUserWithCache(decoded.userId);

        // Attach user to request
        request.user = user;

        logger.debug('User authenticated', {
          userId: user.id,
          requestId: request.id,
        });
      } catch (error) {
        // Handle JWT-specific errors
        // Check TokenExpiredError first since it extends JsonWebTokenError
        if (error instanceof TokenExpiredError) {
          logger.warn('Expired JWT token', {
            requestId: request.id,
          });
          throw new AppError(401, 'Token expired');
        }

        if (error instanceof JsonWebTokenError) {
          logger.warn('Invalid JWT token', {
            error: error.message,
            requestId: request.id,
          });
          throw new AppError(401, 'Invalid token');
        }

        // Re-throw AppError as-is
        if (error instanceof AppError) {
          throw error;
        }

        // Handle unexpected errors
        logger.error('Authentication error', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          requestId: request.id,
        });
        throw new AppError(401, 'Authentication failed');
      }
    }
  );

  /**
   * Optional authenticate middleware - verifies JWT if present
   * Does not throw if token is missing or invalid
   */
  fastify.decorate(
    'optionalAuthenticate',
    async function optionalAuthenticate(
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<void> {
      try {
        const authHeader = request.headers.authorization;
        const token = extractTokenFromHeader(authHeader);

        if (!token) {
          // No token provided - this is OK for optional auth
          request.user = undefined;
          return;
        }

        // Verify token
        const decoded = verifyAccessToken(token);

        // Fetch user
        const user = await getUserWithCache(decoded.userId);

        // Attach user to request
        request.user = user;

        logger.debug('User optionally authenticated', {
          userId: user.id,
          requestId: request.id,
        });
      } catch (error) {
        // Silently ignore errors for optional auth
        logger.debug('Optional authentication failed', {
          error: error instanceof Error ? error.message : String(error),
          requestId: request.id,
        });
        request.user = undefined;
      }
    }
  );

  /**
   * Require role middleware factory
   * Returns a middleware function that checks if user has required role
   */
  fastify.decorate(
    'requireRole',
    function requireRole(roles: string[]) {
      return async function (
        request: FastifyRequest,
        reply: FastifyReply
      ): Promise<void> {
        // Check if user is authenticated
        if (!request.user) {
          throw new AppError(401, 'Not authenticated');
        }

        // Check if user has required role in any organization
        const hasRole = request.user.organizations.some((uo) =>
          roles.includes(uo.role)
        );

        if (!hasRole) {
          logger.warn('Insufficient permissions', {
            userId: request.user.id,
            requiredRoles: roles,
            userRoles: request.user.organizations.map((uo) => uo.role),
            requestId: request.id,
          });
          throw new AppError(403, 'Insufficient permissions');
        }

        logger.debug('Role check passed', {
          userId: request.user.id,
          roles,
          requestId: request.id,
        });
      };
    }
  );

  /**
   * Require organization middleware factory
   * Returns a middleware function that checks if user belongs to organization
   * Organization ID can be provided as parameter or extracted from request params/query
   */
  fastify.decorate(
    'requireOrganization',
    function requireOrganization(organizationId?: string) {
      return async function (
        request: FastifyRequest,
        reply: FastifyReply
      ): Promise<void> {
        // Check if user is authenticated
        if (!request.user) {
          throw new AppError(401, 'Not authenticated');
        }

        // Get organization ID from parameter, query, or provided value
        const orgId =
          organizationId ||
          (request.params as { organizationId?: string })?.organizationId ||
          (request.query as { organizationId?: string })?.organizationId;

        if (!orgId) {
          throw new AppError(400, 'Organization ID required');
        }

        // Check if user belongs to organization
        const belongsToOrg = request.user.organizations.some(
          (uo) => uo.organization.id === orgId || uo.organization.slug === orgId
        );

        if (!belongsToOrg) {
          logger.warn('User does not belong to organization', {
            userId: request.user.id,
            organizationId: orgId,
            requestId: request.id,
          });
          throw new AppError(403, 'Access denied to this organization');
        }

        logger.debug('Organization check passed', {
          userId: request.user.id,
          organizationId: orgId,
          requestId: request.id,
        });
      };
    }
  );

  logger.info('Authentication middleware registered');
});

// Export types for use in other modules
export type { AuthenticatedUser };

