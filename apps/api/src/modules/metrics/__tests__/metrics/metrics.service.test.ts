/**
 * DevMetrics - Metrics Service Unit Tests
 * Tests for metrics calculation logic
 */

import { PrismaClient } from '@prisma/client';
import { MetricsService } from '../../metrics.service';
import type { DeveloperMetricsResult, TeamMetricsResult, RepositoryMetricsResult } from '../../metrics.types';

// Mock Prisma Client
const mockPrisma = {
  commit: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  pullRequest: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  issue: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  developerMetric: {
    upsert: jest.fn(),
  },
  teamMetric: {
    upsert: jest.fn(),
  },
  repositoryStats: {
    upsert: jest.fn(),
  },
} as unknown as PrismaClient;

describe('MetricsService', () => {
  let metricsService: MetricsService;
  const testUserId = 'user-123';
  const testOrgId = 'org-456';
  const testRepoId = 'repo-789';
  const testDate = new Date('2025-11-14');

  beforeEach(() => {
    metricsService = new MetricsService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('calculateDeveloperMetrics', () => {
    it('should calculate developer metrics correctly', async () => {
      // Mock commit data
      (mockPrisma.commit.findMany as jest.Mock).mockResolvedValue([
        {
          additions: 100,
          deletions: 50,
          filesChanged: 5,
          createdAt: new Date('2025-11-14T10:00:00Z'),
        },
        {
          additions: 200,
          deletions: 75,
          filesChanged: 10,
          createdAt: new Date('2025-11-14T15:00:00Z'),
        },
      ]);

      // Mock PR counts
      (mockPrisma.pullRequest.count as jest.Mock)
        .mockResolvedValueOnce(2) // prsOpened
        .mockResolvedValueOnce(1) // prsMerged
        .mockResolvedValueOnce(0); // prsClosed

      // Mock PR data for average size AND filesChanged
      (mockPrisma.pullRequest.findMany as jest.Mock).mockResolvedValue([
        { additions: 100, deletions: 50, filesChanged: 5 },
        { additions: 200, deletions: 100, filesChanged: 10 },
      ]);

      // Mock issue counts and data
      (mockPrisma.issue.count as jest.Mock).mockResolvedValue(1);
      (mockPrisma.issue.findMany as jest.Mock).mockResolvedValue([
        { 
          createdAt: new Date('2025-11-14T10:00:00Z'),
          closedAt: new Date('2025-11-15T10:00:00Z') // 24 hours later
        },
      ]);

      const result = await metricsService.calculateDeveloperMetrics(
        testUserId,
        testOrgId,
        testDate
      );

      expect(result).toMatchObject({
        userId: testUserId,
        organizationId: testOrgId,
        commits: 2,
        linesAdded: 300,
        linesDeleted: 125,
        filesChanged: 15,
        prsOpened: 2,
        prsMerged: 1,
        prsClosed: 0,
        issuesOpened: 1,
        issuesResolved: 1,
        avgIssueTime: 24,
      });
    });

    it('should handle developers with no activity', async () => {
      (mockPrisma.commit.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.pullRequest.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.pullRequest.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.issue.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.issue.findMany as jest.Mock).mockResolvedValue([]);

      const result = await metricsService.calculateDeveloperMetrics(
        testUserId,
        testOrgId,
        testDate
      );

      expect(result).toMatchObject({
        userId: testUserId,
        commits: 0,
        linesAdded: 0,
        linesDeleted: 0,
        prsOpened: 0,
        prsMerged: 0,
        issuesOpened: 0,
      });
    });

    it('should calculate activity patterns correctly', async () => {
      // Saturday and late night commits
      (mockPrisma.commit.findMany as jest.Mock).mockResolvedValue([
        { 
          additions: 50, 
          deletions: 25, 
          filesChanged: 3,
          createdAt: new Date('2025-11-15T23:30:00Z') // Saturday late night
        },
        { 
          additions: 50, 
          deletions: 25, 
          filesChanged: 3,
          createdAt: new Date('2025-11-14T14:00:00Z') // Thursday afternoon
        },
      ]);

      (mockPrisma.pullRequest.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.pullRequest.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.issue.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.issue.findMany as jest.Mock).mockResolvedValue([]);

      const result = await metricsService.calculateDeveloperMetrics(
        testUserId,
        testOrgId,
        testDate
      );

      expect(result.commitsOnWeekend).toBeGreaterThan(0);
      expect(result.commitsLateNight).toBeGreaterThan(0);
      expect(result.avgCommitTime).toBeDefined();
    });
  });

  describe('calculateTeamMetrics', () => {
    it('should calculate team metrics correctly', async () => {
      (mockPrisma.commit.count as jest.Mock).mockResolvedValue(50);
      (mockPrisma.pullRequest.count as jest.Mock)
        .mockResolvedValueOnce(10) // totalPrsOpened
        .mockResolvedValueOnce(5); // prQueueLength

      // PRs with createdAt/mergedAt for cycle time
      (mockPrisma.pullRequest.findMany as jest.Mock).mockResolvedValue([
        { 
          createdAt: new Date('2025-11-14T00:00:00Z'),
          mergedAt: new Date('2025-11-14T10:00:00Z') // 10 hours
        },
        { 
          createdAt: new Date('2025-11-14T00:00:00Z'),
          mergedAt: new Date('2025-11-14T20:00:00Z') // 20 hours
        },
        { 
          createdAt: new Date('2025-11-14T00:00:00Z'),
          mergedAt: new Date('2025-11-15T06:00:00Z') // 30 hours
        },
      ]);

      (mockPrisma.issue.count as jest.Mock)
        .mockResolvedValueOnce(5) // totalIssuesClosed
        .mockResolvedValueOnce(10); // issueBacklog

      (mockPrisma.commit.findMany as jest.Mock).mockResolvedValue([
        { authorId: 'user1' },
        { authorId: 'user2' },
        { authorId: 'user3' },
      ]);

      const result = await metricsService.calculateTeamMetrics(testOrgId, testDate);

      expect(result).toMatchObject({
        organizationId: testOrgId,
        totalCommits: 50,
        totalPrsOpened: 10,
        totalPrsMerged: 3,
        totalIssuesClosed: 5,
        velocity: 3,
        activeContributors: 3,
        prQueueLength: 5,
        issueBacklog: 10,
      });
    });

    it('should calculate average PR cycle time correctly', async () => {
      (mockPrisma.commit.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.pullRequest.count as jest.Mock).mockResolvedValue(0);
      
      (mockPrisma.pullRequest.findMany as jest.Mock).mockResolvedValue([
        { 
          createdAt: new Date('2025-11-14T00:00:00Z'),
          mergedAt: new Date('2025-11-14T10:00:00Z') // 10 hours
        },
        { 
          createdAt: new Date('2025-11-14T00:00:00Z'),
          mergedAt: new Date('2025-11-14T20:00:00Z') // 20 hours
        },
        { 
          createdAt: new Date('2025-11-14T00:00:00Z'),
          mergedAt: new Date('2025-11-15T06:00:00Z') // 30 hours
        },
      ]);

      (mockPrisma.issue.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.commit.findMany as jest.Mock).mockResolvedValue([]);

      const result = await metricsService.calculateTeamMetrics(testOrgId, testDate);

      expect(result.avgPrCycleTime).toBe(20); // (10 + 20 + 30) / 3 = 20
    });
  });

  describe('calculateRepositoryMetrics', () => {
    it('should calculate repository metrics correctly', async () => {
      (mockPrisma.commit.findMany as jest.Mock).mockResolvedValue([
        {
          additions: 100,
          deletions: 50,
          filesChanged: 5,
          authorId: 'user1',
        },
        {
          additions: 200,
          deletions: 75,
          filesChanged: 10,
          authorId: 'user2',
        },
        {
          additions: 150,
          deletions: 60,
          filesChanged: 8,
          authorId: 'user1', // user1 has 2 commits
        },
      ]);

      // Mock PRs for filesChanged
      (mockPrisma.pullRequest.findMany as jest.Mock).mockResolvedValue([
        { filesChanged: 5 },
        { filesChanged: 10 },
        { filesChanged: 8 },
      ]);

      (mockPrisma.pullRequest.count as jest.Mock)
        .mockResolvedValueOnce(5) // prsOpened
        .mockResolvedValueOnce(3) // prsMerged
        .mockResolvedValueOnce(1); // prsClosed

      (mockPrisma.issue.count as jest.Mock)
        .mockResolvedValueOnce(4) // issuesOpened
        .mockResolvedValueOnce(2); // issuesClosed

      const result = await metricsService.calculateRepositoryMetrics(testRepoId, testDate);

      expect(result).toMatchObject({
        repositoryId: testRepoId,
        commits: 3,
        prsOpened: 5,
        prsMerged: 3,
        prsClosed: 1,
        issuesOpened: 4,
        issuesClosed: 2,
        uniqueContributors: 2, // user1 and user2
        topContributor: 'user1', // user1 has 2 commits
        linesAdded: 450,
        linesDeleted: 185,
        filesChanged: 23,
      });
    });

    it('should handle repositories with no activity', async () => {
      (mockPrisma.commit.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.pullRequest.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.pullRequest.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.issue.count as jest.Mock).mockResolvedValue(0);

      const result = await metricsService.calculateRepositoryMetrics(testRepoId, testDate);

      expect(result).toMatchObject({
        commits: 0,
        prsOpened: 0,
        prsMerged: 0,
        issuesOpened: 0,
        uniqueContributors: 0,
        topContributor: undefined,
      });
    });
  });

  describe('storeDeveloperMetrics', () => {
    it('should upsert developer metrics', async () => {
      const metrics: DeveloperMetricsResult = {
        userId: testUserId,
        organizationId: testOrgId,
        date: testDate,
        commits: 10,
        linesAdded: 500,
        linesDeleted: 200,
        filesChanged: 25,
        prsOpened: 2,
        prsMerged: 1,
        prsClosed: 0,
        avgPrSize: 350,
        prsReviewed: 3,
        reviewComments: 10,
        avgReviewTime: 30,
        issuesOpened: 1,
        issuesResolved: 2,
        avgIssueTime: 12,
        commitsOnWeekend: 2,
        commitsLateNight: 1,
        avgCommitTime: '14:30',
        avgCodeQuality: 85,
        bugIntroduced: 0,
        bugFixed: 1,
      };

      (mockPrisma.developerMetric.upsert as jest.Mock).mockResolvedValue(metrics);

      await metricsService.storeDeveloperMetrics(metrics);

      expect(mockPrisma.developerMetric.upsert).toHaveBeenCalledWith({
        where: {
          userId_organizationId_date: {
            userId: testUserId,
            organizationId: testOrgId,
            date: testDate,
          },
        },
        create: metrics,
        update: expect.objectContaining({
          commits: 10,
          linesAdded: 500,
        }),
      });
    });
  });

  describe('storeTeamMetrics', () => {
    it('should upsert team metrics', async () => {
      const metrics: TeamMetricsResult = {
        organizationId: testOrgId,
        date: testDate,
        velocity: 15,
        avgPrCycleTime: 24,
        avgReviewTime: 2,
        totalCommits: 100,
        totalPrsOpened: 20,
        totalPrsMerged: 15,
        totalIssuesClosed: 10,
        buildSuccessRate: 95,
        testCoverage: 80,
        codeQualityScore: 85,
        deploymentFrequency: 5,
        deploymentSuccessRate: 98,
        meanTimeToRecovery: 30,
        changeFailureRate: 2,
        activeContributors: 8,
        prReviewCoverage: 90,
        knowledgeDistribution: 0.75,
        prQueueLength: 5,
        avgPrQueueTime: 12,
        issueBacklog: 25,
      };

      (mockPrisma.teamMetric.upsert as jest.Mock).mockResolvedValue(metrics);

      await metricsService.storeTeamMetrics(metrics);

      expect(mockPrisma.teamMetric.upsert).toHaveBeenCalledWith({
        where: {
          organizationId_date: {
            organizationId: testOrgId,
            date: testDate,
          },
        },
        create: metrics,
        update: expect.objectContaining({
          velocity: 15,
          totalCommits: 100,
        }),
      });
    });
  });

  describe('storeRepositoryMetrics', () => {
    it('should upsert repository metrics', async () => {
      const metrics: RepositoryMetricsResult = {
        repositoryId: testRepoId,
        date: testDate,
        commits: 50,
        prsOpened: 10,
        prsMerged: 8,
        prsClosed: 2,
        issuesOpened: 5,
        issuesClosed: 4,
        uniqueContributors: 6,
        topContributor: 'user-123',
        linesAdded: 2000,
        linesDeleted: 800,
        filesChanged: 120,
        stars: 150,
        forks: 25,
        watchers: 50,
      };

      (mockPrisma.repositoryStats.upsert as jest.Mock).mockResolvedValue(metrics);

      await metricsService.storeRepositoryMetrics(metrics);

      expect(mockPrisma.repositoryStats.upsert).toHaveBeenCalledWith({
        where: {
          repoId_date: {
            repoId: testRepoId,
            date: testDate,
          },
        },
        create: expect.objectContaining({
          repoId: testRepoId,
          commits: 50,
        }),
        update: expect.objectContaining({
          commits: 50,
          prsOpened: 10,
        }),
      });
    });
  });
});
