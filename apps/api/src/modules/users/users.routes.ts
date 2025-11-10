/**
 * User profile routes
 * Defines HTTP endpoints for user profile management
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { usersService } from './users.service';
import { logger } from '../../config/logger';
import { AppError } from '../../middleware/error-handler';
import {
  updateProfileRequestSchema,
  updatePreferencesRequestSchema,
  updateNotificationPreferencesRequestSchema,
} from './users.validation';

/**
 * Register user profile routes
 */
export async function usersRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/users/me
   * Get current user profile
   */
  fastify.get(
    '/me',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!request.user) {
          throw new AppError(401, 'Not authenticated');
        }

        const user = await usersService.getCurrentUser(request.user.id);

        return reply.send({
          success: true,
          data: user,
        });
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error('Failed to get current user', { error });
        throw new AppError(500, 'Failed to get user profile');
      }
    }
  );

  /**
   * PATCH /api/users/me
   * Update user profile
   */
  fastify.patch(
    '/me',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!request.user) {
          throw new AppError(401, 'Not authenticated');
        }

        const updateData = updateProfileRequestSchema.parse(request.body);
        const ipAddress = request.ip;

        const user = await usersService.updateProfile(
          request.user.id,
          updateData,
          ipAddress
        );

        return reply.send({
          success: true,
          data: user,
          message: 'Profile updated successfully',
        });
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error('Failed to update profile', { error });
        throw new AppError(500, 'Failed to update profile');
      }
    }
  );

  /**
   * DELETE /api/users/me
   * Delete user account (soft delete for GDPR compliance)
   */
  fastify.delete(
    '/me',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!request.user) {
          throw new AppError(401, 'Not authenticated');
        }

        const ipAddress = request.ip;

        await usersService.deleteAccount(request.user.id, ipAddress);

        return reply.send({
          success: true,
          message: 'Account deleted successfully',
        });
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error('Failed to delete account', { error });
        throw new AppError(500, 'Failed to delete account');
      }
    }
  );

  /**
   * GET /api/users/me/organizations
   * Get user's organizations
   */
  fastify.get(
    '/me/organizations',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!request.user) {
          throw new AppError(401, 'Not authenticated');
        }

        const organizations = await usersService.getUserOrganizations(request.user.id);

        return reply.send({
          success: true,
          data: organizations,
        });
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error('Failed to get user organizations', { error });
        throw new AppError(500, 'Failed to get organizations');
      }
    }
  );

  /**
   * PATCH /api/users/me/preferences
   * Update user preferences
   */
  fastify.patch(
    '/me/preferences',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!request.user) {
          throw new AppError(401, 'Not authenticated');
        }

        const updateData = updatePreferencesRequestSchema.parse(request.body);
        const ipAddress = request.ip;

        const user = await usersService.updatePreferences(
          request.user.id,
          updateData,
          ipAddress
        );

        return reply.send({
          success: true,
          data: user,
          message: 'Preferences updated successfully',
        });
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error('Failed to update preferences', { error });
        throw new AppError(500, 'Failed to update preferences');
      }
    }
  );

  /**
   * PATCH /api/users/me/notification-preferences
   * Update notification preferences
   */
  fastify.patch(
    '/me/notification-preferences',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!request.user) {
          throw new AppError(401, 'Not authenticated');
        }

        const updateData = updateNotificationPreferencesRequestSchema.parse(request.body);
        const ipAddress = request.ip;

        const user = await usersService.updateNotificationPreferences(
          request.user.id,
          updateData,
          ipAddress
        );

        return reply.send({
          success: true,
          data: user,
          message: 'Notification preferences updated successfully',
        });
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error('Failed to update notification preferences', { error });
        throw new AppError(500, 'Failed to update notification preferences');
      }
    }
  );
}

