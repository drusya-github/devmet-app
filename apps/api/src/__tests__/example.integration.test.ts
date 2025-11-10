/**
 * Example Integration Test
 * Demonstrates how to write integration tests with database interactions
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  getTestPrismaClient,
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from './utils/test-db';
import { createMockUser, createMockOrganization } from './utils/factories';

describe('Example Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrismaClient>;

  // Setup test database before all tests
  beforeAll(async () => {
    await connectTestDatabase();
    prisma = getTestPrismaClient();
  });

  // Cleanup after all tests
  afterAll(async () => {
    await disconnectTestDatabase();
  });

  // Clear database before each test
  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe('User CRUD Operations', () => {
    it('should create a user in the database', async () => {
      const userData = {
        githubId: BigInt(12345),
        email: 'test@example.com',
        name: 'Test User',
        accessToken: 'mock_token',
      };

      const user = await prisma.user.create({
        data: userData,
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.githubId).toBe(userData.githubId);
    });

    it('should find a user by email', async () => {
      // Create a user
      const userData = {
        githubId: BigInt(12345),
        email: 'findme@example.com',
        name: 'Find Me',
        accessToken: 'mock_token',
      };

      await prisma.user.create({ data: userData });

      // Find the user
      const foundUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      expect(foundUser).not.toBeNull();
      expect(foundUser!.email).toBe(userData.email);
      expect(foundUser!.name).toBe(userData.name);
    });

    it('should update a user', async () => {
      // Create a user
      const user = await prisma.user.create({
        data: {
          githubId: BigInt(12345),
          email: 'update@example.com',
          name: 'Old Name',
          accessToken: 'mock_token',
        },
      });

      // Update the user
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { name: 'New Name' },
      });

      expect(updatedUser.name).toBe('New Name');
      expect(updatedUser.email).toBe('update@example.com');
    });

    it('should delete a user', async () => {
      // Create a user
      const user = await prisma.user.create({
        data: {
          githubId: BigInt(12345),
          email: 'delete@example.com',
          name: 'Delete Me',
          accessToken: 'mock_token',
        },
      });

      // Delete the user
      await prisma.user.delete({
        where: { id: user.id },
      });

      // Verify deletion
      const deletedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(deletedUser).toBeNull();
    });

    it('should enforce unique email constraint', async () => {
      const email = 'unique@example.com';

      // Create first user
      await prisma.user.create({
        data: {
          githubId: BigInt(12345),
          email,
          name: 'First User',
          accessToken: 'mock_token',
        },
      });

      // Try to create second user with same email
      await expect(
        prisma.user.create({
          data: {
            githubId: BigInt(67890),
            email, // Duplicate email
            name: 'Second User',
            accessToken: 'mock_token_2',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Organization CRUD Operations', () => {
    it('should create an organization', async () => {
      const orgData = {
        githubId: BigInt(54321),
        name: 'Test Organization',
        slug: 'test-org',
        planType: 'FREE' as const,
      };

      const org = await prisma.organization.create({
        data: orgData,
      });

      expect(org.id).toBeDefined();
      expect(org.slug).toBe(orgData.slug);
      expect(org.planType).toBe('FREE');
    });

    it('should list all organizations', async () => {
      // Create multiple organizations
      await prisma.organization.create({
        data: {
          githubId: BigInt(1),
          name: 'Org 1',
          slug: 'org-1',
          planType: 'FREE',
        },
      });

      await prisma.organization.create({
        data: {
          githubId: BigInt(2),
          name: 'Org 2',
          slug: 'org-2',
          planType: 'PRO',
        },
      });

      const orgs = await prisma.organization.findMany();

      expect(orgs).toHaveLength(2);
      expect(orgs[0].slug).toBe('org-1');
      expect(orgs[1].slug).toBe('org-2');
    });
  });

  describe('User-Organization Relationships', () => {
    it('should create a user-organization relationship', async () => {
      // Create user
      const user = await prisma.user.create({
        data: {
          githubId: BigInt(12345),
          email: 'member@example.com',
          name: 'Member',
          accessToken: 'mock_token',
        },
      });

      // Create organization
      const org = await prisma.organization.create({
        data: {
          githubId: BigInt(54321),
          name: 'Test Org',
          slug: 'test-org',
          planType: 'FREE',
        },
      });

      // Create relationship
      const userOrg = await prisma.userOrganization.create({
        data: {
          userId: user.id,
          orgId: org.id,
          role: 'MEMBER',
        },
      });

      expect(userOrg.userId).toBe(user.id);
      expect(userOrg.orgId).toBe(org.id);
      expect(userOrg.role).toBe('MEMBER');
    });

    it('should query user with organizations', async () => {
      // Create user
      const user = await prisma.user.create({
        data: {
          githubId: BigInt(12345),
          email: 'user@example.com',
          name: 'User',
          accessToken: 'mock_token',
        },
      });

      // Create organization
      const org = await prisma.organization.create({
        data: {
          githubId: BigInt(54321),
          name: 'User Org',
          slug: 'user-org',
          planType: 'FREE',
        },
      });

      // Create relationship
      await prisma.userOrganization.create({
        data: {
          userId: user.id,
          orgId: org.id,
          role: 'ADMIN',
        },
      });

      // Query with relations
      const userWithOrgs = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          organizations: {
            include: {
              organization: true,
            },
          },
        },
      });

      expect(userWithOrgs).not.toBeNull();
      expect(userWithOrgs!.organizations).toHaveLength(1);
      expect(userWithOrgs!.organizations[0].organization.slug).toBe('user-org');
      expect(userWithOrgs!.organizations[0].role).toBe('ADMIN');
    });
  });

  describe('Repository Operations', () => {
    it('should create a repository linked to an organization', async () => {
      // Create organization first
      const org = await prisma.organization.create({
        data: {
          githubId: BigInt(54321),
          name: 'Repo Org',
          slug: 'repo-org',
          planType: 'FREE',
        },
      });

      // Create repository
      const repo = await prisma.repository.create({
        data: {
          githubId: BigInt(99999),
          name: 'test-repo',
          fullName: 'repo-org/test-repo',
          orgId: org.id,
          syncStatus: 'ACTIVE',
        },
      });

      expect(repo.id).toBeDefined();
      expect(repo.orgId).toBe(org.id);
      expect(repo.syncStatus).toBe('ACTIVE');
    });

    it('should cascade delete repositories when organization is deleted', async () => {
      // Create organization
      const org = await prisma.organization.create({
        data: {
          githubId: BigInt(54321),
          name: 'Cascade Org',
          slug: 'cascade-org',
          planType: 'FREE',
        },
      });

      // Create repository
      await prisma.repository.create({
        data: {
          githubId: BigInt(99999),
          name: 'cascade-repo',
          fullName: 'cascade-org/cascade-repo',
          orgId: org.id,
          syncStatus: 'ACTIVE',
        },
      });

      // Delete organization
      await prisma.organization.delete({
        where: { id: org.id },
      });

      // Verify repository was also deleted
      const repos = await prisma.repository.findMany({
        where: { orgId: org.id },
      });

      expect(repos).toHaveLength(0);
    });
  });

  describe('Transactions', () => {
    it('should rollback transaction on error', async () => {
      const email = 'transaction@example.com';

      try {
        await prisma.$transaction(async (tx: any) => {
          // Create first user
          await tx.user.create({
            data: {
              githubId: BigInt(12345),
              email,
              name: 'Transaction User',
              accessToken: 'mock_token',
            },
          });

          // This should fail due to duplicate email
          await tx.user.create({
            data: {
              githubId: BigInt(67890),
              email, // Duplicate!
              name: 'Duplicate User',
              accessToken: 'mock_token_2',
            },
          });
        });
      } catch (error) {
        // Expected to fail
      }

      // Verify no user was created
      const users = await prisma.user.findMany({
        where: { email },
      });

      expect(users).toHaveLength(0);
    });

    it('should commit transaction on success', async () => {
      await prisma.$transaction(async (tx: any) => {
        await tx.user.create({
          data: {
            githubId: BigInt(12345),
            email: 'tx1@example.com',
            name: 'TX User 1',
            accessToken: 'mock_token_1',
          },
        });

        await tx.user.create({
          data: {
            githubId: BigInt(67890),
            email: 'tx2@example.com',
            name: 'TX User 2',
            accessToken: 'mock_token_2',
          },
        });
      });

      // Verify both users were created
      const users = await prisma.user.findMany();
      expect(users).toHaveLength(2);
    });
  });

  describe('Query Performance', () => {
    it('should efficiently query with proper indexes', async () => {
      // Create test data
      const user = await prisma.user.create({
        data: {
          githubId: BigInt(12345),
          email: 'perf@example.com',
          name: 'Performance User',
          accessToken: 'mock_token',
        },
      });

      const startTime = Date.now();

      // This should use the index on githubId
      const foundUser = await prisma.user.findUnique({
        where: { githubId: BigInt(12345) },
      });

      const queryTime = Date.now() - startTime;

      expect(foundUser).not.toBeNull();
      expect(foundUser!.id).toBe(user.id);
      expect(queryTime).toBeLessThan(100); // Should be fast
    });
  });
});
