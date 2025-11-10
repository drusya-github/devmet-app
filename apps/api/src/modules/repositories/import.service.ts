/**
 * Import Service
 * Handles importing historical data from GitHub (commits, PRs, issues)
 */

import type { Octokit } from '@octokit/rest';
import { prisma } from '../../database/prisma.client';
import { decryptGitHubToken } from '../../utils/encryption';
import { logger } from '../../config/logger';
import { AppError } from '../../middleware/error-handler';
import type { Repository } from '@prisma/client';

interface ImportProgress {
  commits: number;
  pullRequests: number;
  issues: number;
  total: number;
}

interface ImportResult {
  commits: number;
  pullRequests: number;
  issues: number;
  errors: string[];
}

export class ImportService {
  /**
   * Import historical data for a repository
   * Fetches commits, pull requests, and issues from the last N days
   *
   * @param repoId - Repository ID
   * @param days - Number of days to import (default: 90)
   * @returns Import result with counts
   */
  async importHistoricalData(repoId: string, days: number = 90): Promise<ImportResult> {
    // Fetch repository with user info
    const repo = await prisma.repository.findUnique({
      where: { id: repoId },
      include: {
        organization: {
          include: {
            members: {
              take: 1, // Get first user to use their token
              include: {
                user: {
                  select: {
                    id: true,
                    accessToken: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!repo) {
      throw new AppError(404, 'Repository not found');
    }

    // Get user with access token
    const userOrg = repo.organization.members[0];
    if (!userOrg || !userOrg.user.accessToken) {
      throw new AppError(401, 'No user with GitHub token found for this repository');
    }

    // Decrypt GitHub token
    let githubToken: string;
    try {
      githubToken = decryptGitHubToken(userOrg.user.accessToken);
    } catch (error) {
      logger.error('Failed to decrypt GitHub token for import', {
        repoId,
        userId: userOrg.user.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new AppError(401, 'Failed to decrypt GitHub token. Please re-authenticate.');
    }

    // Initialize Octokit
    const { Octokit } = await import('@octokit/rest');
    const octokit = new Octokit({ auth: githubToken });

    // Update status to SYNCING
    await prisma.repository.update({
      where: { id: repoId },
      data: { syncStatus: 'SYNCING' },
    });

    // Calculate date range
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const errors: string[] = [];
    let commitsCount = 0;
    let pullRequestsCount = 0;
    let issuesCount = 0;

    try {
      logger.info('Starting historical import', {
        repoId,
        repoName: repo.fullName,
        days,
        since: since.toISOString(),
      });

      // Import commits, PRs, and issues in parallel (with rate limiting handled internally)
      const [commitsResult, prsResult, issuesResult] = await Promise.allSettled([
        this.importCommits(octokit, repo, since),
        this.importPullRequests(octokit, repo, since),
        this.importIssues(octokit, repo, since),
      ]);

      // Process results
      if (commitsResult.status === 'fulfilled') {
        commitsCount = commitsResult.value;
      } else {
        const error = commitsResult.reason?.message || 'Unknown error';
        errors.push(`Commits import failed: ${error}`);
        logger.error('Commits import failed', {
          repoId,
          error: commitsResult.reason,
        });
      }

      if (prsResult.status === 'fulfilled') {
        pullRequestsCount = prsResult.value;
      } else {
        const error = prsResult.reason?.message || 'Unknown error';
        errors.push(`Pull requests import failed: ${error}`);
        logger.error('Pull requests import failed', {
          repoId,
          error: prsResult.reason,
        });
      }

      if (issuesResult.status === 'fulfilled') {
        issuesCount = issuesResult.value;
      } else {
        const error = issuesResult.reason?.message || 'Unknown error';
        errors.push(`Issues import failed: ${error}`);
        logger.error('Issues import failed', {
          repoId,
          error: issuesResult.reason,
        });
      }

      // Update status to ACTIVE if at least one import succeeded
      if (commitsCount > 0 || pullRequestsCount > 0 || issuesCount > 0) {
        await prisma.repository.update({
          where: { id: repoId },
          data: {
            syncStatus: 'ACTIVE',
            lastSyncedAt: new Date(),
          },
        });

        logger.info('Historical import completed', {
          repoId,
          commits: commitsCount,
          pullRequests: pullRequestsCount,
          issues: issuesCount,
          errors: errors.length,
        });
      } else {
        // All imports failed
        await prisma.repository.update({
          where: { id: repoId },
          data: { syncStatus: 'ERROR' },
        });
        throw new AppError(500, 'All imports failed. Check logs for details.');
      }

      return {
        commits: commitsCount,
        pullRequests: pullRequestsCount,
        issues: issuesCount,
        errors,
      };
    } catch (error) {
      logger.error('Historical import failed', {
        repoId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Update status to ERROR
      await prisma.repository.update({
        where: { id: repoId },
        data: { syncStatus: 'ERROR' },
      });

      throw error;
    }
  }

  /**
   * Import commits from GitHub
   *
   * @param octokit - Authenticated Octokit instance
   * @param repo - Repository record
   * @param since - Date to import from
   * @returns Number of commits imported
   */
  private async importCommits(
    octokit: Octokit,
    repo: Repository,
    since: Date
  ): Promise<number> {
    const [owner, repoName] = repo.fullName.split('/');
    let page = 1;
    let hasMore = true;
    let totalImported = 0;
    const perPage = 100;

    logger.debug('Starting commits import', {
      repoId: repo.id,
      repoName: repo.fullName,
      since: since.toISOString(),
    });

    while (hasMore) {
      try {
        // Check rate limit before making request
        await this.waitForRateLimit(octokit);

        const { data: commits, headers } = await octokit.rest.repos.listCommits({
          owner,
          repo: repoName,
          since: since.toISOString(),
          per_page: perPage,
          page,
        });

        if (commits.length === 0) {
          hasMore = false;
          break;
        }

        // Process batch
        const imported = await this.processCommitBatch(repo, commits);
        totalImported += imported;

        logger.debug('Imported commits batch', {
          repoId: repo.id,
          page,
          count: commits.length,
          imported,
          total: totalImported,
        });

        // Check if we've reached the end
        if (commits.length < perPage) {
          hasMore = false;
        } else {
          page++;
        }

        // Small delay between pages to be respectful
        await this.delay(100);
      } catch (error: any) {
        if (error.status === 404) {
          logger.warn('Repository not found or no access', {
            repoId: repo.id,
            owner,
            repoName,
          });
          hasMore = false;
          break;
        }

        if (error.status === 403) {
          logger.error('Rate limit exceeded during commits import', {
            repoId: repo.id,
            error: error.message,
          });
          // Wait for rate limit reset
          await this.waitForRateLimitReset(octokit);
          // Retry current page
          continue;
        }

        throw error;
      }
    }

    logger.info('Commits import completed', {
      repoId: repo.id,
      total: totalImported,
    });

    return totalImported;
  }

  /**
   * Process a batch of commits and store them in the database
   *
   * @param repo - Repository record
   * @param commits - Array of commit objects from GitHub API
   * @returns Number of commits actually imported (excluding duplicates)
   */
  private async processCommitBatch(repo: Repository, commits: any[]): Promise<number> {
    const commitData = [];

    for (const commit of commits) {
      // Find or create author
      let authorId: string | null = null;
      let authorGithubId: bigint | null = null;

      if (commit.author) {
        const author = await this.findOrCreateAuthor(commit.author);
        if (author) {
          authorId = author.id;
          authorGithubId = BigInt(commit.author.id);
        }
      }

      // Get commit stats if available (requires additional API call)
      // For now, we'll set to 0 and let webhooks update them
      const additions = 0;
      const deletions = 0;

      commitData.push({
        githubId: commit.sha,
        sha: commit.sha,
        message: commit.commit.message || '',
        repoId: repo.id,
        authorId,
        authorGithubId: authorGithubId || null,
        authorName: commit.commit.author?.name || null,
        authorEmail: commit.commit.author?.email || null,
        additions,
        deletions,
        committedAt: new Date(commit.commit.author.date),
      });
    }

    // Batch insert with skipDuplicates
    const result = await prisma.commit.createMany({
      data: commitData,
      skipDuplicates: true,
    });

    return result.count;
  }

  /**
   * Import pull requests from GitHub
   *
   * @param octokit - Authenticated Octokit instance
   * @param repo - Repository record
   * @param since - Date to import from
   * @returns Number of PRs imported
   */
  private async importPullRequests(
    octokit: Octokit,
    repo: Repository,
    since: Date
  ): Promise<number> {
    const [owner, repoName] = repo.fullName.split('/');
    let page = 1;
    let hasMore = true;
    let totalImported = 0;
    const perPage = 100;

    logger.debug('Starting pull requests import', {
      repoId: repo.id,
      repoName: repo.fullName,
      since: since.toISOString(),
    });

    while (hasMore) {
      try {
        await this.waitForRateLimit(octokit);

        const { data: prs } = await octokit.rest.pulls.list({
          owner,
          repo: repoName,
          state: 'all', // Get all PRs (open, closed, merged)
          sort: 'updated',
          direction: 'desc',
          per_page: perPage,
          page,
        });

        if (prs.length === 0) {
          hasMore = false;
          break;
        }

        // Filter PRs by date (only those updated since the target date)
        const filteredPRs = prs.filter((pr) => {
          const updatedAt = new Date(pr.updated_at);
          return updatedAt >= since;
        });

        // If we got PRs but none match the date filter, we might be past the date range
        if (filteredPRs.length === 0 && prs.length > 0) {
          // Check if the oldest PR is before our date range
          const oldestPR = prs[prs.length - 1];
          const oldestDate = new Date(oldestPR.updated_at);
          if (oldestDate < since) {
            hasMore = false;
            break;
          }
        }

        if (filteredPRs.length > 0) {
          const imported = await this.processPullRequestBatch(repo, filteredPRs);
          totalImported += imported;

          logger.debug('Imported pull requests batch', {
            repoId: repo.id,
            page,
            count: filteredPRs.length,
            imported,
            total: totalImported,
          });
        }

        if (prs.length < perPage) {
          hasMore = false;
        } else {
          page++;
        }

        await this.delay(100);
      } catch (error: any) {
        if (error.status === 404) {
          logger.warn('Repository not found or no access', {
            repoId: repo.id,
            owner,
            repoName,
          });
          hasMore = false;
          break;
        }

        if (error.status === 403) {
          logger.error('Rate limit exceeded during PRs import', {
            repoId: repo.id,
            error: error.message,
          });
          await this.waitForRateLimitReset(octokit);
          continue;
        }

        throw error;
      }
    }

    logger.info('Pull requests import completed', {
      repoId: repo.id,
      total: totalImported,
    });

    return totalImported;
  }

  /**
   * Process a batch of pull requests
   *
   * @param repo - Repository record
   * @param prs - Array of PR objects from GitHub API
   * @returns Number of PRs actually imported
   */
  private async processPullRequestBatch(repo: Repository, prs: any[]): Promise<number> {
    const prData = [];

    for (const pr of prs) {
      // Find or create author
      let authorId: string | null = null;
      let authorGithubId: bigint | null = null;

      if (pr.user) {
        const author = await this.findOrCreateAuthor(pr.user);
        if (author) {
          authorId = author.id;
          authorGithubId = BigInt(pr.user.id);
        }
      }

      // Determine state
      let state: 'OPEN' | 'CLOSED' | 'MERGED' = 'OPEN';
      if (pr.merged_at) {
        state = 'MERGED';
      } else if (pr.state === 'closed') {
        state = 'CLOSED';
      } else {
        state = 'OPEN';
      }

      prData.push({
        githubId: BigInt(pr.id),
        number: pr.number,
        title: pr.title || '',
        state,
        repoId: repo.id,
        authorId,
        authorGithubId: authorGithubId || null,
        additions: pr.additions || 0,
        deletions: pr.deletions || 0,
        filesChanged: pr.changed_files || 0,
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
        createdAt: new Date(pr.created_at),
        updatedAt: new Date(pr.updated_at),
      });
    }

    // Use upsert to handle updates
    let imported = 0;
    for (const data of prData) {
      try {
        await prisma.pullRequest.upsert({
          where: { githubId: data.githubId },
          create: data,
          update: {
            title: data.title,
            state: data.state,
            additions: data.additions,
            deletions: data.deletions,
            filesChanged: data.filesChanged,
            mergedAt: data.mergedAt,
            closedAt: data.closedAt,
            updatedAt: data.updatedAt,
          },
        });
        imported++;
      } catch (error) {
        logger.warn('Failed to upsert PR', {
          repoId: repo.id,
          prNumber: data.number,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return imported;
  }

  /**
   * Import issues from GitHub
   *
   * @param octokit - Authenticated Octokit instance
   * @param repo - Repository record
   * @param since - Date to import from
   * @returns Number of issues imported
   */
  private async importIssues(
    octokit: Octokit,
    repo: Repository,
    since: Date
  ): Promise<number> {
    const [owner, repoName] = repo.fullName.split('/');
    let page = 1;
    let hasMore = true;
    let totalImported = 0;
    const perPage = 100;

    logger.debug('Starting issues import', {
      repoId: repo.id,
      repoName: repo.fullName,
      since: since.toISOString(),
    });

    while (hasMore) {
      try {
        await this.waitForRateLimit(octokit);

        const { data: issues } = await octokit.rest.issues.listForRepo({
          owner,
          repo: repoName,
          state: 'all',
          sort: 'updated',
          direction: 'desc',
          per_page: perPage,
          page,
        });

        // Filter out pull requests (GitHub API returns PRs in issues endpoint)
        const actualIssues = issues.filter((issue) => !issue.pull_request);

        if (actualIssues.length === 0) {
          hasMore = false;
          break;
        }

        // Filter by date
        const filteredIssues = actualIssues.filter((issue) => {
          const updatedAt = new Date(issue.updated_at);
          return updatedAt >= since;
        });

        if (filteredIssues.length === 0 && actualIssues.length > 0) {
          const oldestIssue = actualIssues[actualIssues.length - 1];
          const oldestDate = new Date(oldestIssue.updated_at);
          if (oldestDate < since) {
            hasMore = false;
            break;
          }
        }

        if (filteredIssues.length > 0) {
          const imported = await this.processIssueBatch(repo, filteredIssues);
          totalImported += imported;

          logger.debug('Imported issues batch', {
            repoId: repo.id,
            page,
            count: filteredIssues.length,
            imported,
            total: totalImported,
          });
        }

        if (issues.length < perPage) {
          hasMore = false;
        } else {
          page++;
        }

        await this.delay(100);
      } catch (error: any) {
        if (error.status === 404) {
          logger.warn('Repository not found or no access', {
            repoId: repo.id,
            owner,
            repoName,
          });
          hasMore = false;
          break;
        }

        if (error.status === 403) {
          logger.error('Rate limit exceeded during issues import', {
            repoId: repo.id,
            error: error.message,
          });
          await this.waitForRateLimitReset(octokit);
          continue;
        }

        throw error;
      }
    }

    logger.info('Issues import completed', {
      repoId: repo.id,
      total: totalImported,
    });

    return totalImported;
  }

  /**
   * Process a batch of issues
   *
   * @param repo - Repository record
   * @param issues - Array of issue objects from GitHub API
   * @returns Number of issues actually imported
   */
  private async processIssueBatch(repo: Repository, issues: any[]): Promise<number> {
    const issueData = [];

    for (const issue of issues) {
      // Find or create author
      let authorId: string | null = null;
      let authorGithubId: bigint | null = null;

      if (issue.user) {
        const author = await this.findOrCreateAuthor(issue.user);
        if (author) {
          authorId = author.id;
          authorGithubId = BigInt(issue.user.id);
        }
      }

      const issueState: 'OPEN' | 'CLOSED' = issue.state === 'open' ? 'OPEN' : 'CLOSED';
      
      issueData.push({
        githubId: BigInt(issue.id),
        number: issue.number,
        title: issue.title || '',
        state: issueState,
        repoId: repo.id,
        authorId,
        authorGithubId: authorGithubId || null,
        closedAt: issue.closed_at ? new Date(issue.closed_at) : null,
        createdAt: new Date(issue.created_at),
      });
    }

    // Use upsert to handle updates
    let imported = 0;
    for (const data of issueData) {
      try {
        await prisma.issue.upsert({
          where: { githubId: data.githubId },
          create: data,
          update: {
            title: data.title,
            state: data.state as 'OPEN' | 'CLOSED',
            closedAt: data.closedAt,
          },
        });
        imported++;
      } catch (error) {
        logger.warn('Failed to upsert issue', {
          repoId: repo.id,
          issueNumber: data.number,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return imported;
  }

  /**
   * Find or create a user from GitHub user data
   *
   * @param githubUser - GitHub user object
   * @returns User record or null
   */
  private async findOrCreateAuthor(githubUser: any): Promise<{ id: string } | null> {
    if (!githubUser || !githubUser.id) {
      return null;
    }

    try {
      // Try to find existing user by GitHub ID
      const existing = await prisma.user.findUnique({
        where: { githubId: BigInt(githubUser.id) },
        select: { id: true },
      });

      if (existing) {
        return existing;
      }

      // User doesn't exist, but we can't create them without OAuth
      // Just return null - the authorGithubId will be stored for later mapping
      return null;
    } catch (error) {
      logger.warn('Failed to find or create author', {
        githubUserId: githubUser.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Wait for rate limit if needed
   *
   * @param octokit - Octokit instance
   */
  private async waitForRateLimit(octokit: Octokit): Promise<void> {
    try {
      const { data } = await octokit.rateLimit.get();
      const remaining = data.rate.remaining;
      const resetTime = new Date(data.rate.reset * 1000);

      if (remaining < 100) {
        const waitTime = Math.max(0, resetTime.getTime() - Date.now());
        if (waitTime > 0) {
          logger.warn('Rate limit low, waiting', {
            remaining,
            waitTimeMs: waitTime,
            resetTime: resetTime.toISOString(),
          });
          await this.delay(waitTime);
        }
      }
    } catch (error) {
      // If rate limit check fails, continue anyway
      logger.debug('Failed to check rate limit', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Wait for rate limit reset
   *
   * @param octokit - Octokit instance
   */
  private async waitForRateLimitReset(octokit: Octokit): Promise<void> {
    try {
      const { data } = await octokit.rateLimit.get();
      const resetTime = new Date(data.rate.reset * 1000);
      const waitTime = Math.max(0, resetTime.getTime() - Date.now() + 1000); // Add 1s buffer

      if (waitTime > 0) {
        logger.warn('Rate limit exceeded, waiting for reset', {
          waitTimeMs: waitTime,
          resetTime: resetTime.toISOString(),
        });
        await this.delay(waitTime);
      }
    } catch (error) {
      // If rate limit check fails, wait a default amount
      logger.warn('Failed to check rate limit, waiting default time', {
        error: error instanceof Error ? error.message : String(error),
      });
      await this.delay(60000); // Wait 1 minute
    }
  }

  /**
   * Delay helper
   *
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const importService = new ImportService();

