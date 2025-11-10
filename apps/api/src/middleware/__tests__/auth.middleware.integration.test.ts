/**
 * Integration tests for JWT Authentication Middleware
 * Tests middleware with actual Fastify server and routes
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import fastify, { FastifyInstance } from 'fastify';
import { prisma } from '../../database/prisma.client';
import { redis } from '../../database/redis.client';
import { signAccessToken, verifyAccessToken, extractTokenFromHeader } from '../../utils/jwt';
import { createMockUser, createMockOrganization } from '../../__tests__/utils/factories';
import authMiddleware from '../auth.middleware';

// Mock JWT utils for integration tests
jest.mock('../../utils/jwt', () => {
  const actual = jest.requireActual('../../utils/jwt') as any;
  return {
    signAccessToken: actual.signAccessToken,
    signRefreshToken: actual.signRefreshToken,
    verifyRefreshToken: actual.verifyRefreshToken,
    decodeToken: actual.decodeToken,
    isTokenExpired: actual.isTokenExpired,
    generateTokenPair: actual.generateTokenPair,
    verifyAccessToken: jest.fn(),
    extractTokenFromHeader: jest.fn(),
  };
});

// Mock database and Redis
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
jest.mock('../../config/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Auth Middleware Integration Tests', () => {
  let app: FastifyInstance;
  let testUser: ReturnType<typeof createMockUser>;
  let testOrg: ReturnType<typeof createMockOrganization>;

  beforeAll(async () => {
    // Create test Fastify instance
    app = fastify({ logger: false });

    // Register auth middleware
    await app.register(authMiddleware);

    // Create test routes
    app.get('/protected', { preHandler: [app.authenticate] }, async (request, reply) => {
      return {
        success: true,
        user: {
          id: request.user?.id,
          email: request.user?.email,
        },
      };
    });

    app.get('/optional', { preHandler: [app.optionalAuthenticate] }, async (request, reply) => {
      return {
        success: true,
        authenticated: !!request.user,
        userId: request.user?.id || null,
      };
    });

    app.get('/admin', { preHandler: [app.authenticate, app.requireRole(['ADMIN'])] }, async (request, reply) => {
      return {
        success: true,
        message: 'Admin area',
      };
    });

    app.get('/org/:organizationId', {
      preHandler: [app.authenticate, app.requireOrganization()],
    }, async (request, reply) => {
      return {
        success: true,
        organizationId: (request.params as { organizationId: string }).organizationId,
      };
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    // Create fresh test data
    testUser = createMockUser();
    testOrg = createMockOrganization();

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

  describe('Protected Routes', () => {
    it('should access protected route with valid token', async () => {
      const userWithOrgs = {
        ...testUser,
        organizations: [
          {
            userId: testUser.id,
            orgId: testOrg.id,
            role: 'MEMBER',
            joinedAt: new Date(),
            organization: testOrg,
          },
        ],
      };

      const token = 'test_token_123';

      // Mock token extraction
      (extractTokenFromHeader as jest.MockedFunction<typeof extractTokenFromHeader>).mockReturnValue(token);

      // Mock token verification
      (verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>).mockReturnValue({
        userId: testUser.id,
        githubId: testUser.githubId,
        email: testUser.email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'devmetrics-api',
        aud: 'devmetrics-web',
      } as any);

      // Mock Redis cache miss
      (redis.get as jest.MockedFunction<typeof redis.get>).mockResolvedValue(null);

      // Mock database query - need to ensure prisma is properly mocked
      const mockFindUnique = prisma.user.findUnique as jest.MockedFunction<typeof prisma.user.findUnique>;
      mockFindUnique.mockResolvedValue(userWithOrgs as any);

      // Mock Redis cache set
      (redis.setex as jest.MockedFunction<typeof redis.setex>).mockResolvedValue('OK');

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      if (response.statusCode !== 200) {
        console.log('Response status:', response.statusCode);
        console.log('Response body:', response.body);
      }

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.user.id).toBe(testUser.id);
    });

    it('should return 401 for protected route without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/protected',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('No token provided');
    });

    it('should return 401 for protected route with invalid token', async () => {
      // Mock token extraction to return the token
      (extractTokenFromHeader as jest.MockedFunction<typeof extractTokenFromHeader>).mockReturnValue('invalid_token');
      
      // Mock token verification to throw JsonWebTokenError
      (verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>).mockImplementation(() => {
        const { JsonWebTokenError } = require('jsonwebtoken');
        throw new JsonWebTokenError('Invalid token');
      });

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          authorization: 'Bearer invalid_token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Invalid token');
    });

    it('should return 401 if user not found', async () => {
      const token = 'test_token_123';

      // Mock token extraction and verification
      (extractTokenFromHeader as jest.MockedFunction<typeof extractTokenFromHeader>).mockReturnValue(token);
      (verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>).mockReturnValue({
        userId: 'non-existent-user-id',
        githubId: BigInt(12345),
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'devmetrics-api',
        aud: 'devmetrics-web',
      } as any);

      // Mock Redis cache miss
      (redis.get as jest.MockedFunction<typeof redis.get>).mockResolvedValue(null);

      // Mock database query returning null
      const mockFindUnique = prisma.user.findUnique as jest.MockedFunction<typeof prisma.user.findUnique>;
      mockFindUnique.mockResolvedValue(null as any);

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('User not found');
    });
  });

  describe('Optional Authentication Routes', () => {
    it('should allow access without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/optional',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.authenticated).toBe(false);
      expect(body.userId).toBeNull();
    });

    it('should attach user when valid token is provided', async () => {
      const userWithOrgs = {
        ...testUser,
        organizations: [
          {
            userId: testUser.id,
            orgId: testOrg.id,
            role: 'MEMBER',
            joinedAt: new Date(),
            organization: testOrg,
          },
        ],
      };

      const token = 'test_token_123';

      // Mock token extraction and verification
      (extractTokenFromHeader as jest.MockedFunction<typeof extractTokenFromHeader>).mockReturnValue(token);
      (verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>).mockReturnValue({
        userId: testUser.id,
        githubId: testUser.githubId,
        email: testUser.email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'devmetrics-api',
        aud: 'devmetrics-web',
      } as any);

      // Mock Redis cache hit
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

      const response = await app.inject({
        method: 'GET',
        url: '/optional',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.authenticated).toBe(true);
      expect(body.userId).toBe(testUser.id);
    });

    it('should not fail on invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/optional',
        headers: {
          authorization: 'Bearer invalid_token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.authenticated).toBe(false);
    });
  });

  describe('Role-Based Authorization', () => {
    it('should allow access if user has required role', async () => {
      const userWithOrgs = {
        ...testUser,
        organizations: [
          {
            userId: testUser.id,
            orgId: testOrg.id,
            role: 'ADMIN',
            joinedAt: new Date(),
            organization: testOrg,
          },
        ],
      };

      const token = 'test_token_123';

      // Mock token extraction and verification
      (extractTokenFromHeader as jest.MockedFunction<typeof extractTokenFromHeader>).mockReturnValue(token);
      (verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>).mockReturnValue({
        userId: testUser.id,
        githubId: testUser.githubId,
        email: testUser.email,
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

      const response = await app.inject({
        method: 'GET',
        url: '/admin',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Admin area');
    });

    it('should return 403 if user does not have required role', async () => {
      const userWithOrgs = {
        ...testUser,
        organizations: [
          {
            userId: testUser.id,
            orgId: testOrg.id,
            role: 'MEMBER',
            joinedAt: new Date(),
            organization: testOrg,
          },
        ],
      };

      const token = 'test_token_123';

      // Mock token extraction and verification
      (extractTokenFromHeader as jest.MockedFunction<typeof extractTokenFromHeader>).mockReturnValue(token);
      (verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>).mockReturnValue({
        userId: testUser.id,
        githubId: testUser.githubId,
        email: testUser.email,
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

      const response = await app.inject({
        method: 'GET',
        url: '/admin',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Insufficient permissions');
    });
  });

  describe('Organization-Based Authorization', () => {
    it('should allow access if user belongs to organization', async () => {
      const userWithOrgs = {
        ...testUser,
        organizations: [
          {
            userId: testUser.id,
            orgId: testOrg.id,
            role: 'MEMBER',
            joinedAt: new Date(),
            organization: testOrg,
          },
        ],
      };

      const token = 'test_token_123';

      // Mock token extraction and verification
      (extractTokenFromHeader as jest.MockedFunction<typeof extractTokenFromHeader>).mockReturnValue(token);
      (verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>).mockReturnValue({
        userId: testUser.id,
        githubId: testUser.githubId,
        email: testUser.email,
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

      const response = await app.inject({
        method: 'GET',
        url: `/org/${testOrg.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.organizationId).toBe(testOrg.id);
    });

    it('should return 403 if user does not belong to organization', async () => {
      const otherOrg = createMockOrganization();
      const userWithOrgs = {
        ...testUser,
        organizations: [
          {
            userId: testUser.id,
            orgId: testOrg.id,
            role: 'MEMBER',
            joinedAt: new Date(),
            organization: testOrg,
          },
        ],
      };

      const token = 'test_token_123';

      // Mock token extraction and verification
      (extractTokenFromHeader as jest.MockedFunction<typeof extractTokenFromHeader>).mockReturnValue(token);
      (verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>).mockReturnValue({
        userId: testUser.id,
        githubId: testUser.githubId,
        email: testUser.email,
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

      const response = await app.inject({
        method: 'GET',
        url: `/org/${otherOrg.id}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Access denied to this organization');
    });

    it('should allow access by organization slug', async () => {
      const orgWithSlug = createMockOrganization({ slug: 'test-org-slug' });
      const userWithOrgs = {
        ...testUser,
        organizations: [
          {
            userId: testUser.id,
            orgId: orgWithSlug.id,
            role: 'MEMBER',
            joinedAt: new Date(),
            organization: orgWithSlug,
          },
        ],
      };

      const token = 'test_token_123';

      // Mock token extraction and verification
      (extractTokenFromHeader as jest.MockedFunction<typeof extractTokenFromHeader>).mockReturnValue(token);
      (verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>).mockReturnValue({
        userId: testUser.id,
        githubId: testUser.githubId,
        email: testUser.email,
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

      const response = await app.inject({
        method: 'GET',
        url: `/org/${orgWithSlug.slug}`,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });
});

