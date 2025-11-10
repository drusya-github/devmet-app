/**
 * Integration tests for repository routes
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import fastify from 'fastify';
import { repositoriesRoutes } from '../repositories.routes';
import { repositoriesService } from '../repositories.service';
import { AppError } from '../../../middleware/error-handler';

// Mock dependencies
jest.mock('../repositories.service');
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

describe('Repository Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = fastify();
    await app.register(repositoriesRoutes);
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

  describe('GET /available', () => {
    it('should return available repositories', async () => {
      const mockRepositories = {
        data: [
          {
            id: 1,
            name: 'test-repo',
            fullName: 'owner/test-repo',
            description: 'Test repository',
            language: 'TypeScript',
            stars: 10,
            forks: 5,
            openIssues: 2,
            isPrivate: false,
            defaultBranch: 'main',
            url: 'https://github.com/owner/test-repo',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-02T00:00:00Z',
            pushedAt: '2024-01-03T00:00:00Z',
          },
        ],
        pagination: {
          page: 1,
          perPage: 30,
          total: 1,
          hasMore: false,
        },
      };

      jest
        .spyOn(repositoriesService, 'listAvailableRepositories')
        .mockResolvedValue(mockRepositories);

      const response = await app.inject({
        method: 'GET',
        url: '/available',
        headers: {
          authorization: `Bearer ${createAuthToken('test-user-id')}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.pagination).toBeDefined();
      expect(repositoriesService.listAvailableRepositories).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          page: 1,
          perPage: 30,
          type: 'all',
          sort: 'updated',
        })
      );
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/available',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Not authenticated');
    });

    it('should handle pagination query parameters', async () => {
      const mockRepositories = {
        data: [],
        pagination: {
          page: 2,
          perPage: 50,
          total: 0,
          hasMore: false,
        },
      };

      jest
        .spyOn(repositoriesService, 'listAvailableRepositories')
        .mockResolvedValue(mockRepositories);

      const response = await app.inject({
        method: 'GET',
        url: '/available?page=2&perPage=50&type=owner&sort=created',
        headers: {
          authorization: `Bearer ${createAuthToken('test-user-id')}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(repositoriesService.listAvailableRepositories).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          page: 2,
          perPage: 50,
          type: 'owner',
          sort: 'created',
        })
      );
    });

    it('should handle service errors', async () => {
      jest
        .spyOn(repositoriesService, 'listAvailableRepositories')
        .mockRejectedValue(new AppError(401, 'GitHub authentication failed'));

      const response = await app.inject({
        method: 'GET',
        url: '/available',
        headers: {
          authorization: `Bearer ${createAuthToken('test-user-id')}`,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('GitHub authentication failed');
    });

    it('should handle validation errors', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/available?page=invalid&perPage=abc',
        headers: {
          authorization: `Bearer ${createAuthToken('test-user-id')}`,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Invalid query parameters');
    });

    it('should handle rate limit errors', async () => {
      jest
        .spyOn(repositoriesService, 'listAvailableRepositories')
        .mockRejectedValue(new AppError(429, 'GitHub rate limit exceeded'));

      const response = await app.inject({
        method: 'GET',
        url: '/available',
        headers: {
          authorization: `Bearer ${createAuthToken('test-user-id')}`,
        },
      });

      expect(response.statusCode).toBe(429);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('GitHub rate limit exceeded');
    });
  });
});

