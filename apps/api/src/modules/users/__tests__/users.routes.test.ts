/**
 * Integration tests for user profile routes
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import fastify from 'fastify';
import { usersRoutes } from '../users.routes';
import { usersService } from '../users.service';
import { generateTokenPair } from '../../../utils/jwt';
import { AppError } from '../../../middleware/error-handler';

// Mock dependencies
jest.mock('../users.service');
jest.mock('../../../middleware/auth.middleware', () => ({
  default: jest.fn((fastify: FastifyInstance) => {
    fastify.decorate('authenticate', async (request: any, reply: any) => {
      // Mock authentication - attach user from Authorization header
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AppError(401, 'Not authenticated');
      }
      const token = authHeader.split(' ')[1];
      try {
        // Decode token to get userId (simplified for testing)
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        request.user = { id: payload.userId || 'test-user-id' };
      } catch {
        throw new AppError(401, 'Invalid token');
      }
    });
  }),
}));
jest.mock('../../../config/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('User Profile Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = fastify();
    await app.register(usersRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createAuthToken = (userId: string = 'test-user-id'): string => {
    const payload = { userId };
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `${encodedHeader}.${encodedPayload}.signature`;
  };

  describe('GET /me', () => {
    it('should return current user profile', async () => {
      const mockUser = {
        id: 'test-user-id',
        githubId: BigInt(12345),
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        bio: null,
        location: null,
        preferences: null,
        notificationPreferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        organizations: [],
      };

      jest.spyOn(usersService, 'getCurrentUser').mockResolvedValue(mockUser as any);

      const response = await app.inject({
        method: 'GET',
        url: '/me',
        headers: {
          authorization: `Bearer ${createAuthToken('test-user-id')}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe('test-user-id');
      expect(usersService.getCurrentUser).toHaveBeenCalledWith('test-user-id');
    });

    it('should return 401 if not authenticated', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/me',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PATCH /me', () => {
    it('should update user profile', async () => {
      const mockUpdatedUser = {
        id: 'test-user-id',
        githubId: BigInt(12345),
        email: 'test@example.com',
        name: 'Updated Name',
        avatarUrl: null,
        bio: null,
        location: null,
        preferences: null,
        notificationPreferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        organizations: [],
      };

      jest.spyOn(usersService, 'updateProfile').mockResolvedValue(mockUpdatedUser as any);

      const response = await app.inject({
        method: 'PATCH',
        url: '/me',
        headers: {
          authorization: `Bearer ${createAuthToken('test-user-id')}`,
        },
        payload: {
          name: 'Updated Name',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Updated Name');
      expect(body.message).toBe('Profile updated successfully');
      expect(usersService.updateProfile).toHaveBeenCalledWith(
        'test-user-id',
        { name: 'Updated Name' },
        expect.any(String)
      );
    });

    it('should return 400 for invalid input', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/me',
        headers: {
          authorization: `Bearer ${createAuthToken('test-user-id')}`,
        },
        payload: {
          name: '', // Invalid: empty string
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /me', () => {
    it('should delete user account', async () => {
      jest.spyOn(usersService, 'deleteAccount').mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'DELETE',
        url: '/me',
        headers: {
          authorization: `Bearer ${createAuthToken('test-user-id')}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Account deleted successfully');
      expect(usersService.deleteAccount).toHaveBeenCalledWith(
        'test-user-id',
        expect.any(String)
      );
    });
  });

  describe('GET /me/organizations', () => {
    it('should return user organizations', async () => {
      const mockOrganizations = [
        {
          id: 'org-1',
          name: 'Test Org',
          slug: 'test-org',
          role: 'ADMIN',
          joinedAt: new Date(),
          githubId: BigInt(111),
          planType: 'PRO',
        },
      ];

      jest.spyOn(usersService, 'getUserOrganizations').mockResolvedValue(mockOrganizations as any);

      const response = await app.inject({
        method: 'GET',
        url: '/me/organizations',
        headers: {
          authorization: `Bearer ${createAuthToken('test-user-id')}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe('org-1');
      expect(usersService.getUserOrganizations).toHaveBeenCalledWith('test-user-id');
    });
  });

  describe('PATCH /me/preferences', () => {
    it('should update user preferences', async () => {
      const mockUser = {
        id: 'test-user-id',
        githubId: BigInt(12345),
        email: 'test@example.com',
        name: 'Test User',
        preferences: { theme: 'dark', timezone: 'UTC' },
        notificationPreferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        organizations: [],
      };

      jest.spyOn(usersService, 'updatePreferences').mockResolvedValue(mockUser as any);

      const response = await app.inject({
        method: 'PATCH',
        url: '/me/preferences',
        headers: {
          authorization: `Bearer ${createAuthToken('test-user-id')}`,
        },
        payload: {
          theme: 'dark',
          timezone: 'UTC',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Preferences updated successfully');
      expect(usersService.updatePreferences).toHaveBeenCalledWith(
        'test-user-id',
        { theme: 'dark', timezone: 'UTC' },
        expect.any(String)
      );
    });
  });

  describe('PATCH /me/notification-preferences', () => {
    it('should update notification preferences', async () => {
      const mockUser = {
        id: 'test-user-id',
        githubId: BigInt(12345),
        email: 'test@example.com',
        name: 'Test User',
        preferences: null,
        notificationPreferences: {
          mutedTypes: [],
          quietHours: { enabled: false, start: '22:00', end: '08:00' },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        organizations: [],
      };

      jest.spyOn(usersService, 'updateNotificationPreferences').mockResolvedValue(mockUser as any);

      const response = await app.inject({
        method: 'PATCH',
        url: '/me/notification-preferences',
        headers: {
          authorization: `Bearer ${createAuthToken('test-user-id')}`,
        },
        payload: {
          mutedTypes: ['PR_REVIEW'],
          quietHours: {
            enabled: true,
            start: '22:00',
            end: '08:00',
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Notification preferences updated successfully');
      expect(usersService.updateNotificationPreferences).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          mutedTypes: ['PR_REVIEW'],
          quietHours: expect.any(Object),
        }),
        expect.any(String)
      );
    });
  });
});

