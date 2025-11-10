/**
 * End-to-End Integration Test for Historical Import
 * Tests the complete flow from repository connection to import completion
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import {
  getTestPrismaClient,
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
  waitFor,
} from '../../../__tests__/utils/test-db';
import { repositoriesService } from '../repositories.service';
import { importQueue } from '../import.queue';
import { importService } from '../import.service';
import { encryptGitHubToken } from '../../../utils/encryption';
import type { Octokit } from '@octokit/rest';

// Mock Octokit
jest.mock('@octokit/rest', () => {
  return {
    Octokit: jest.fn().mockImplementation(() => ({
      repos: {
        listForAuthenticatedUser: jest.fn(),
        get: jest.fn(),
        listCommits: jest.fn(),
        createWebhook: jest.fn(),
      },
      pulls: {
        list: jest.fn(),
      },
      issues: {
        listForRepo: jest.fn(),
      },
      rateLimit: {
        get: jest.fn(),
      },
    })),
  };
});

describe('Historical Import E2E Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrismaClient>;
  let testUser: any;
  let testOrg: any;
  let mockOctokit: any;

  beforeAll(async () => {
    await connectTestDatabase();
    prisma = getTestPrismaClient();
  });

  afterAll(async () => {
    await importQueue.clean(0, 'completed');
    await importQueue.clean(0, 'failed');
    await importQueue.close();
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    await importQueue.clean(0, 'completed');
    await importQueue.clean(0, 'failed');

    // Create test user with encrypted token
    const plainToken = 'gho_test_token_12345';
    const encryptedToken = encryptGitHubToken(plainToken);

    testUser = await prisma.user.create({
      data: {
        githubId: BigInt(12345),
        email: 'testuser@example.com',
        name: 'Test User',
        accessToken: encryptedToken,
      },
    });

    // Create test organization
    testOrg = await prisma.organization.create({
      data: {
        name: 'Test Org',
        slug: 'test-org',
        planType: 'FREE',
      },
    });

    // Create user-organization relationship
    await prisma.userOrganization.create({
      data: {
        userId: testUser.id,
        orgId: testOrg.id,
        role: 'ADMIN',
      },
    });

    // Setup Octokit mock
    const { Octokit } = await import('@octokit/rest');
    mockOctokit = new Octokit({ auth: plainToken });
  });

  describe('Complete Import Flow', () => {
    it('should connect repository and trigger import automatically', async () => {
      // Mock GitHub API for repository connection
      const mockRepo = {
        id: 300000,
        name: 'test-repo',
        full_name: 'test-org/test-repo',
        description: 'Test repository',
        language: 'TypeScript',
        private: false,
        permissions: {
          admin: true,
        },
        default_branch: 'main',
      };

      const mockRepos = [
        {
          id: 300000,
          name: 'test-repo',
          full_name: 'test-org/test-repo',
          owner: { login: 'test-org' },
        },
      ];

      mockOctokit.repos.listForAuthenticatedUser.mockResolvedValue({
        data: mockRepos,
      });

      mockOctokit.repos.get.mockResolvedValue({
        data: mockRepo,
      });

      mockOctokit.repos.createWebhook.mockResolvedValue({
        data: {
          id: 400000,
          config: {
            url: 'http://localhost:3001/api/webhooks/github',
          },
        },
      });

      // Mock import data
      const mockCommits = [
        {
          sha: 'abc123',
          commit: {
            message: 'Initial commit',
            author: {
              name: 'Test Author',
              email: 'author@example.com',
              date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            },
          },
          author: {
            id: 12345,
            login: 'testuser',
            avatar_url: 'https://avatars.githubusercontent.com/u/12345',
          },
        },
      ];

      const mockPRs = [
        {
          id: 1001,
          number: 1,
          title: 'Test PR',
          state: 'closed',
          merged: true,
          merged_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          closed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          user: {
            id: 12345,
            login: 'testuser',
            avatar_url: 'https://avatars.githubusercontent.com/u/12345',
          },
          additions: 50,
          deletions: 10,
          changed_files: 3,
        },
      ];

      const mockIssues = [
        {
          id: 2001,
          number: 1,
          title: 'Test Issue',
          state: 'open',
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          closed_at: null,
          user: {
            id: 12345,
            login: 'testuser',
            avatar_url: 'https://avatars.githubusercontent.com/u/12345',
          },
          pull_request: undefined,
        },
      ];

      // Setup import mocks
      mockOctokit.repos.listCommits.mockResolvedValue({
        data: mockCommits,
        headers: { 'x-ratelimit-remaining': '5000' },
      });

      mockOctokit.pulls.list.mockResolvedValue({
        data: mockPRs,
        headers: { 'x-ratelimit-remaining': '5000' },
      });

      mockOctokit.issues.listForRepo.mockResolvedValue({
        data: mockIssues,
        headers: { 'x-ratelimit-remaining': '5000' },
      });

      mockOctokit.rateLimit.get.mockResolvedValue({
        data: {
          rate: {
            remaining: 5000,
            reset: Math.floor(Date.now() / 1000) + 3600,
          },
        },
      });

      // Connect repository (this should trigger import queue)
      const connectedRepo = await repositoriesService.connectRepository(
        testUser.id,
        300000,
        testOrg.id,
        '127.0.0.1'
      );

      expect(connectedRepo).toBeDefined();
      expect(connectedRepo.id).toBeDefined();

      // Wait a bit for queue to process
      await waitFor(500);

      // Check that import job was queued
      const jobCounts = await importQueue.getJobCounts();
      expect(jobCounts.waiting + jobCounts.active).toBeGreaterThan(0);

      // Process the import job
      await importQueue.process('import-historical-data', 1, async (job) => {
        return await importService.importHistoricalData(job.data.repoId, job.data.days);
      });

      // Wait for import to complete
      await waitFor(2000);

      // Verify repository status updated
      const updatedRepo = await prisma.repository.findUnique({
        where: { id: connectedRepo.id },
      });
      expect(updatedRepo?.syncStatus).toBe('ACTIVE');
      expect(updatedRepo?.lastSyncedAt).not.toBeNull();

      // Verify data imported
      const commits = await prisma.commit.findMany({
        where: { repoId: connectedRepo.id },
      });
      expect(commits.length).toBeGreaterThan(0);

      const prs = await prisma.pullRequest.findMany({
        where: { repoId: connectedRepo.id },
      });
      expect(prs.length).toBeGreaterThan(0);

      const issues = await prisma.issue.findMany({
        where: { repoId: connectedRepo.id },
      });
      expect(issues.length).toBeGreaterThan(0);
    });

    it('should handle import failure and update repository status', async () => {
      // Mock repository connection
      const mockRepo = {
        id: 300001,
        name: 'failing-repo',
        full_name: 'test-org/failing-repo',
        description: 'Failing repository',
        language: 'TypeScript',
        private: false,
        permissions: {
          admin: true,
        },
        default_branch: 'main',
      };

      mockOctokit.repos.listForAuthenticatedUser.mockResolvedValue({
        data: [
          {
            id: 300001,
            name: 'failing-repo',
            full_name: 'test-org/failing-repo',
            owner: { login: 'test-org' },
          },
        ],
      });

      mockOctokit.repos.get.mockResolvedValue({
        data: mockRepo,
      });

      mockOctokit.repos.createWebhook.mockResolvedValue({
        data: {
          id: 400001,
          config: {
            url: 'http://localhost:3001/api/webhooks/github',
          },
        },
      });

      // Mock all imports to fail
      mockOctokit.repos.listCommits.mockRejectedValue({
        status: 500,
        message: 'Internal server error',
      });

      mockOctokit.pulls.list.mockRejectedValue({
        status: 500,
        message: 'Internal server error',
      });

      mockOctokit.issues.listForRepo.mockRejectedValue({
        status: 500,
        message: 'Internal server error',
      });

      mockOctokit.rateLimit.get.mockResolvedValue({
        data: {
          rate: {
            remaining: 5000,
            reset: Math.floor(Date.now() / 1000) + 3600,
          },
        },
      });

      // Connect repository
      const connectedRepo = await repositoriesService.connectRepository(
        testUser.id,
        300001,
        testOrg.id,
        '127.0.0.1'
      );

      // Process import job
      await importQueue.process('import-historical-data', 1, async (job) => {
        try {
          return await importService.importHistoricalData(job.data.repoId, job.data.days);
        } catch (error) {
          throw error;
        }
      });

      // Wait for import to fail
      await waitFor(2000);

      // Verify repository status is ERROR
      const updatedRepo = await prisma.repository.findUnique({
        where: { id: connectedRepo.id },
      });
      expect(updatedRepo?.syncStatus).toBe('ERROR');
    });
  });
});



