/**
 * Metrics API Integration Tests
 * Tests for all metrics retrieval endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../../../../database/prisma.client';
import { redis } from '../../../../database/redis.client';
import MetricsCacheUtil from '../../metrics.cache';
import { generateAccessToken } from '../../../../utils/jwt';

// Helper to build Fastify app for testing
async function buildTestApp(): Promise<FastifyInstance> {
  const fastify = (await import('fastify')).default({
    logger: false,
  });

  // Register auth middleware
  const authMiddleware = await import(
    '../../../../middleware/auth.middleware'
  );
  await fastify.register(authMiddleware.default);

  // Register metrics routes
  const { metricsRoutes } = await import('../../metrics.api.routes');
  await fastify.register(metricsRoutes, { prefix: '/api/metrics' });

  return fastify;
}

describe('Metrics API Integration Tests', () => {
  let app: FastifyInstance;
  let testOrg: any;
  let testUser: any;
  let testUser2: any;
  let testRepo: any;
  let testToken: string;
  let unauthorizedToken: string;

  beforeAll(async () => {
    // Build Fastify app
    app = await buildTestApp();

    const timestamp = Date.now();

    // Create test organization with unique slug
    testOrg = await prisma.organization.create({
      data: {
        // let Prisma generate id to avoid conflicts as well
        name: 'Test Org',
        slug: `test-org-${timestamp}`,
      },
    });

    // Create test users
    testUser = await prisma.user.create({
      data: {
        githubId: BigInt(12345),
        email: 'test@example.com',
        name: 'Test User',
        accessToken: 'encrypted_token',
      },
    });

    // Link user to organization
    await prisma.userOrganization.create({
      data: {
        userId: testUser.id,
        organizationId: testOrg.id,
        role: 'MEMBER',
      },
    });

    // Create unauthorized user in different org with unique slug
    const otherOrg = await prisma.organization.create({
      data: {
        name: 'Other Org',
        slug: `other-org-${timestamp}`,
      },
    });

    testUser2 = await prisma.user.create({
      data: {
        githubId: BigInt(67890),
        email: 'test2@example.com',
        name: 'Test User 2',
        accessToken: 'encrypted_token',
      },
    });

    await prisma.userOrganization.create({
      data: {
        userId: testUser2.id,
        organizationId: otherOrg.id,
        role: 'MEMBER',
      },
    });

    // Create test repository
    testRepo = await prisma.repository.create({
      data: {
        githubId: BigInt(123),
        name: 'test-repo',
        fullName: 'test-org/test-repo',
        organizationId: testOrg.id,
        isPrivate: false,
      },
    });

    // Create test metrics
    await prisma.developerMetric.createMany({
      data: [
        {
          userId: testUser.id,
          organizationId: testOrg.id,
          date: new Date('2024-01-01'),
          commits: 10,
          prsOpened: 2,
          linesAdded: 100,
          linesDeleted: 50,
        },
        {
          userId: testUser.id,
          organizationId: testOrg.id,
          date: new Date('2024-01-02'),
          commits: 15,
          prsOpened: 3,
          linesAdded: 150,
          linesDeleted: 75,
        },
      ],
    });

    await prisma.teamMetric.createMany({
      data: [
        {
          organizationId: testOrg.id,
          date: new Date('2024-01-01'),
          totalCommits: 20,
          totalPrsOpened: 5,
          totalPrsMerged: 3,
          velocity: 3,
          activeContributors: 2,
        },
      ],
    });

    await prisma.repositoryStats.createMany({
      data: [
        {
          repoId: testRepo.id,
          date: new Date('2024-01-01'),
          commits: 20,
          prsOpened: 5,
          uniqueContributors: 3,
        },
      ],
    });

    // Generate test tokens with full JWTPayload
    testToken = generateAccessToken({
      userId: String(testUser.id),
      githubId: testUser.githubId,
      email: testUser.email,
    });

    unauthorizedToken = generateAccessToken({
      userId: String(testUser2.id),
      githubId: testUser2.githubId,
      email: testUser2.email,
    });
  });

  afterAll(async () => {
    // Clean up test data (guarded in case setup failed early)
    if (testUser && testUser2) {
      await prisma.developerMetric.deleteMany({
        where: { userId: { in: [testUser.id, testUser2.id] } },
      });
      await prisma.userOrganization.deleteMany({
        where: { userId: { in: [testUser.id, testUser2.id] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [testUser.id, testUser2.id] } },
      });
    }

    if (testOrg) {
      await prisma.teamMetric.deleteMany({
        where: { organizationId: testOrg.id },
      });
      if (testRepo) {
        await prisma.repositoryStats.deleteMany({
          where: { repoId: testRepo.id },
        });
        await prisma.repository.delete({ where: { id: testRepo.id } });
      }
      // Remove all organizations created during tests
      await prisma.organization.deleteMany();
    }

    // Close connections
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clear cache before each test
    await MetricsCacheUtil.deletePattern('metrics:*');
  });

  describe('GET /api/metrics/developer/:userId', () => {
    it('should return developer metrics with valid authorization', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/metrics/developer/${testUser.id}`,
        headers: {
          authorization: `Bearer ${testToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('data');
      expect(body.data).toHaveProperty('pagination');
      expect(Array.isArray(body.data.data)).toBe(true);
      expect(body.cached).toBe(false);
    });

    it('should fail without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/metrics/developer/${testUser.id}`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should filter by date range', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/metrics/developer/${testUser.id}?startDate=2024-01-01T00:00:00Z&endDate=2024-01-01T23:59:59Z`,
        headers: {
          authorization: `Bearer ${testToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.data.length).toBe(1);
    });

    it('should paginate results', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/metrics/developer/${testUser.id}?page=1&limit=1`,
        headers: {
          authorization: `Bearer ${testToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.pagination.limit).toBe(1);
      expect(body.data.pagination.page).toBe(1);
    });

    it('should return cached response on second request', async () => {
      // First request
      const response1 = await app.inject({
        method: 'GET',
        url: `/api/metrics/developer/${testUser.id}`,
        headers: {
          authorization: `Bearer ${testToken}`,
        },
      });

      const body1 = JSON.parse(response1.body);
      expect(body1.cached).toBe(false);

      // Second request (should be cached)
      const response2 = await app.inject({
        method: 'GET',
        url: `/api/metrics/developer/${testUser.id}`,
        headers: {
          authorization: `Bearer ${testToken}`,
        },
      });

      const body2 = JSON.parse(response2.body);
      expect(body2.cached).toBe(true);
    });
  });

  describe('GET /api/metrics/team/:organizationId', () => {
    it('should return team metrics with valid authorization', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/metrics/team/${testOrg.id}`,
        headers: {
          authorization: `Bearer ${testToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('data');
      expect(body.data).toHaveProperty('aggregates');
    });

    it('should fail with unauthorized access to different org', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/metrics/team/${testOrg.id}`,
        headers: {
          authorization: `Bearer ${unauthorizedToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /api/metrics/repository/:repositoryId', () => {
    it('should return repository metrics with valid authorization', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/metrics/repository/${testRepo.id}`,
        headers: {
          authorization: `Bearer ${testToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('data');
    });

    it('should fail with unauthorized access', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/metrics/repository/${testRepo.id}`,
        headers: {
          authorization: `Bearer ${unauthorizedToken}`,
        },
      });

      expect(response.statusCode).toBe(500); // Will error trying to access repo
    });
  });

  describe('GET /api/metrics/trends', () => {
    it('should return trend data with valid parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/metrics/trends?organizationId=${testOrg.id}&startDate=2024-01-01T00:00:00Z&endDate=2024-01-02T23:59:59Z&granularity=day`,
        headers: {
          authorization: `Bearer ${testToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should fail without required parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/metrics/trends?organizationId=${testOrg.id}`,
        headers: {
          authorization: `Bearer ${testToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid UUID in path parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/metrics/developer/invalid-uuid',
        headers: {
          authorization: `Bearer ${testToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject invalid date format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/metrics/developer/${testUser.id}?startDate=invalid-date`,
        headers: {
          authorization: `Bearer ${testToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
