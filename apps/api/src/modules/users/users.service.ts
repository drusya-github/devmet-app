/**
 * Users service
 * Handles user profile management, preferences, and account deletion
 */

import { prisma } from '../../database/prisma.client';
import { redis, DEFAULT_TTL } from '../../database/redis.client';
import { logger } from '../../config/logger';
import { AppError } from '../../middleware/error-handler';
import { invalidateUserCache } from '../../middleware/auth.middleware';
import {
  PublicUser,
  UserWithOrganizations,
  UserOrganizationResponse,
  UpdateProfileRequest,
  UpdatePreferencesRequest,
  UpdateNotificationPreferencesRequest,
} from './users.types';
import {
  updateProfileRequestSchema,
  updatePreferencesRequestSchema,
  updateNotificationPreferencesRequestSchema,
} from './users.validation';

export class UsersService {
  /**
   * Get current user profile
   * Returns sanitized user data with organizations
   */
  async getCurrentUser(userId: string): Promise<PublicUser> {
    // Check cache first
    const cacheKey = `user:profile:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug('User profile cache hit', { userId });
      const parsed = JSON.parse(cached);
      // Convert BigInt back
      return {
        ...parsed,
        githubId: BigInt(parsed.githubId),
      };
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
      throw new AppError(404, 'User not found');
    }

    // Check if user is deleted
    if (user.deletedAt) {
      throw new AppError(404, 'User account has been deleted');
    }

    const sanitized = this.sanitizeUser(user);

    // Cache for 15 minutes
    await redis.setex(cacheKey, DEFAULT_TTL.MEDIUM, JSON.stringify({
      ...sanitized,
      githubId: sanitized.githubId.toString(),
    }));

    return sanitized;
  }

  /**
   * Update user profile
   * Only allows updating mutable fields (name, bio, location, avatarUrl)
   */
  async updateProfile(
    userId: string,
    data: UpdateProfileRequest,
    ipAddress?: string
  ): Promise<PublicUser> {
    // Validate input
    const validated = updateProfileRequestSchema.parse(data);

    // Check if user exists and is not deleted
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new AppError(404, 'User not found');
    }

    if (existingUser.deletedAt) {
      throw new AppError(404, 'User account has been deleted');
    }

    // Cannot update immutable fields
    const { githubId, email, ...updateData } = validated as any;
    if (githubId !== undefined || email !== undefined) {
      throw new AppError(400, 'Cannot update githubId or email directly');
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });

    // Invalidate cache
    await invalidateUserCache(userId);
    await redis.del(`user:profile:${userId}`);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'USER_PROFILE_UPDATED',
        resource: `user:${userId}`,
        status: 'success',
        ipAddress,
        metadata: {
          fields: Object.keys(updateData),
        },
      },
    });

    logger.info('User profile updated', {
      userId,
      fields: Object.keys(updateData),
    });

    return this.sanitizeUser(user);
  }

  /**
   * Delete user account (soft delete for GDPR compliance)
   * Anonymizes PII and marks account as deleted
   */
  async deleteAccount(userId: string, ipAddress?: string): Promise<void> {
    // Fetch user with all data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizations: true,
        commits: true,
        pullRequests: true,
        issues: true,
        developerMetrics: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (user.deletedAt) {
      throw new AppError(400, 'User account already deleted');
    }

    // Soft delete - anonymize PII but keep data for analytics
    // Note: accessToken is required in schema, so we set it to empty string instead of null
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        email: `deleted-${userId}@deleted.local`, // Anonymize email
        name: 'Deleted User',
        avatarUrl: null,
        accessToken: '', // Remove GitHub access (empty string since field is required)
        refreshToken: null,
        // Keep preferences and notificationPreferences for analytics
        // Keep organizations relationship (will be handled by cascade if needed)
      },
    });

    // Clear all caches
    await invalidateUserCache(userId);
    await redis.del(`user:profile:${userId}`);
    await redis.del(`oauth:state:*`); // Clear any OAuth states

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'USER_ACCOUNT_DELETED',
        resource: `user:${userId}`,
        status: 'success',
        ipAddress,
        metadata: {
          deletedAt: new Date().toISOString(),
          reason: 'user_request',
        },
      },
    });

    logger.info('User account deleted', {
      userId,
      ipAddress,
    });
  }

  /**
   * Get user's organizations
   */
  async getUserOrganizations(userId: string): Promise<UserOrganizationResponse[]> {
    // Check cache
    const cacheKey = `user:organizations:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug('User organizations cache hit', { userId });
      const parsed = JSON.parse(cached);
      return parsed.map((org: any) => ({
        ...org,
        githubId: org.githubId ? BigInt(org.githubId) : null,
      }));
    }

    // Verify user exists and is not deleted
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, deletedAt: true },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (user.deletedAt) {
      throw new AppError(404, 'User account has been deleted');
    }

    // Fetch organizations
    const userOrgs = await prisma.userOrganization.findMany({
      where: { userId },
      include: {
        organization: true,
      },
      orderBy: { joinedAt: 'desc' },
    });

    const organizations: UserOrganizationResponse[] = userOrgs.map((uo: any) => ({
      id: uo.organization.id,
      name: uo.organization.name,
      slug: uo.organization.slug,
      role: uo.role,
      joinedAt: uo.joinedAt,
      githubId: uo.organization.githubId,
      planType: uo.organization.planType,
    }));

    // Cache for 15 minutes
    await redis.setex(cacheKey, DEFAULT_TTL.MEDIUM, JSON.stringify(
      organizations.map(org => ({
        ...org,
        githubId: org.githubId?.toString() || null,
      }))
    ));

    return organizations;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    data: UpdatePreferencesRequest,
    ipAddress?: string
  ): Promise<PublicUser> {
    // Validate input
    const validated = updatePreferencesRequestSchema.parse(data);

    // Check if user exists and is not deleted
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, preferences: true, deletedAt: true },
    });

    if (!existingUser) {
      throw new AppError(404, 'User not found');
    }

    if (existingUser.deletedAt) {
      throw new AppError(404, 'User account has been deleted');
    }

    // Merge with existing preferences
    const currentPreferences = (existingUser.preferences as Record<string, any>) || {};
    const updatedPreferences = {
      ...currentPreferences,
      ...validated,
    };

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        preferences: updatedPreferences,
      },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });

    // Invalidate cache
    await invalidateUserCache(userId);
    await redis.del(`user:profile:${userId}`);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'USER_PREFERENCES_UPDATED',
        resource: `user:${userId}`,
        status: 'success',
        ipAddress,
        metadata: {
          fields: Object.keys(validated),
        },
      },
    });

    logger.info('User preferences updated', {
      userId,
      fields: Object.keys(validated),
    });

    return this.sanitizeUser(user);
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    data: UpdateNotificationPreferencesRequest,
    ipAddress?: string
  ): Promise<PublicUser> {
    // Validate input
    const validated = updateNotificationPreferencesRequestSchema.parse(data);

    // Check if user exists and is not deleted
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, notificationPreferences: true, deletedAt: true },
    });

    if (!existingUser) {
      throw new AppError(404, 'User not found');
    }

    if (existingUser.deletedAt) {
      throw new AppError(404, 'User account has been deleted');
    }

    // Merge with existing notification preferences
    const currentPrefs = (existingUser.notificationPreferences as Record<string, any>) || {};
    const updatedPrefs = {
      ...currentPrefs,
      ...validated,
    };

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        notificationPreferences: updatedPrefs,
      },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });

    // Invalidate cache
    await invalidateUserCache(userId);
    await redis.del(`user:profile:${userId}`);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'USER_NOTIFICATION_PREFERENCES_UPDATED',
        resource: `user:${userId}`,
        status: 'success',
        ipAddress,
        metadata: {
          fields: Object.keys(validated),
        },
      },
    });

    logger.info('User notification preferences updated', {
      userId,
      fields: Object.keys(validated),
    });

    return this.sanitizeUser(user);
  }

  /**
   * Sanitize user object (remove sensitive fields)
   */
  private sanitizeUser(user: UserWithOrganizations): PublicUser {
    return {
      id: user.id,
      githubId: user.githubId ? user.githubId.toString() : null, // Convert BigInt to string for JSON serialization
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      bio: null, // Not stored in current schema, but included for API compatibility
      location: null, // Not stored in current schema, but included for API compatibility
      preferences: user.preferences as Record<string, any> | null,
      notificationPreferences: user.notificationPreferences as Record<string, any> | null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      organizations: user.organizations?.map((uo: any) => ({
        id: uo.organization.id,
        name: uo.organization.name,
        slug: uo.organization.slug,
        role: uo.role,
        joinedAt: uo.joinedAt,
      })),
    };
  }
}

// Export singleton instance
export const usersService = new UsersService();

