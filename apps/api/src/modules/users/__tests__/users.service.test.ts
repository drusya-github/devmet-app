/**
 * Unit tests for UsersService
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { UsersService } from '../users.service';
import { prisma } from '../../../database/prisma.client';
import { redis } from '../../../database/redis.client';
import { invalidateUserCache } from '../../../middleware/auth.middleware';
import { AppError } from '../../../middleware/error-handler';

// Mock dependencies
jest.mock('../../../database/prisma.client');
jest.mock('../../../database/redis.client');
jest.mock('../../../middleware/auth.middleware');
jest.mock('../../../config/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('UsersService', () => {
  let usersService: UsersService;
  let mockRedisGet: jest.Mock;
  let mockRedisSetex: jest.Mock;
  let mockRedisDel: jest.Mock;
  let mockPrismaUserFindUnique: jest.Mock;
  let mockPrismaUserUpdate: jest.Mock;
  let mockPrismaAuditLogCreate: jest.Mock;
  let mockPrismaUserOrganizationFindMany: jest.Mock;

  beforeEach(() => {
    usersService = new UsersService();

    // Setup Redis mocks
    mockRedisGet = jest.fn();
    mockRedisSetex = jest.fn();
    mockRedisDel = jest.fn();
    (redis.get as jest.Mock) = mockRedisGet;
    (redis.setex as jest.Mock) = mockRedisSetex;
    (redis.del as jest.Mock) = mockRedisDel;

    // Setup Prisma mocks
    mockPrismaUserFindUnique = jest.fn();
    mockPrismaUserUpdate = jest.fn();
    mockPrismaAuditLogCreate = jest.fn();
    mockPrismaUserOrganizationFindMany = jest.fn();

    (prisma.user.findUnique as jest.Mock) = mockPrismaUserFindUnique;
    (prisma.user.update as jest.Mock) = mockPrismaUserUpdate;
    (prisma.auditLog.create as jest.Mock) = mockPrismaAuditLogCreate;
    (prisma.userOrganization.findMany as jest.Mock) = mockPrismaUserOrganizationFindMany;

    // Mock invalidateUserCache
    jest.mocked(invalidateUserCache).mockResolvedValue(undefined as any);

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    const mockUserId = 'user-123';
    const mockUser = {
      id: mockUserId,
      githubId: BigInt(12345),
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: 'https://example.com/avatar.png',
      preferences: { theme: 'dark' },
      notificationPreferences: { emailNotifications: true },
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
      deletedAt: null,
      organizations: [
        {
          role: 'ADMIN',
          joinedAt: new Date(),
          organization: {
            id: 'org-123',
            name: 'Test Org',
            slug: 'test-org',
          },
        },
      ],
    };

    it('should return user from cache if available', async () => {
      const cachedUser = {
        ...mockUser,
        githubId: mockUser.githubId.toString(),
      };
      (mockRedisGet as any).mockResolvedValue(JSON.stringify(cachedUser));

      const result = await usersService.getCurrentUser(mockUserId);

      expect(result.id).toBe(mockUserId);
      expect(result.githubId).toEqual(mockUser.githubId);
      expect(mockRedisGet).toHaveBeenCalledWith(`user:profile:${mockUserId}`);
      expect(mockPrismaUserFindUnique).not.toHaveBeenCalled();
    });

    it('should fetch user from database if not cached', async () => {
      (mockRedisGet as any).mockResolvedValue(null);
      (mockPrismaUserFindUnique as any).mockResolvedValue(mockUser);
      (mockRedisSetex as any).mockResolvedValue('OK');

      const result = await usersService.getCurrentUser(mockUserId);

      expect(result.id).toBe(mockUserId);
      expect(mockPrismaUserFindUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        include: {
          organizations: {
            include: {
              organization: true,
            },
          },
        },
      });
      expect(mockRedisSetex).toHaveBeenCalled();
    });

    it('should throw 404 if user not found', async () => {
      (mockRedisGet as any).mockResolvedValue(null);
      (mockPrismaUserFindUnique as any).mockResolvedValue(null);

      await expect(usersService.getCurrentUser(mockUserId)).rejects.toThrow(AppError);
      await expect(usersService.getCurrentUser(mockUserId)).rejects.toThrow('User not found');
    });

    it('should throw 404 if user is deleted', async () => {
      (mockRedisGet as any).mockResolvedValue(null);
      (mockPrismaUserFindUnique as any).mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
      });

      await expect(usersService.getCurrentUser(mockUserId)).rejects.toThrow(AppError);
      await expect(usersService.getCurrentUser(mockUserId)).rejects.toThrow('User account has been deleted');
    });
  });

  describe('updateProfile', () => {
    const mockUserId = 'user-123';
    const mockUser = {
      id: mockUserId,
      githubId: BigInt(12345),
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: 'https://example.com/avatar.png',
      preferences: null,
      notificationPreferences: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
      deletedAt: null,
      organizations: [],
    };

    it('should update allowed fields', async () => {
      (mockPrismaUserFindUnique as any).mockResolvedValue(mockUser);
      (mockPrismaUserUpdate as any).mockResolvedValue({
        ...mockUser,
        name: 'Updated Name',
      });
      (mockPrismaAuditLogCreate as any).mockResolvedValue({});
      (mockRedisDel as any).mockResolvedValue(1);

      const updateData = { name: 'Updated Name' };
      const result = await usersService.updateProfile(mockUserId, updateData, '127.0.0.1');

      expect(result.name).toBe('Updated Name');
      expect(mockPrismaUserUpdate).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: updateData,
        include: {
          organizations: {
            include: {
              organization: true,
            },
          },
        },
      });
      expect(mockPrismaAuditLogCreate).toHaveBeenCalled();
      expect(invalidateUserCache).toHaveBeenCalledWith(mockUserId);
    });

    it('should not allow updating immutable fields', async () => {
      (mockPrismaUserFindUnique as any).mockResolvedValue(mockUser);

      const updateData = { githubId: 99999, email: 'new@example.com' };

      await expect(
        usersService.updateProfile(mockUserId, updateData as any, '127.0.0.1')
      ).rejects.toThrow(AppError);
      await expect(
        usersService.updateProfile(mockUserId, updateData as any, '127.0.0.1')
      ).rejects.toThrow('Cannot update githubId or email directly');
    });

    it('should throw 404 if user not found', async () => {
      (mockPrismaUserFindUnique as any).mockResolvedValue(null);

      await expect(
        usersService.updateProfile(mockUserId, { name: 'New Name' }, '127.0.0.1')
      ).rejects.toThrow(AppError);
      await expect(
        usersService.updateProfile(mockUserId, { name: 'New Name' }, '127.0.0.1')
      ).rejects.toThrow('User not found');
    });
  });

  describe('deleteAccount', () => {
    const mockUserId = 'user-123';
    const mockUser = {
      id: mockUserId,
      email: 'test@example.com',
      name: 'Test User',
      deletedAt: null,
      organizations: [],
      commits: [],
      pullRequests: [],
      issues: [],
      developerMetrics: [],
    };

    it('should soft delete user account', async () => {
      (mockPrismaUserFindUnique as any).mockResolvedValue(mockUser);
      (mockPrismaUserUpdate as any).mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
        email: `deleted-${mockUserId}@deleted.local`,
        name: 'Deleted User',
      });
      (mockPrismaAuditLogCreate as any).mockResolvedValue({});
      (mockRedisDel as any).mockResolvedValue(1);

      await usersService.deleteAccount(mockUserId, '127.0.0.1');

      expect(mockPrismaUserUpdate).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
          email: expect.stringContaining('deleted'),
          name: 'Deleted User',
          accessToken: null,
          refreshToken: null,
        }),
      });
      expect(mockPrismaAuditLogCreate).toHaveBeenCalled();
      expect(invalidateUserCache).toHaveBeenCalledWith(mockUserId);
    });

    it('should throw 404 if user not found', async () => {
      (mockPrismaUserFindUnique as any).mockResolvedValue(null);

      await expect(usersService.deleteAccount(mockUserId, '127.0.0.1')).rejects.toThrow(AppError);
      await expect(usersService.deleteAccount(mockUserId, '127.0.0.1')).rejects.toThrow('User not found');
    });

    it('should throw 400 if user already deleted', async () => {
      (mockPrismaUserFindUnique as any).mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
      });

      await expect(usersService.deleteAccount(mockUserId, '127.0.0.1')).rejects.toThrow(AppError);
      await expect(usersService.deleteAccount(mockUserId, '127.0.0.1')).rejects.toThrow('User account already deleted');
    });
  });

  describe('getUserOrganizations', () => {
    const mockUserId = 'user-123';
    const mockOrganizations = [
      {
        role: 'ADMIN',
        joinedAt: new Date(),
        organization: {
          id: 'org-1',
          name: 'Org 1',
          slug: 'org-1',
          githubId: BigInt(111),
          planType: 'PRO',
        },
      },
      {
        role: 'MEMBER',
        joinedAt: new Date(),
        organization: {
          id: 'org-2',
          name: 'Org 2',
          slug: 'org-2',
          githubId: null,
          planType: 'FREE',
        },
      },
    ];

    it('should return organizations from cache if available', async () => {
      const cached = mockOrganizations.map(org => ({
        ...org,
        organization: {
          ...org.organization,
          githubId: org.organization.githubId?.toString() || null,
        },
      }));
      (mockRedisGet as any).mockResolvedValue(JSON.stringify(cached));

      const result = await usersService.getUserOrganizations(mockUserId);

      expect(result).toHaveLength(2);
      expect(mockPrismaUserOrganizationFindMany).not.toHaveBeenCalled();
    });

    it('should fetch organizations from database if not cached', async () => {
      (mockRedisGet as any).mockResolvedValue(null);
      (mockPrismaUserFindUnique as any).mockResolvedValue({
        id: mockUserId,
        deletedAt: null,
      });
      (mockPrismaUserOrganizationFindMany as any).mockResolvedValue(mockOrganizations);
      (mockRedisSetex as any).mockResolvedValue('OK');

      const result = await usersService.getUserOrganizations(mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('org-1');
      expect(result[0].role).toBe('ADMIN');
      expect(mockPrismaUserOrganizationFindMany).toHaveBeenCalled();
    });
  });

  describe('updatePreferences', () => {
    const mockUserId = 'user-123';
    const mockUser = {
      id: mockUserId,
      githubId: BigInt(12345),
      email: 'test@example.com',
      name: 'Test User',
      preferences: { theme: 'light' },
      notificationPreferences: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
      deletedAt: null,
      organizations: [],
    };

    it('should update user preferences', async () => {
      (mockPrismaUserFindUnique as any).mockResolvedValue({
        id: mockUserId,
        preferences: { theme: 'light' },
        deletedAt: null,
      });
      (mockPrismaUserUpdate as any).mockResolvedValue({
        ...mockUser,
        preferences: { theme: 'dark', timezone: 'UTC' },
      });
      (mockPrismaAuditLogCreate as any).mockResolvedValue({});
      (mockRedisDel as any).mockResolvedValue(1);

      const updateData = { theme: 'dark' as const, timezone: 'UTC' };
      const result = await usersService.updatePreferences(mockUserId, updateData, '127.0.0.1');

      expect(mockPrismaUserUpdate).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          preferences: expect.objectContaining({
            theme: 'dark',
            timezone: 'UTC',
          }),
        },
        include: expect.any(Object),
      });
      expect(mockPrismaAuditLogCreate).toHaveBeenCalled();
    });
  });
});

