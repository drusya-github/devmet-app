/**
 * DevMetrics - Metrics Service (CORRECTED VERSION)
 * Core business logic for calculating developer, team, and repository metrics
 * 
 * NOTE: This version is adapted to work with the current Prisma schema
 * which is missing: filesChanged (on Commit), cycleTimeHours, resolutionTimeHours
 */

import { PrismaClient } from '@prisma/client';
import type {
  DeveloperMetricsResult,
  TeamMetricsResult,
  RepositoryMetricsResult,
  MetricsCalculationContext,
  BatchCalculationOptions,
  IncrementalCalculationOptions,
  TimeWindow,
} from './metrics.types';

export class MetricsService {
  constructor(private prisma: PrismaClient) {}

  // ============================================
  // DEVELOPER METRICS
  // ============================================

  /**
   * Calculate metrics for a specific developer on a specific date
   */
  async calculateDeveloperMetrics(
    userId: string,
    organizationId: string,
    date: Date
  ): Promise<DeveloperMetricsResult> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all commits by this user on this date
    const commits = await this.prisma.commit.findMany({
      where: {
        authorId: userId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        repository: {
          organizationId,
        },
      },
      select: {
        additions: true,
        deletions: true,
        createdAt: true,
      },
    });

    // Get PR metrics
    const prsOpened = await this.prisma.pullRequest.count({
      where: {
        authorId: userId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        repository: {
          organizationId,
        },
      },
    });

    const prsMerged = await this.prisma.pullRequest.count({
      where: {
        authorId: userId,
        state: 'MERGED',
        mergedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        repository: {
          organizationId,
        },
      },
    });

    const prsClosed = await this.prisma.pullRequest.count({
      where: {
        authorId: userId,
        state: 'CLOSED',
        closedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        repository: {
          organizationId,
        },
      },
    });

    // Calculate average PR size and get filesChanged from PRs
    const prs = await this.prisma.pullRequest.findMany({
      where: {
        authorId: userId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        repository: {
          organizationId,
        },
      },
      select: {
        additions: true,
        deletions: true,
        filesChanged: true,
      },
    });

    const avgPrSize =
      prs.length > 0
        ? Math.round(
            prs.reduce((sum, pr) => sum + (pr.additions || 0) + (pr.deletions || 0), 0) /
              prs.length
          )
        : 0;

    // Sum filesChanged from PRs (since Commit doesn't have this field)
    const filesChangedFromPRs = prs.reduce((sum, pr) => sum + (pr.filesChanged || 0), 0);

    // Get issue metrics
    const issuesOpened = await this.prisma.issue.count({
      where: {
        authorId: userId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        repository: {
          organizationId,
        },
      },
    });

    // Calculate issue resolution time manually
    const closedIssues = await this.prisma.issue.findMany({
      where: {
        authorId: userId,
        state: 'CLOSED',
        closedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        repository: {
          organizationId,
        },
      },
      select: {
        createdAt: true,
        closedAt: true,
      },
    });

    const issuesResolved = closedIssues.length;
    const avgIssueTime =
      issuesResolved > 0
        ? Math.round(
            closedIssues.reduce((sum, issue) => {
              const hours = issue.closedAt
                ? (issue.closedAt.getTime() - issue.createdAt.getTime()) / (1000 * 60 * 60)
                : 0;
              return sum + hours;
            }, 0) / issuesResolved
          )
        : 0;

    // Calculate activity patterns
    const weekendCommits = commits.filter((c) => {
      const day = c.createdAt.getDay();
      return day === 0 || day === 6; // Sunday or Saturday
    }).length;

    const lateNightCommits = commits.filter((c) => {
      const hour = c.createdAt.getUTCHours();
      return hour >= 22 || hour < 6; // After 10 PM or before 6 AM
    }).length;

    // Calculate average commit time
    let avgCommitTime: string | undefined;
    if (commits.length > 0) {
      const totalMinutes = commits.reduce((sum, c) => {
        return sum + c.createdAt.getHours() * 60 + c.createdAt.getMinutes();
      }, 0);
      const avgMinutes = Math.round(totalMinutes / commits.length);
      const hours = Math.floor(avgMinutes / 60);
      const minutes = avgMinutes % 60;
      avgCommitTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    // Aggregate commit metrics
    const commitMetrics = commits.reduce(
      (acc, commit) => ({
        additions: acc.additions + (commit.additions || 0),
        deletions: acc.deletions + (commit.deletions || 0),
      }),
      { additions: 0, deletions: 0 }
    );

    return {
      userId,
      organizationId,
      date: startOfDay,
      commits: commits.length,
      linesAdded: commitMetrics.additions,
      linesDeleted: commitMetrics.deletions,
      filesChanged: filesChangedFromPRs,
      prsOpened,
      prsMerged,
      prsClosed,
      avgPrSize,
      prsReviewed: 0, // TODO: Implement when Review model exists
      reviewComments: 0, // TODO: Implement when Review model exists
      avgReviewTime: 0, // TODO: Implement when Review model exists
      issuesOpened,
      issuesResolved,
      avgIssueTime,
      commitsOnWeekend: weekendCommits,
      commitsLateNight: lateNightCommits,
      avgCommitTime,
      avgCodeQuality: undefined, // TODO: Implement from AI reviews
      bugIntroduced: 0, // TODO: Implement from issue labels
      bugFixed: 0, // TODO: Implement from issue labels
    };
  }

  /**
   * Store developer metrics in database
   */
  async storeDeveloperMetrics(metrics: DeveloperMetricsResult): Promise<void> {
    await this.prisma.developerMetric.upsert({
      where: {
        userId_organizationId_date: {
          userId: metrics.userId,
          organizationId: metrics.organizationId,
          date: metrics.date,
        },
      },
      create: metrics,
      update: {
        commits: metrics.commits,
        linesAdded: metrics.linesAdded,
        linesDeleted: metrics.linesDeleted,
        filesChanged: metrics.filesChanged,
        prsOpened: metrics.prsOpened,
        prsMerged: metrics.prsMerged,
        prsClosed: metrics.prsClosed,
        avgPrSize: metrics.avgPrSize,
        prsReviewed: metrics.prsReviewed,
        reviewComments: metrics.reviewComments,
        avgReviewTime: metrics.avgReviewTime,
        issuesOpened: metrics.issuesOpened,
        issuesResolved: metrics.issuesResolved,
        avgIssueTime: metrics.avgIssueTime,
        commitsOnWeekend: metrics.commitsOnWeekend,
        commitsLateNight: metrics.commitsLateNight,
        avgCommitTime: metrics.avgCommitTime,
        avgCodeQuality: metrics.avgCodeQuality,
        bugIntroduced: metrics.bugIntroduced,
        bugFixed: metrics.bugFixed,
      },
    });
  }

  // ============================================
  // TEAM METRICS
  // ============================================

  /**
   * Calculate team metrics for an organization on a specific date
   */
  async calculateTeamMetrics(
    organizationId: string,
    date: Date
  ): Promise<TeamMetricsResult> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get total commits
    const totalCommits = await this.prisma.commit.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        repository: {
          organizationId,
        },
      },
    });

    // Get PR metrics
    const totalPrsOpened = await this.prisma.pullRequest.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        repository: {
          organizationId,
        },
      },
    });

    // Get merged PRs and calculate cycle time manually
    const mergedPRs = await this.prisma.pullRequest.findMany({
      where: {
        state: 'MERGED',
        mergedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        repository: {
          organizationId,
        },
      },
      select: {
        createdAt: true,
        mergedAt: true,
      },
    });

    const totalPrsMerged = mergedPRs.length;
    const avgPrCycleTime =
      totalPrsMerged > 0
        ? Math.round(
            mergedPRs.reduce((sum, pr) => {
              const hours = pr.mergedAt
                ? (pr.mergedAt.getTime() - pr.createdAt.getTime()) / (1000 * 60 * 60)
                : 0;
              return sum + hours;
            }, 0) / totalPrsMerged
          )
        : 0;

    // Get issue metrics
    const totalIssuesClosed = await this.prisma.issue.count({
      where: {
        state: 'CLOSED',
        closedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        repository: {
          organizationId,
        },
      },
    });

    // Calculate active contributors
    const uniqueCommitters = await this.prisma.commit.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        repository: {
          organizationId,
        },
        authorId: {
          not: null,
        },
      },
      distinct: ['authorId'],
      select: {
        authorId: true,
      },
    });

    const activeContributors = uniqueCommitters.filter((c) => c.authorId !== null).length;

    // Get current open PRs (bottleneck metric)
    const prQueueLength = await this.prisma.pullRequest.count({
      where: {
        state: 'OPEN',
        repository: {
          organizationId,
        },
      },
    });

    // Get current open issues (backlog metric)
    const issueBacklog = await this.prisma.issue.count({
      where: {
        state: 'OPEN',
        repository: {
          organizationId,
        },
      },
    });

    return {
      organizationId,
      date: startOfDay,
      velocity: totalPrsMerged, // Using PRs merged as velocity metric
      avgPrCycleTime,
      avgReviewTime: 0, // TODO: Implement when Review model exists
      totalCommits,
      totalPrsOpened,
      totalPrsMerged,
      totalIssuesClosed,
      buildSuccessRate: undefined, // TODO: Implement from CI/CD integration
      testCoverage: undefined, // TODO: Implement from code coverage tools
      codeQualityScore: undefined, // TODO: Implement from AI reviews
      deploymentFrequency: 0, // TODO: Implement from deployment tracking
      deploymentSuccessRate: undefined, // TODO: Implement from deployment tracking
      meanTimeToRecovery: undefined, // TODO: Implement from incident tracking
      changeFailureRate: undefined, // TODO: Implement from deployment tracking
      activeContributors,
      prReviewCoverage: undefined, // TODO: Implement when Review model exists
      knowledgeDistribution: undefined, // TODO: Implement file ownership analysis
      prQueueLength,
      avgPrQueueTime: 0, // TODO: Implement from open PR age analysis
      issueBacklog,
    };
  }

  /**
   * Store team metrics in database
   */
  async storeTeamMetrics(metrics: TeamMetricsResult): Promise<void> {
    await this.prisma.teamMetric.upsert({
      where: {
        organizationId_date: {
          organizationId: metrics.organizationId,
          date: metrics.date,
        },
      },
      create: metrics,
      update: {
        velocity: metrics.velocity,
        avgPrCycleTime: metrics.avgPrCycleTime,
        avgReviewTime: metrics.avgReviewTime,
        totalCommits: metrics.totalCommits,
        totalPrsOpened: metrics.totalPrsOpened,
        totalPrsMerged: metrics.totalPrsMerged,
        totalIssuesClosed: metrics.totalIssuesClosed,
        buildSuccessRate: metrics.buildSuccessRate,
        testCoverage: metrics.testCoverage,
        codeQualityScore: metrics.codeQualityScore,
        deploymentFrequency: metrics.deploymentFrequency,
        deploymentSuccessRate: metrics.deploymentSuccessRate,
        meanTimeToRecovery: metrics.meanTimeToRecovery,
        changeFailureRate: metrics.changeFailureRate,
        activeContributors: metrics.activeContributors,
        prReviewCoverage: metrics.prReviewCoverage,
        knowledgeDistribution: metrics.knowledgeDistribution,
        prQueueLength: metrics.prQueueLength,
        avgPrQueueTime: metrics.avgPrQueueTime,
        issueBacklog: metrics.issueBacklog,
      },
    });
  }

  // ============================================
  // REPOSITORY METRICS
  // ============================================

  /**
   * Calculate metrics for a specific repository on a specific date
   */
  async calculateRepositoryMetrics(
    repositoryId: string,
    date: Date
  ): Promise<RepositoryMetricsResult> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get commit metrics
    const commits = await this.prisma.commit.findMany({
      where: {
        repoId: repositoryId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        additions: true,
        deletions: true,
        authorId: true,
      },
    });

    // Get filesChanged from PRs (not available on commits)
    const prsForFileCount = await this.prisma.pullRequest.findMany({
      where: {
        repoId: repositoryId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        filesChanged: true,
      },
    });

    const filesChanged = prsForFileCount.reduce((sum, pr) => sum + (pr.filesChanged || 0), 0);

    // Get PR metrics
    const prsOpened = await this.prisma.pullRequest.count({
      where: {
        repoId: repositoryId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const prsMerged = await this.prisma.pullRequest.count({
      where: {
        repoId: repositoryId,
        state: 'MERGED',
        mergedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const prsClosed = await this.prisma.pullRequest.count({
      where: {
        repoId: repositoryId,
        state: 'CLOSED',
        closedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Get issue metrics
    const issuesOpened = await this.prisma.issue.count({
      where: {
        repoId: repositoryId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const issuesClosed = await this.prisma.issue.count({
      where: {
        repoId: repositoryId,
        state: 'CLOSED',
        closedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Calculate unique contributors
    const uniqueContributors = new Set(
      commits.filter((c) => c.authorId !== null).map((c) => c.authorId)
    ).size;

    // Find top contributor (most commits)
    const contributorCounts = commits.reduce((acc, commit) => {
      if (commit.authorId) {
        acc[commit.authorId] = (acc[commit.authorId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const topContributor =
      Object.keys(contributorCounts).length > 0
        ? Object.entries(contributorCounts).reduce((a, b) => (b[1] > a[1] ? b : a))[0]
        : undefined;

    // Aggregate code changes
    const codeChanges = commits.reduce(
      (acc, commit) => ({
        additions: acc.additions + (commit.additions || 0),
        deletions: acc.deletions + (commit.deletions || 0),
      }),
      { additions: 0, deletions: 0 }
    );

    return {
      repositoryId,
      date: startOfDay,
      commits: commits.length,
      prsOpened,
      prsMerged,
      prsClosed,
      issuesOpened,
      issuesClosed,
      uniqueContributors,
      topContributor,
      linesAdded: codeChanges.additions,
      linesDeleted: codeChanges.deletions,
      filesChanged,
      stars: undefined, // TODO: Fetch from GitHub API
      forks: undefined, // TODO: Fetch from GitHub API
      watchers: undefined, // TODO: Fetch from GitHub API
    };
  }

  /**
   * Store repository metrics in database
   */
  async storeRepositoryMetrics(metrics: RepositoryMetricsResult): Promise<void> {
    await this.prisma.repositoryStats.upsert({
      where: {
        repoId_date: {
          repoId: metrics.repositoryId,
          date: metrics.date,
        },
      },
      create: {
        repoId: metrics.repositoryId,
        date: metrics.date,
        commits: metrics.commits,
        prsOpened: metrics.prsOpened,
        prsMerged: metrics.prsMerged,
        prsClosed: metrics.prsClosed,
        issuesOpened: metrics.issuesOpened,
        issuesClosed: metrics.issuesClosed,
        uniqueContributors: metrics.uniqueContributors,
        topContributor: metrics.topContributor,
        linesAdded: metrics.linesAdded,
        linesDeleted: metrics.linesDeleted,
        filesChanged: metrics.filesChanged,
        stars: metrics.stars,
        forks: metrics.forks,
        watchers: metrics.watchers,
      },
      update: {
        commits: metrics.commits,
        prsOpened: metrics.prsOpened,
        prsMerged: metrics.prsMerged,
        prsClosed: metrics.prsClosed,
        issuesOpened: metrics.issuesOpened,
        issuesClosed: metrics.issuesClosed,
        uniqueContributors: metrics.uniqueContributors,
        topContributor: metrics.topContributor,
        linesAdded: metrics.linesAdded,
        linesDeleted: metrics.linesDeleted,
        filesChanged: metrics.filesChanged,
        stars: metrics.stars,
        forks: metrics.forks,
        watchers: metrics.watchers,
      },
    });
  }

  // ============================================
  // BATCH & INCREMENTAL CALCULATIONS
  // ============================================

  /**
   * Calculate metrics incrementally for new data
   * This is called by the queue worker when new events are processed
   */
  async calculateIncrementalMetrics(
    options: IncrementalCalculationOptions
  ): Promise<void> {
    const { organizationId, date, entities } = options;

    // Calculate team metrics for the day
    const teamMetrics = await this.calculateTeamMetrics(organizationId, date);
    await this.storeTeamMetrics(teamMetrics);

    // Calculate developer metrics for specific users or all active users
    const userIds = entities?.userIds || await this.getActiveUserIds(organizationId, date);
    
    for (const userId of userIds) {
      try {
        const devMetrics = await this.calculateDeveloperMetrics(userId, organizationId, date);
        await this.storeDeveloperMetrics(devMetrics);
      } catch (error) {
        console.error(`Failed to calculate metrics for user ${userId}:`, error);
        // Continue with other users
      }
    }

    // Calculate repository metrics for specific repos or all active repos
    const repoIds = entities?.repositoryIds || await this.getActiveRepositoryIds(organizationId, date);
    
    for (const repoId of repoIds) {
      try {
        const repoMetrics = await this.calculateRepositoryMetrics(repoId, date);
        await this.storeRepositoryMetrics(repoMetrics);
      } catch (error) {
        console.error(`Failed to calculate metrics for repo ${repoId}:`, error);
        // Continue with other repositories
      }
    }
  }

  /**
   * Calculate metrics for historical data (batch processing)
   */
  async calculateBatchMetrics(options: BatchCalculationOptions): Promise<void> {
    const { organizationId, startDate, endDate, includeRepositories, recalculate } = options;

    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      try {
        await this.calculateIncrementalMetrics({
          organizationId,
          date: new Date(currentDate),
          entities: includeRepositories
            ? { repositoryIds: includeRepositories }
            : undefined,
        });
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      } catch (error) {
        console.error(`Failed to calculate metrics for ${currentDate.toISOString()}:`, error);
        // Continue with next date
      }
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Get user IDs that were active on a specific date
   */
  private async getActiveUserIds(organizationId: string, date: Date): Promise<string[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const activeUsers = await this.prisma.commit.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        repository: {
          organizationId,
        },
        authorId: {
          not: null,
        },
      },
      distinct: ['authorId'],
      select: {
        authorId: true,
      },
    });

    return activeUsers.filter((u) => u.authorId !== null).map((u) => u.authorId as string);
  }

  /**
   * Get repository IDs that were active on a specific date
   */
  private async getActiveRepositoryIds(organizationId: string, date: Date): Promise<string[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const activeRepos = await this.prisma.commit.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        repository: {
          organizationId,
        },
      },
      distinct: ['repoId'],
      select: {
        repoId: true,
      },
    });

    return activeRepos.map((r) => r.repoId);
  }
}