/**
 * Integration tests for Import Service
 * Tests the full import flow with database and mocked GitHub API
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import {
  getTestPrismaClient,
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
  waitFor,
} from '../../../__tests__/utils/test-db';
import { ImportService } from '../import.service';
import { encryptGitHubToken } from '../../../utils/encryption';
import type { Octokit } from '@octokit/rest';

// Mock Octokit
jest.mock('@octokit/rest', () => {
  return {
    Octokit: jest.fn().mockImplementation(() => ({
      repos: {
        listCommits: jest.fn(),
        get: jest.fn(),
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

describe('ImportService Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrismaClient>;
  let importService: ImportService;
  let mockOctokit: any;
  let testUser: any;
  let testOrg: any;
  let testRepo: any;

  // Setup test database before all tests
  beforeAll(async () => {
    await connectTestDatabase();
    prisma = getTestPrismaClient();
    importService = new ImportService();
  });

  // Cleanup after all tests
  afterAll(async () => {
    await disconnectTestDatabase();
  });

  // Setup test data before each test
  beforeEach(async () => {
    await clearTestDatabase();

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

    // Create test repository
    testRepo = await prisma.repository.create({
      data: {
        githubId: BigInt(300000),
        name: 'test-repo',
        fullName: 'test-org/test-repo',
        orgId: testOrg.id,
        syncStatus: 'PENDING',
      },
    });

    // Setup Octokit mock
    const { Octokit } = await import('@octokit/rest');
    mockOctokit = new Octokit({ auth: plainToken });

    // Setup default rate limit mock (can be overridden in individual tests)
    mockOctokit.rateLimit.get.mockResolvedValue({
      data: {
        rate: {
          remaining: 5000,
          reset: Math.floor(Date.now() / 1000) + 3600,
        },
      },
    });
  });

  describe('importHistoricalData', () => {
    it('should import commits, PRs, and issues successfully', async () => {
      // Mock GitHub API responses
      const mockCommits = [
        {
          sha: 'abc123',
          commit: {
            message: 'Test commit 1',
            author: {
              name: 'Test Author',
              email: 'author@example.com',
              date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
            },
          },
          author: {
            id: 12345,
            login: 'testuser',
            avatar_url: 'https://avatars.githubusercontent.com/u/12345',
          },
        },
        {
          sha: 'def456',
          commit: {
            message: 'Test commit 2',
            author: {
              name: 'Test Author',
              email: 'author@example.com',
              date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
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
          title: 'Test PR 1',
          state: 'closed',
          merged: true,
          merged_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          closed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
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
          title: 'Test Issue 1',
          state: 'open',
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          closed_at: null,
          user: {
            id: 12345,
            login: 'testuser',
            avatar_url: 'https://avatars.githubusercontent.com/u/12345',
          },
          pull_request: undefined, // Not a PR
        },
      ];

      // Setup mocks
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

      // Run import
      const result = await importService.importHistoricalData(testRepo.id, 90);

      // Verify results
      expect(result.commits).toBe(2);
      expect(result.pullRequests).toBe(1);
      expect(result.issues).toBe(1);
      expect(result.errors).toHaveLength(0);

      // Verify repository status updated
      const updatedRepo = await prisma.repository.findUnique({
        where: { id: testRepo.id },
      });
      expect(updatedRepo?.syncStatus).toBe('ACTIVE');
      expect(updatedRepo?.lastSyncedAt).not.toBeNull();

      // Verify commits in database
      const commits = await prisma.commit.findMany({
        where: { repoId: testRepo.id },
      });
      expect(commits).toHaveLength(2);
      expect(commits[0].sha).toBe('abc123');
      expect(commits[1].sha).toBe('def456');

      // Verify PRs in database
      const prs = await prisma.pullRequest.findMany({
        where: { repoId: testRepo.id },
      });
      expect(prs).toHaveLength(1);
      expect(prs[0].number).toBe(1);
      expect(prs[0].state).toBe('MERGED');
      expect(prs[0].githubId).toBe(BigInt(1001));

      // Verify issues in database
      const issues = await prisma.issue.findMany({
        where: { repoId: testRepo.id },
      });
      expect(issues).toHaveLength(1);
      expect(issues[0].number).toBe(1);
      expect(issues[0].state).toBe('OPEN');
      expect(issues[0].githubId).toBe(BigInt(2001));
    });

    it('should handle pagination correctly', async () => {
      // Create 150 commits (2 pages)
      const page1Commits = Array.from({ length: 100 }, (_, i) => ({
        sha: `commit-${i}`,
        commit: {
          message: `Commit ${i}`,
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
      }));

      const page2Commits = Array.from({ length: 50 }, (_, i) => ({
        sha: `commit-${100 + i}`,
        commit: {
          message: `Commit ${100 + i}`,
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
      }));

      // Setup pagination mocks
      let callCount = 0;
      mockOctokit.repos.listCommits.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            data: page1Commits,
            headers: { 'x-ratelimit-remaining': '5000' },
          });
        } else {
          return Promise.resolve({
            data: page2Commits,
            headers: { 'x-ratelimit-remaining': '5000' },
          });
        }
      });

      mockOctokit.pulls.list.mockResolvedValue({
        data: [],
        headers: { 'x-ratelimit-remaining': '5000' },
      });

      mockOctokit.issues.listForRepo.mockResolvedValue({
        data: [],
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

      // Run import
      const result = await importService.importHistoricalData(testRepo.id, 90);

      // Verify all commits imported
      expect(result.commits).toBe(150);
      expect(callCount).toBe(2); // Should have called twice

      // Verify all commits in database
      const commits = await prisma.commit.findMany({
        where: { repoId: testRepo.id },
      });
      expect(commits).toHaveLength(150);
    });

    it('should handle rate limit errors gracefully', async () => {
      // Mock rate limit error
      mockOctokit.repos.listCommits
        .mockRejectedValueOnce({
          status: 403,
          message: 'API rate limit exceeded',
        })
        .mockResolvedValueOnce({
          data: [
            {
              sha: 'abc123',
              commit: {
                message: 'Test commit',
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
          ],
          headers: { 'x-ratelimit-remaining': '5000' },
        });

      mockOctokit.pulls.list.mockResolvedValue({
        data: [],
        headers: { 'x-ratelimit-remaining': '5000' },
      });

      mockOctokit.issues.listForRepo.mockResolvedValue({
        data: [],
        headers: { 'x-ratelimit-remaining': '5000' },
      });

      // Mock rate limit check - first low, then reset
      let resetCallCount = 0;
      mockOctokit.rateLimit.get.mockImplementation(() => {
        resetCallCount++;
        if (resetCallCount === 1) {
          // First call - rate limit exceeded
          return Promise.resolve({
            data: {
              rate: {
                remaining: 0,
                reset: Math.floor(Date.now() / 1000) + 60, // Reset in 1 minute
              },
            },
          });
        } else {
          // After waiting - rate limit reset
          return Promise.resolve({
            data: {
              rate: {
                remaining: 5000,
                reset: Math.floor(Date.now() / 1000) + 3600,
              },
            },
          });
        }
      });

      // Run import
      const result = await importService.importHistoricalData(testRepo.id, 90);

      // Should eventually succeed after rate limit reset
      expect(result.commits).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle missing repository gracefully', async () => {
      await expect(
        importService.importHistoricalData('non-existent-id', 90)
      ).rejects.toThrow('Repository not found');
    });

    it('should handle missing user token gracefully', async () => {
      // Create repo without user token
      const repoWithoutToken = await prisma.repository.create({
        data: {
          githubId: BigInt(400000),
          name: 'no-token-repo',
          fullName: 'test-org/no-token-repo',
          orgId: testOrg.id,
          syncStatus: 'PENDING',
        },
      });

      await expect(
        importService.importHistoricalData(repoWithoutToken.id, 90)
      ).rejects.toThrow('No user with GitHub token found');
    });

    it('should filter issues to exclude pull requests', async () => {
      // Mock issues that include PRs
      const mockIssues = [
        {
          id: 2001,
          number: 1,
          title: 'Real Issue',
          state: 'open',
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          closed_at: null,
          user: {
            id: 12345,
            login: 'testuser',
            avatar_url: 'https://avatars.githubusercontent.com/u/12345',
          },
          pull_request: undefined, // Real issue
        },
        {
          id: 2002,
          number: 2,
          title: 'This is a PR',
          state: 'open',
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          closed_at: null,
          user: {
            id: 12345,
            login: 'testuser',
            avatar_url: 'https://avatars.githubusercontent.com/u/12345',
          },
          pull_request: {}, // This is a PR, not an issue
        },
      ];

      mockOctokit.repos.listCommits.mockResolvedValue({
        data: [],
        headers: { 'x-ratelimit-remaining': '5000' },
      });

      mockOctokit.pulls.list.mockResolvedValue({
        data: [],
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

      // Run import
      const result = await importService.importHistoricalData(testRepo.id, 90);

      // Should only import 1 issue (the real one, not the PR)
      expect(result.issues).toBe(1);

      // Verify only real issue in database
      const issues = await prisma.issue.findMany({
        where: { repoId: testRepo.id },
      });
      expect(issues).toHaveLength(1);
      expect(issues[0].number).toBe(1);
      expect(issues[0].title).toBe('Real Issue');
    });

    it('should update repository status to ERROR if all imports fail', async () => {
      // Mock all API calls to fail
      mockOctokit.repos.listCommits.mockRejectedValue({
        status: 404,
        message: 'Repository not found',
      });

      mockOctokit.pulls.list.mockRejectedValue({
        status: 404,
        message: 'Repository not found',
      });

      mockOctokit.issues.listForRepo.mockRejectedValue({
        status: 404,
        message: 'Repository not found',
      });

      mockOctokit.rateLimit.get.mockResolvedValue({
        data: {
          rate: {
            remaining: 5000,
            reset: Math.floor(Date.now() / 1000) + 3600,
          },
        },
      });

      // Run import
      await expect(
        importService.importHistoricalData(testRepo.id, 90)
      ).rejects.toThrow();

      // Verify repository status is ERROR
      const updatedRepo = await prisma.repository.findUnique({
        where: { id: testRepo.id },
      });
      expect(updatedRepo?.syncStatus).toBe('ERROR');
    });

    it('should handle partial failures gracefully', async () => {
      // Mock commits to succeed, PRs to fail, issues to succeed
      mockOctokit.repos.listCommits.mockResolvedValue({
        data: [
          {
            sha: 'abc123',
            commit: {
              message: 'Test commit',
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
        ],
        headers: { 'x-ratelimit-remaining': '5000' },
      });

      mockOctokit.pulls.list.mockRejectedValue({
        status: 500,
        message: 'Internal server error',
      });

      mockOctokit.issues.listForRepo.mockResolvedValue({
        data: [
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
        ],
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

      // Run import
      const result = await importService.importHistoricalData(testRepo.id, 90);

      // Should succeed with partial results
      expect(result.commits).toBe(1);
      expect(result.pullRequests).toBe(0);
      expect(result.issues).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes('Pull requests'))).toBe(true);

      // Repository should still be ACTIVE since some imports succeeded
      const updatedRepo = await prisma.repository.findUnique({
        where: { id: testRepo.id },
      });
      expect(updatedRepo?.syncStatus).toBe('ACTIVE');
    });

    it('should skip duplicate commits', async () => {
      const mockCommit = {
        sha: 'abc123',
        commit: {
          message: 'Test commit',
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
      };

      // Create commit in database first
      await prisma.commit.create({
        data: {
          githubId: 'abc123',
          sha: 'abc123',
          message: 'Existing commit',
          repoId: testRepo.id,
          committedAt: new Date(),
        },
      });

      mockOctokit.repos.listCommits.mockResolvedValue({
        data: [mockCommit],
        headers: { 'x-ratelimit-remaining': '5000' },
      });

      mockOctokit.pulls.list.mockResolvedValue({
        data: [],
        headers: { 'x-ratelimit-remaining': '5000' },
      });

      mockOctokit.issues.listForRepo.mockResolvedValue({
        data: [],
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

      // Run import
      const result = await importService.importHistoricalData(testRepo.id, 90);

      // Should report 0 new commits (duplicate skipped)
      expect(result.commits).toBe(0);

      // Verify only one commit in database
      const commits = await prisma.commit.findMany({
        where: { repoId: testRepo.id },
      });
      expect(commits).toHaveLength(1);
      expect(commits[0].message).toBe('Existing commit'); // Original message preserved
    });
  });
});



