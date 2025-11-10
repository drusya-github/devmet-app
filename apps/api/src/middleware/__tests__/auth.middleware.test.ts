/**
 * Unit tests for JWT Authentication Middleware
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { FastifyRequest, FastifyReply } from 'fastify';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { prisma } from '../../database/prisma.client';
import { redis } from '../../database/redis.client';
import { verifyAccessToken, extractTokenFromHeader } from '../../utils/jwt';
import { AppError } from '../error-handler';
import { invalidateUserCache } from '../auth.middleware';
import { createMockUser, createMockOrganization } from '../../__tests__/utils/factories';

// Mock dependencies
jest.mock('../../database/prisma.client', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../database/redis.client', () => ({
  redis: {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
  },
  DEFAULT_TTL: {
    MEDIUM: 900,
  },
}));

jest.mock('../../utils/jwt');
jest.mock('../../config/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Import after mocks
import authMiddleware from '../auth.middleware';

describe('Auth Middleware', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let fastifyInstance: any;

  beforeEach(() => {
    // Create mock Fastify instance
    fastifyInstance = {
      decorate: jest.fn((name: string, fn: any) => {
        fastifyInstance[name] = fn;
      }),
    };

    // Create mock request
    mockRequest = {
      headers: {},
      id: 'test-request-id',
      params: {},
      query: {},
    } as Partial<FastifyRequest>;

    // Create mock reply
    mockReply = {} as Partial<FastifyReply>;

    // Clear all mocks and reset implementations
    jest.clearAllMocks();
    
    // Reset prisma mock
    const mockFindUnique = prisma.user.findUnique as jest.MockedFunction<typeof prisma.user.findUnique>;
    if (mockFindUnique) {
      mockFindUnique.mockReset();
    }
    
    // Reset redis mocks
    (redis.get as jest.MockedFunction<typeof redis.get>).mockReset();
    (redis.setex as jest.MockedFunction<typeof redis.setex>).mockReset();
    
    // Reset JWT mocks
    (verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>).mockReset();
    (extractTokenFromHeader as jest.MockedFunction<typeof extractTokenFromHeader>).mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Middleware Registration', () => {
    it('should register authenticate decorator', async () => {
      await authMiddleware(fastifyInstance);

      expect(fastifyInstance.decorate).toHaveBeenCalledWith(
        'authenticate',
        expect.any(Function)
      );
    });

    it('should register optionalAuthenticate decorator', async () => {
      await authMiddleware(fastifyInstance);

      expect(fastifyInstance.decorate).toHaveBeenCalledWith(
        'optionalAuthenticate',
        expect.any(Function)
      );
    });

    it('should register requireRole decorator', async () => {
      await authMiddleware(fastifyInstance);

      expect(fastifyInstance.decorate).toHaveBeenCalledWith(
        'requireRole',
        expect.any(Function)
      );
    });

    it('should register requireOrganization decorator', async () => {
      await authMiddleware(fastifyInstance);

      expect(fastifyInstance.decorate).toHaveBeenCalledWith(
        'requireOrganization',
        expect.any(Function)
      );
    });
  });

  describe('authenticate middleware', () => {
    let authenticateFn: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

    beforeEach(async () => {
      await authMiddleware(fastifyInstance);
      authenticateFn = fastifyInstance.authenticate;
    });

    it('should attach user to request with valid token', async () => {
      const user = createMockUser();
      const org = createMockOrganization();
      const token = 'valid_token';

      const userWithOrgs = {
        ...user,
        organizations: [
          {
            userId: user.id,
            orgId: org.id,
            role: 'MEMBER',
            joinedAt: new Date(),
            organization: org,
          },
        ],
      };

      // Mock token extraction and verification
      (extractTokenFromHeader as jest.MockedFunction<typeof extractTokenFromHeader>).mockReturnValue(token);
      (verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>).mockReturnValue({
        userId: user.id,
        githubId: user.githubId,
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'devmetrics-api',
        aud: 'devmetrics-web',
      } as any);

      // Mock Redis cache miss
      (redis.get as jest.MockedFunction<typeof redis.get>).mockResolvedValue(null);

      // Mock database query
      const mockFindUnique = prisma.user.findUnique as jest.MockedFunction<typeof prisma.user.findUnique>;
      mockFindUnique.mockResolvedValue(userWithOrgs as any);

      // Mock Redis cache set
      (redis.setex as jest.MockedFunction<typeof redis.setex>).mockResolvedValue('OK');

      await authenticateFn(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.id).toBe(user.id);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: user.id },
        include: {
          organizations: {
            include: {
              organization: true,
            },
          },
        },
      });
    });

    it('should use cached user data when available', async () => {
      const user = createMockUser();
      const org = createMockOrganization();
      const token = 'valid_token';

      const userWithOrgs = {
        ...user,
        organizations: [
          {
            userId: user.id,
            orgId: org.id,
            role: 'MEMBER',
            joinedAt: new Date(),
            organization: org,
          },
        ],
      };

      // Mock token extraction and verification
      (extractTokenFromHeader as jest.MockedFunction<typeof extractTokenFromHeader>).mockReturnValue(token);
      (verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>).mockReturnValue({
        userId: user.id,
        githubId: user.githubId,
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'devmetrics-api',
        aud: 'devmetrics-web',
      } as any);

      // Mock Redis cache hit - convert BigInt to string for JSON
      const userWithOrgsSerializable = {
        ...userWithOrgs,
        githubId: userWithOrgs.githubId.toString(),
        organizations: userWithOrgs.organizations.map((org: any) => ({
          ...org,
          organization: {
            ...org.organization,
            githubId: org.organization.githubId?.toString() || null,
          },
        })),
      };
      (redis.get as jest.MockedFunction<typeof redis.get>).mockResolvedValue(JSON.stringify(userWithOrgsSerializable));

      await authenticateFn(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.id).toBe(user.id);
      // Should not query database when cache hit
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should throw 401 for missing token', async () => {
      (extractTokenFromHeader as jest.MockedFunction<typeof extractTokenFromHeader>).mockReturnValue(null);

      await expect(
        authenticateFn(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow(AppError);

      await expect(
        authenticateFn(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow('No token provided');
    });

    it('should throw 401 for invalid token', async () => {
      const token = 'invalid_token';

      (extractTokenFromHeader as jest.MockedFunction<typeof extractTokenFromHeader>).mockReturnValue(token);
      (verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>).mockImplementation(() => {
        throw new JsonWebTokenError('Invalid token');
      });

      await expect(
        authenticateFn(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow(AppError);

      await expect(
        authenticateFn(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow('Invalid token');
    });

    it('should throw 401 for expired token', async () => {
      const token = 'expired_token';

      (extractTokenFromHeader as jest.MockedFunction<typeof extractTokenFromHeader>).mockReturnValue(token);
      (verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>).mockImplementation(() => {
        throw new TokenExpiredError('Token expired', new Date());
      });

      await expect(
        authenticateFn(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow(AppError);

      await expect(
        authenticateFn(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow('Token expired');
    });

    it('should throw 401 if user not found', async () => {
      const token = 'valid_token';

      (extractTokenFromHeader as jest.MockedFunction<typeof extractTokenFromHeader>).mockReturnValue(token);
      (verifyAccessToken as jest.Mock).mockReturnValue({
        userId: 'non-existent-user-id',
        githubId: BigInt(12345),
        email: 'test@example.com',
      });

      (redis.get as jest.MockedFunction<typeof redis.get>).mockResolvedValue(null);
      const mockFindUnique = prisma.user.findUnique as jest.MockedFunction<typeof prisma.user.findUnique>;
      mockFindUnique.mockResolvedValue(null as any);

      await expect(
        authenticateFn(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow(AppError);

      await expect(
        authenticateFn(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow('User not found');
    });
  });

  describe('optionalAuthenticate middleware', () => {
    let optionalAuthenticateFn: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;

    beforeEach(async () => {
      await authMiddleware(fastifyInstance);
      optionalAuthenticateFn = fastifyInstance.optionalAuthenticate;
    });

    it('should not fail when no token is provided', async () => {
      (extractTokenFromHeader as jest.MockedFunction<typeof extractTokenFromHeader>).mockReturnValue(null);

      await optionalAuthenticateFn(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockRequest.user).toBeUndefined();
    });

    it('should attach user when valid token is provided', async () => {
      const user = createMockUser();
      const org = createMockOrganization();
      const token = 'valid_token';

      const userWithOrgs = {
        ...user,
        organizations: [
          {
            userId: user.id,
            orgId: org.id,
            role: 'MEMBER',
            joinedAt: new Date(),
            organization: org,
          },
        ],
      };

      (extractTokenFromHeader as jest.MockedFunction<typeof extractTokenFromHeader>).mockReturnValue(token);
      (verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>).mockReturnValue({
        userId: user.id,
        githubId: user.githubId,
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'devmetrics-api',
        aud: 'devmetrics-web',
      } as any);
      
      // Convert BigInt to string for JSON serialization
      const userWithOrgsSerializable = {
        ...userWithOrgs,
        githubId: userWithOrgs.githubId.toString(),
        organizations: userWithOrgs.organizations.map((org: any) => ({
          ...org,
          organization: {
            ...org.organization,
            githubId: org.organization.githubId?.toString() || null,
          },
        })),
      };
      (redis.get as jest.MockedFunction<typeof redis.get>).mockResolvedValue(JSON.stringify(userWithOrgsSerializable));

      await optionalAuthenticateFn(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.id).toBe(user.id);
    });

    it('should not fail on invalid token', async () => {
      const token = 'invalid_token';

      (extractTokenFromHeader as jest.MockedFunction<typeof extractTokenFromHeader>).mockReturnValue(token);
      (verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>).mockImplementation(() => {
        throw new JsonWebTokenError('Invalid token');
      });

      await optionalAuthenticateFn(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockRequest.user).toBeUndefined();
    });
  });

  describe('requireRole middleware', () => {
    let requireRoleFn: (roles: string[]) => (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;

    beforeEach(async () => {
      await authMiddleware(fastifyInstance);
      requireRoleFn = fastifyInstance.requireRole;
    });

    it('should throw 401 if user is not authenticated', async () => {
      const middleware = requireRoleFn(['ADMIN']);

      await expect(
        middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow(AppError);

      await expect(
        middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow('Not authenticated');
    });

    it('should allow access if user has required role', async () => {
      const user = createMockUser();
      const org = createMockOrganization();

      mockRequest.user = {
        ...user,
        organizations: [
          {
            userId: user.id,
            orgId: org.id,
            role: 'ADMIN',
            joinedAt: new Date(),
            organization: org,
          },
        ],
      } as any;

      const middleware = requireRoleFn(['ADMIN']);

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Should not throw
      expect(true).toBe(true);
    });

    it('should throw 403 if user does not have required role', async () => {
      const user = createMockUser();
      const org = createMockOrganization();

      mockRequest.user = {
        ...user,
        organizations: [
          {
            userId: user.id,
            orgId: org.id,
            role: 'MEMBER',
            joinedAt: new Date(),
            organization: org,
          },
        ],
      } as any;

      const middleware = requireRoleFn(['ADMIN']);

      await expect(
        middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow(AppError);

      await expect(
        middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should allow access if user has any of the required roles', async () => {
      const user = createMockUser();
      const org = createMockOrganization();

      mockRequest.user = {
        ...user,
        organizations: [
          {
            userId: user.id,
            orgId: org.id,
            role: 'MEMBER',
            joinedAt: new Date(),
            organization: org,
          },
        ],
      } as any;

      const middleware = requireRoleFn(['ADMIN', 'MEMBER']);

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('requireOrganization middleware', () => {
    let requireOrganizationFn: (organizationId?: string) => (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;

    beforeEach(async () => {
      await authMiddleware(fastifyInstance);
      requireOrganizationFn = fastifyInstance.requireOrganization;
    });

    it('should throw 401 if user is not authenticated', async () => {
      const middleware = requireOrganizationFn('org-id');

      await expect(
        middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow(AppError);

      await expect(
        middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow('Not authenticated');
    });

    it('should throw 400 if organization ID is not provided', async () => {
      const user = createMockUser();
      mockRequest.user = { ...user, organizations: [] } as any;

      const middleware = requireOrganizationFn();

      await expect(
        middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow(AppError);

      await expect(
        middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow('Organization ID required');
    });

    it('should allow access if user belongs to organization by ID', async () => {
      const user = createMockUser();
      const org = createMockOrganization();

      mockRequest.user = {
        ...user,
        organizations: [
          {
            userId: user.id,
            orgId: org.id,
            role: 'MEMBER',
            joinedAt: new Date(),
            organization: org,
          },
        ],
      } as any;

      const middleware = requireOrganizationFn(org.id);

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Should not throw
      expect(true).toBe(true);
    });

    it('should allow access if user belongs to organization by slug', async () => {
      const user = createMockUser();
      const org = createMockOrganization({ slug: 'test-org' });

      mockRequest.user = {
        ...user,
        organizations: [
          {
            userId: user.id,
            orgId: org.id,
            role: 'MEMBER',
            joinedAt: new Date(),
            organization: org,
          },
        ],
      } as any;

      const middleware = requireOrganizationFn('test-org');

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Should not throw
      expect(true).toBe(true);
    });

    it('should extract organization ID from request params', async () => {
      const user = createMockUser();
      const org = createMockOrganization();

      mockRequest.user = {
        ...user,
        organizations: [
          {
            userId: user.id,
            orgId: org.id,
            role: 'MEMBER',
            joinedAt: new Date(),
            organization: org,
          },
        ],
      } as any;

      mockRequest.params = { organizationId: org.id } as any;

      const middleware = requireOrganizationFn();

      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Should not throw
      expect(true).toBe(true);
    });

    it('should throw 403 if user does not belong to organization', async () => {
      const user = createMockUser();
      const org = createMockOrganization();
      const otherOrg = createMockOrganization();

      mockRequest.user = {
        ...user,
        organizations: [
          {
            userId: user.id,
            orgId: org.id,
            role: 'MEMBER',
            joinedAt: new Date(),
            organization: org,
          },
        ],
      } as any;

      const middleware = requireOrganizationFn(otherOrg.id);

      await expect(
        middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow(AppError);

      await expect(
        middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)
      ).rejects.toThrow('Access denied to this organization');
    });
  });

  describe('invalidateUserCache', () => {
    it('should delete user cache keys', async () => {
      const userId = 'test-user-id';

      (redis.del as jest.MockedFunction<typeof redis.del>).mockResolvedValue(1);

      await invalidateUserCache(userId);

      expect(redis.del).toHaveBeenCalledWith(`user:${userId}`);
      expect(redis.del).toHaveBeenCalledWith(`user:profile:${userId}`);
    });
  });
});

