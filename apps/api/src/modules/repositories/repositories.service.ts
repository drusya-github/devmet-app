/**
 * Repositories service
 * Handles GitHub repository listing, filtering, and caching
 */

import type { Octokit } from '@octokit/rest';
import { prisma } from '../../database/prisma.client';
import { redis, DEFAULT_TTL, deletePattern } from '../../database/redis.client';
import { decryptGitHubToken } from '../../utils/encryption';
import { logger } from '../../config/logger';
import { AppError } from '../../middleware/error-handler';
import { config } from '../../config';
import type {
  ListRepositoriesOptions,
  RepositoryListItem,
  RepositoryListResponse,
  ConnectedRepository,
  BulkConnectResult,
} from './repositories.types';

export class RepositoriesService {
  /**
   * List available GitHub repositories for a user
   * Fetches repositories from GitHub API, filters out already connected repos,
   * and caches results for performance
   *
   * @param userId - User ID
   * @param options - Listing options (pagination, sorting, filtering)
   * @returns Repository list with pagination metadata
   */
  async listAvailableRepositories(
    userId: string,
    options: ListRepositoriesOptions = {}
  ): Promise<RepositoryListResponse> {
    const {
      page = 1,
      perPage = 30,
      type = 'all',
      sort = 'updated',
    } = options;

    // Build cache key
    const cacheKey = `repos:available:${userId}:${type}:${sort}:${page}:${perPage}`;

    // Check cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug('Returning cached repositories', { userId, cacheKey });
      return JSON.parse(cached) as RepositoryListResponse;
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, accessToken: true },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (!user.accessToken) {
      throw new AppError(401, 'GitHub access token not found. Please re-authenticate.');
    }

    // Decrypt GitHub token
    let githubToken: string;
    try {
      githubToken = decryptGitHubToken(user.accessToken);
    } catch (error) {
      logger.error('Failed to decrypt GitHub token', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new AppError(401, 'Failed to decrypt GitHub token. Please re-authenticate.');
    }

    // Initialize Octokit with user's token (dynamic import for ESM compatibility)
    const { Octokit } = await import('@octokit/rest');
    const octokit = new Octokit({ auth: githubToken });

    try {
      // Fetch repositories from GitHub
      const { data: repos, headers } = await octokit.rest.repos.listForAuthenticatedUser({
        page,
        per_page: perPage,
        type,
        sort,
      });

      // Check rate limit
      const remaining = parseInt(headers['x-ratelimit-remaining'] || '0', 10);
      if (remaining < 100) {
        logger.warn('GitHub API rate limit low', { userId, remaining });
      }

      // Get connected repository IDs
      const connectedRepoIds = await this.getConnectedRepoIds(userId);

      // Filter out connected repos and transform
      const available = repos
        .filter((repo) => !connectedRepoIds.has(BigInt(repo.id)))
        .map((repo) => this.transformRepository(repo));

      // Build pagination metadata
      const pagination = {
        page,
        perPage,
        total: available.length,
        hasMore: repos.length === perPage,
      };

      const result: RepositoryListResponse = {
        data: available,
        pagination,
      };

      // Cache for 5 minutes (300 seconds)
      await redis.setex(cacheKey, DEFAULT_TTL.SHORT, JSON.stringify(result));

      logger.info('Repositories fetched successfully', {
        userId,
        count: available.length,
        page,
        perPage,
      });

      return result;
    } catch (error: any) {
      // Handle GitHub API errors
      if (error.status === 401) {
        logger.error('GitHub authentication failed', {
          userId,
          error: error.message,
        });
        throw new AppError(401, 'GitHub authentication failed. Please re-authenticate.');
      }

      if (error.status === 403) {
        logger.error('GitHub rate limit exceeded', {
          userId,
          error: error.message,
        });
        throw new AppError(429, 'GitHub rate limit exceeded. Please try again later.');
      }

      // Log unexpected errors
      logger.error('Failed to fetch repositories from GitHub', {
        userId,
        error: error.message,
        stack: error.stack,
      });

      throw new AppError(500, 'Failed to fetch repositories from GitHub');
    }
  }

  /**
   * Get set of connected repository GitHub IDs for a user
   * Checks all organizations the user belongs to
   *
   * @param userId - User ID
   * @returns Set of connected repository GitHub IDs
   */
  private async getConnectedRepoIds(userId: string): Promise<Set<bigint>> {
    // Get all organizations the user belongs to
    const userOrgs = await prisma.userOrganization.findMany({
      where: { userId },
      select: { organizationId: true },
    });

    const orgIds = userOrgs.map((uo: any) => uo.organizationId);

    if (orgIds.length === 0) {
      return new Set<bigint>();
    }

    // Get all repositories in these organizations
    const repos = await prisma.repository.findMany({
      where: {
        organizationId: { in: orgIds },
      },
      select: { githubId: true },
    });

    return new Set(repos.map((r: any) => r.githubId));
  }

  /**
   * Transform GitHub repository object to our format
   *
   * @param repo - GitHub repository object
   * @returns Transformed repository data
   */
  private transformRepository(repo: any): RepositoryListItem {
    return {
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      openIssues: repo.open_issues_count || 0,
      isPrivate: repo.private || false,
      defaultBranch: repo.default_branch || 'main',
      url: repo.html_url,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at || null,
    };
  }

  /**
   * Invalidate cache for user's repository listings
   * Called when a repository is connected or disconnected
   *
   * @param userId - User ID
   */
  async invalidateCache(userId: string): Promise<void> {
    const pattern = `repos:available:${userId}:*`;
    const keysDeleted = await deletePattern(pattern);

    if (keysDeleted > 0) {
      logger.debug('Repository cache invalidated', { userId, keysDeleted });
    }
  }

  /**
   * Connect a GitHub repository to an organization
   * Creates webhook, stores repository data, and sets up tracking
   *
   * @param userId - User ID performing the action
   * @param githubRepoId - GitHub repository ID (numeric)
   * @param organizationId - Organization ID to connect the repository to
   * @param ipAddress - IP address of the request (for audit logging)
   * @returns Connected repository with stats
   */
  async connectRepository(
    userId: string,
    githubRepoId: number,
    organizationId: string,
    ipAddress: string
  ): Promise<ConnectedRepository> {
    // Validate user has access to organization
    const userOrg = await prisma.userOrganization.findFirst({
      where: {
        userId,
        organizationId,
        role: { in: ['ADMIN', 'MEMBER'] },
      },
    });

    if (!userOrg) {
      throw new AppError(403, 'User does not have access to this organization');
    }

    // Check if repository is already connected to this organization
    const existing = await prisma.repository.findFirst({
      where: {
        githubId: BigInt(githubRepoId),
        organizationId,
      },
    });

    if (existing) {
      throw new AppError(409, 'Repository already connected to this organization');
    }

    // Get user's GitHub token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, accessToken: true },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (!user.accessToken) {
      throw new AppError(401, 'GitHub access token not found. Please re-authenticate.');
    }

    // Decrypt GitHub token
    let githubToken: string;
    try {
      githubToken = decryptGitHubToken(user.accessToken);
    } catch (error) {
      logger.error('Failed to decrypt GitHub token', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new AppError(401, 'Failed to decrypt GitHub token. Please re-authenticate.');
    }

    // Initialize Octokit with user's token (dynamic import for ESM compatibility)
    const { Octokit } = await import('@octokit/rest');
    const octokit = new Octokit({ auth: githubToken });

    // Get owner and repo name from GitHub ID
    let owner: string;
    let repoName: string;
    let repo: any;

    try {
      [owner, repoName] = await this.getOwnerAndRepo(octokit, githubRepoId);

      // Fetch repository details from GitHub
      const { data } = await octokit.rest.repos.get({
        owner,
        repo: repoName,
      });
      repo = data;
    } catch (error: any) {
      if (error.status === 404) {
        throw new AppError(404, 'Repository not found or no access');
      }
      if (error.status === 403) {
        throw new AppError(403, 'Access denied to repository');
      }
      logger.error('Failed to fetch repository from GitHub', {
        userId,
        githubRepoId,
        error: error.message,
      });
      throw new AppError(500, 'Failed to fetch repository from GitHub');
    }

    // Check if user has admin access (required for webhooks)
    if (!repo.permissions?.admin) {
      throw new AppError(
        403,
        'Admin access required to connect repository. Please ensure you have admin permissions on the repository.'
      );
    }

    // Use transaction for atomicity
    const connected = await prisma.$transaction(async (tx: any) => {
      // Create repository record
      const newRepo = await tx.repository.create({
        data: {
          githubId: BigInt(repo.id),
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          language: repo.language,
          isPrivate: repo.private,
          organizationId,
          syncStatus: 'PENDING',
          webhookSecret: config.github.webhookSecret, // Store webhook secret
        },
      });

      // Create webhook on GitHub
      let webhookId: bigint | null = null;
      try {
        const webhook = await this.createWebhook(octokit, repo);

        // Update repository with webhook ID
        await tx.repository.update({
          where: { id: newRepo.id },
          data: {
            webhookId: BigInt(webhook.id),
          },
        });

        webhookId = BigInt(webhook.id);

        logger.info('Webhook created successfully', {
          repoId: newRepo.id,
          webhookId: webhook.id,
          repoName: repo.full_name,
        });
      } catch (error) {
        logger.error('Failed to create webhook', {
          error: error instanceof Error ? error.message : String(error),
          repoId: newRepo.id,
          repoName: repo.full_name,
        });
        // Continue even if webhook fails - can be set up manually later
        // Repository is still created, just without webhook
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId,
          organizationId,
          action: 'REPOSITORY_CONNECTED',
          resource: `repository:${newRepo.id}`,
          status: 'success',
          ipAddress,
          metadata: {
            repoName: repo.full_name,
            githubId: repo.id,
            webhookCreated: webhookId !== null,
          },
        },
      });

      return { ...newRepo, webhookId };
    });

    // Invalidate caches
    await this.invalidateCache(userId);
    await redis.del(`repos:connected:${organizationId}`);

    // Queue historical import (placeholder - will be implemented in TASK-019)
    await this.queueHistoricalImport(connected.id);

    logger.info('Repository connected successfully', {
      userId,
      repoId: connected.id,
      repoName: connected.fullName,
      organizationId,
    });

    // Fetch repository with stats for response
    return await this.getRepositoryWithStats(connected.id);
  }

  /**
   * Disconnect a repository from an organization
   * Removes webhook from GitHub and deletes repository data
   *
   * @param userId - User ID performing the action
   * @param repoId - Repository ID (UUID)
   * @param ipAddress - IP address of the request (for audit logging)
   */
  async disconnectRepository(userId: string, repoId: string, ipAddress: string): Promise<void> {
    // Get repository with organization
    const repo = await prisma.repository.findUnique({
      where: { id: repoId },
      include: {
        organization: true,
      },
    });

    if (!repo) {
      throw new AppError(404, 'Repository not found');
    }

    // Check user has permission to disconnect
    const userOrg = await prisma.userOrganization.findFirst({
      where: {
        userId,
        organizationId: repo.organizationId,
        role: { in: ['ADMIN', 'MEMBER'] },
      },
    });

    if (!userOrg) {
      throw new AppError(403, 'Insufficient permissions to disconnect this repository');
    }

    // Get user's GitHub token for webhook deletion
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, accessToken: true },
    });

    if (!user || !user.accessToken) {
      logger.warn('Cannot delete webhook - user token not available', {
        userId,
        repoId,
      });
    } else {
      // Delete webhook from GitHub
      if (repo.webhookId) {
        try {
          const githubToken = decryptGitHubToken(user.accessToken);
          // Dynamic import for ESM compatibility
          const { Octokit } = await import('@octokit/rest');
          const octokit = new Octokit({ auth: githubToken });
          const [owner, repoName] = repo.fullName.split('/');

          await octokit.rest.repos.deleteWebhook({
            owner,
            repo: repoName,
            hook_id: Number(repo.webhookId),
          });

          logger.info('Webhook deleted from GitHub', {
            repoId,
            webhookId: repo.webhookId.toString(),
            repoName: repo.fullName,
          });
        } catch (error) {
          logger.warn('Failed to delete webhook from GitHub', {
            error: error instanceof Error ? error.message : String(error),
            repoId,
            webhookId: repo.webhookId?.toString(),
          });
          // Continue even if webhook deletion fails - repository will still be deleted
        }
      }
    }

    // Delete repository (cascades to events, stats, commits, PRs, issues)
    await prisma.repository.delete({
      where: { id: repoId },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        organizationId: repo.organizationId,
        action: 'REPOSITORY_DISCONNECTED',
        resource: `repository:${repoId}`,
        status: 'success',
        ipAddress,
        metadata: {
          repoName: repo.fullName,
        },
      },
    });

    // Invalidate caches
    await this.invalidateCache(userId);
    await redis.del(`repos:connected:${repo.organizationId}`);

    logger.info('Repository disconnected successfully', {
      userId,
      repoId,
      repoName: repo.fullName,
      organizationId: repo.organizationId,
    });
  }

  /**
   * List connected repositories for an organization
   *
   * @param organizationId - Organization ID
   * @param userId - User ID (for permission check)
   * @returns Array of connected repositories with stats
   */
  async listConnectedRepositories(organizationId: string, userId: string): Promise<ConnectedRepository[]> {
    // Check user has access to organization
    const userOrg = await prisma.userOrganization.findFirst({
      where: {
        userId,
        organizationId,
      },
    });

    if (!userOrg) {
      throw new AppError(403, 'User does not have access to this organization');
    }

    // Check cache
    const cacheKey = `repos:connected:${organizationId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug('Returning cached connected repositories', { organizationId, cacheKey });
      return JSON.parse(cached) as ConnectedRepository[];
    }

    // Fetch from database
    const repos = await prisma.repository.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: {
            commits: true,
            pullRequests: true,
            issues: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to response format
    const connectedRepos: ConnectedRepository[] = repos.map((repo: any) => ({
      id: repo.id,
      organizationId: repo.organizationId,
      githubId: repo.githubId.toString(),
      name: repo.name,
      fullName: repo.fullName,
      description: repo.description,
      language: repo.language,
      isPrivate: repo.isPrivate,
      webhookId: repo.webhookId?.toString() || null,
      syncStatus: repo.syncStatus,
      lastSyncedAt: repo.lastSyncedAt,
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt,
      stats: {
        commits: repo._count.commits,
        pullRequests: repo._count.pullRequests,
        issues: repo._count.issues,
      },
    }));

    // Cache for 10 minutes (600 seconds)
    await redis.setex(cacheKey, 600, JSON.stringify(connectedRepos));

    logger.debug('Fetched connected repositories', {
      organizationId,
      count: connectedRepos.length,
    });

    return connectedRepos;
  }

  /**
   * Connect multiple repositories in bulk
   *
   * @param userId - User ID performing the action
   * @param githubRepoIds - Array of GitHub repository IDs
   * @param organizationId - Organization ID
   * @param ipAddress - IP address of the request
   * @returns Result with successful and failed connections
   */
  async connectRepositories(
    userId: string,
    githubRepoIds: number[],
    organizationId: string,
    ipAddress: string
  ): Promise<BulkConnectResult> {
    const result: BulkConnectResult = {
      success: [],
      failed: [],
    };

    // Process repositories sequentially to avoid rate limits
    for (const githubRepoId of githubRepoIds) {
      try {
        const repo = await this.connectRepository(userId, githubRepoId, organizationId, ipAddress);
        result.success.push(repo);
      } catch (error) {
        result.failed.push({
          githubRepoId,
          error: error instanceof AppError ? error.message : 'Unknown error occurred',
        });
        logger.warn('Failed to connect repository in bulk operation', {
          userId,
          githubRepoId,
          organizationId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info('Bulk repository connection completed', {
      userId,
      organizationId,
      total: githubRepoIds.length,
      success: result.success.length,
      failed: result.failed.length,
    });

    return result;
  }

  /**
   * Get repository with stats by ID
   *
   * @param repoId - Repository ID
   * @returns Repository with stats
   */
  private async getRepositoryWithStats(repoId: string): Promise<ConnectedRepository> {
    const repo = await prisma.repository.findUnique({
      where: { id: repoId },
      include: {
        _count: {
          select: {
            commits: true,
            pullRequests: true,
            issues: true,
          },
        },
      },
    });

    if (!repo) {
      throw new AppError(404, 'Repository not found');
    }

    return {
      id: repo.id,
      organizationId: repo.organizationId,
      githubId: repo.githubId.toString(),
      name: repo.name,
      fullName: repo.fullName,
      description: repo.description,
      language: repo.language,
      isPrivate: repo.isPrivate,
      webhookId: repo.webhookId?.toString() || null,
      syncStatus: repo.syncStatus,
      lastSyncedAt: repo.lastSyncedAt,
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt,
      stats: {
        commits: repo._count.commits,
        pullRequests: repo._count.pullRequests,
        issues: repo._count.issues,
      },
    };
  }

  /**
   * Get owner and repository name from GitHub repository ID
   * Helper method to resolve GitHub ID to owner/repo name
   *
   * @param octokit - Authenticated Octokit instance
   * @param githubRepoId - GitHub repository ID
   * @returns Tuple of [owner, repoName]
   */
  private async getOwnerAndRepo(octokit: Octokit, githubRepoId: number): Promise<[string, string]> {
    // Fetch user's repositories to find the one matching the ID
    // We'll paginate through all repos if needed
    let page = 1;
    const perPage = 100;

    while (true) {
      const { data: repos } = await octokit.repos.listForAuthenticatedUser({
        page,
        per_page: perPage,
      });

      const repo = repos.find((r) => r.id === githubRepoId);
      if (repo) {
        return [repo.owner.login, repo.name];
      }

      // If we got fewer repos than requested, we've reached the end
      if (repos.length < perPage) {
        break;
      }

      page++;
    }

    throw new Error(`Repository with ID ${githubRepoId} not found in user's accessible repositories`);
  }

  /**
   * Create webhook on GitHub repository
   *
   * @param octokit - Authenticated Octokit instance
   * @param repo - GitHub repository object
   * @returns Created webhook data
   */
  private async createWebhook(octokit: Octokit, repo: any): Promise<any> {
    const [owner, repoName] = repo.full_name.split('/');

    const webhookUrl = `${config.apiUrl}/api/webhooks/github`;

    const { data: webhook } = await octokit.rest.repos.createWebhook({
      owner,
      repo: repoName,
      config: {
        url: webhookUrl,
        content_type: 'json',
        secret: config.github.webhookSecret,
        insecure_ssl: '0', // Require SSL
      },
      events: [
        'push',
        'pull_request',
        'pull_request_review',
        'pull_request_review_comment',
        'issues',
        'issue_comment',
        'create', // branches/tags created
        'delete', // branches/tags deleted
      ],
      active: true,
    });

    logger.info('Webhook created on GitHub', {
      webhookId: webhook.id,
      repoName: repo.full_name,
      webhookUrl,
    });

    return webhook;
  }

  /**
   * Queue historical data import for a repository
   * Adds a job to the import queue for background processing
   *
   * @param repoId - Repository ID
   */
  private async queueHistoricalImport(repoId: string): Promise<void> {
    try {
      // Dynamic import to avoid circular dependencies
      const { importQueue } = await import('./import.queue');

      await importQueue.add(
        'import-historical-data',
        {
          repoId,
          days: 90, // Import last 90 days
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        }
      );

      logger.info('Historical import queued', {
        repoId,
        days: 90,
      });
    } catch (error) {
      logger.error('Failed to queue historical import', {
        repoId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - repository connection should still succeed even if import fails
    }
  }
}

// Export singleton instance
export const repositoriesService = new RepositoriesService();

