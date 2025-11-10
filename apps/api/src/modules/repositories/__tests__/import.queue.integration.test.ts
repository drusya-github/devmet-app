/**
 * Integration tests for Import Queue
 * Tests queue job processing and worker functionality
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import {
  getTestPrismaClient,
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
  waitFor,
} from '../../../__tests__/utils/test-db';
import { importQueue } from '../import.queue';
import { importService } from '../import.service';
import { encryptGitHubToken } from '../../../utils/encryption';

// Mock the import service
jest.mock('../import.service', () => {
  const actual: any = jest.requireActual('../import.service');
  return {
    ...actual,
    importService: {
      importHistoricalData: jest.fn(),
    },
  };
});

describe('Import Queue Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrismaClient>;
  let testUser: any;
  let testOrg: any;
  let testRepo: any;

  beforeAll(async () => {
    await connectTestDatabase();
    prisma = getTestPrismaClient();
  });

  afterAll(async () => {
    // Clean up queue
    await importQueue.clean(0, 'completed');
    await importQueue.clean(0, 'failed');
    await importQueue.close();
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    await importQueue.clean(0, 'completed');
    await importQueue.clean(0, 'failed');

    // Create test data
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

    testOrg = await prisma.organization.create({
      data: {
        name: 'Test Org',
        slug: 'test-org',
        planType: 'FREE',
      },
    });

    await prisma.userOrganization.create({
      data: {
        userId: testUser.id,
        orgId: testOrg.id,
        role: 'ADMIN',
      },
    });

    testRepo = await prisma.repository.create({
      data: {
        githubId: BigInt(300000),
        name: 'test-repo',
        fullName: 'test-org/test-repo',
        orgId: testOrg.id,
        syncStatus: 'PENDING',
      },
    });
  });

  describe('Queue Job Processing', () => {
    it('should add job to queue successfully', async () => {
      const job = await importQueue.add('import-historical-data', {
        repoId: testRepo.id,
        days: 90,
      });

      expect(job.id).toBeDefined();
      expect(job.data.repoId).toBe(testRepo.id);
      expect(job.data.days).toBe(90);

      // Verify job is in queue
      const jobCounts = await importQueue.getJobCounts();
      expect(jobCounts.waiting).toBeGreaterThan(0);
    });

    it('should process job and call import service', async () => {
      const mockImport = jest.mocked(importService.importHistoricalData);
      mockImport.mockResolvedValue({
        commits: 10,
        pullRequests: 5,
        issues: 3,
        errors: [],
      } as any);

      // Add job
      const job = await importQueue.add('import-historical-data', {
        repoId: testRepo.id,
        days: 90,
      });

      // Process job manually (since worker might not be running in tests)
      await importQueue.process('import-historical-data', 1, async (job) => {
        const result = await importService.importHistoricalData(
          job.data.repoId,
          job.data.days
        );
        return result;
      });

      // Wait for job to complete
      await waitFor(1000);

      // Verify import service was called
      expect(mockImport).toHaveBeenCalledWith(testRepo.id, 90);

      // Verify job completed
      const completedJob = await importQueue.getJob(job.id!);
      expect(completedJob).not.toBeNull();
    });

    it('should retry failed jobs', async () => {
      const mockImport = importService.importHistoricalData as jest.Mock<any>;
      let callCount = 0;

      // Fail first 2 times, succeed on 3rd
      mockImport.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve({
          commits: 5,
          pullRequests: 2,
          issues: 1,
          errors: [],
        });
      });

      // Add job with retry config
      const job = await importQueue.add(
        'import-historical-data',
        {
          repoId: testRepo.id,
          days: 90,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 100, // Short delay for tests
          },
        }
      );

      // Process job
      await importQueue.process('import-historical-data', 1, async (job) => {
        try {
          return await importService.importHistoricalData(job.data.repoId, job.data.days);
        } catch (error) {
          throw error; // Will trigger retry
        }
      });

      // Wait for retries
      await waitFor(2000);

      // Should have been called 3 times (initial + 2 retries)
      expect(callCount).toBe(3);
    });

    it('should handle job failures after max retries', async () => {
      const mockImport = importService.importHistoricalData as jest.Mock<any>;
      mockImport.mockRejectedValue(new Error('Permanent failure'));

      // Add job
      const job = await importQueue.add(
        'import-historical-data',
        {
          repoId: testRepo.id,
          days: 90,
        },
        {
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 100,
          },
        }
      );

      // Process job
      await importQueue.process('import-historical-data', 1, async (job) => {
        return await importService.importHistoricalData(job.data.repoId, job.data.days);
      });

      // Wait for failures
      await waitFor(2000);

      // Verify job failed
      const failedJob = await importQueue.getJob(job.id!);
      expect(failedJob).not.toBeNull();
      expect(failedJob?.failedReason).toBeDefined();
    });

    it('should handle multiple concurrent jobs', async () => {
      const mockImport = importService.importHistoricalData as jest.Mock<any>;
      mockImport.mockResolvedValue({
        commits: 10,
        pullRequests: 5,
        issues: 3,
        errors: [],
      });

      // Create multiple repositories
      const repos = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          prisma.repository.create({
            data: {
              githubId: BigInt(300000 + i),
              name: `test-repo-${i}`,
              fullName: `test-org/test-repo-${i}`,
              orgId: testOrg.id,
              syncStatus: 'PENDING',
            },
          })
        )
      );

      // Add multiple jobs
      const jobs = await Promise.all(
        repos.map((repo) =>
          importQueue.add('import-historical-data', {
            repoId: repo.id,
            days: 90,
          })
        )
      );

      // Process with 3 concurrent workers
      await importQueue.process('import-historical-data', 3, async (job) => {
        return await importService.importHistoricalData(job.data.repoId, job.data.days);
      });

      // Wait for all jobs to complete
      await waitFor(3000);

      // Verify all jobs processed
      expect(mockImport).toHaveBeenCalledTimes(5);
      expect(mockImport).toHaveBeenCalledWith(repos[0].id, 90);
      expect(mockImport).toHaveBeenCalledWith(repos[1].id, 90);
      expect(mockImport).toHaveBeenCalledWith(repos[2].id, 90);
      expect(mockImport).toHaveBeenCalledWith(repos[3].id, 90);
      expect(mockImport).toHaveBeenCalledWith(repos[4].id, 90);
    });
  });

  describe('Queue Management', () => {
    it('should get job counts correctly', async () => {
      // Add some jobs
      await importQueue.add('import-historical-data', { repoId: testRepo.id, days: 90 });
      await importQueue.add('import-historical-data', { repoId: testRepo.id, days: 90 });

      const counts = await importQueue.getJobCounts();
      expect(counts.waiting).toBeGreaterThanOrEqual(2);
    });

    it('should clean completed jobs', async () => {
      const mockImport = importService.importHistoricalData as jest.Mock<any>;
      mockImport.mockResolvedValue({
        commits: 10,
        pullRequests: 5,
        issues: 3,
        errors: [],
      });

      // Add and process job
      const job = await importQueue.add('import-historical-data', {
        repoId: testRepo.id,
        days: 90,
      });

      await importQueue.process('import-historical-data', 1, async (job) => {
        return await importService.importHistoricalData(job.data.repoId, job.data.days);
      });

      await waitFor(1000);

      // Clean completed jobs
      await importQueue.clean(0, 'completed');

      // Verify job cleaned
      const cleanedJob = await importQueue.getJob(job.id!);
      expect(cleanedJob).toBeNull();
    });
  });
});



