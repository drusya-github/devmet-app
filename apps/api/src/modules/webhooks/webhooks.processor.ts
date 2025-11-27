/**
 * Webhook Event Processors
 * Handles processing of different GitHub webhook event types
 */
import { prisma } from '../../database/prisma.client';
import { logger } from '../../config/logger';
import { queueMetricsCalculation } from '../../modules/metrics/metrics.queue';
import type {
  GitHubWebhookEventType,
  PushEventPayload,
  PullRequestEventPayload,
  IssueEventPayload,
  PullRequestReviewEventPayload,
  WebhookProcessingResult,
} from './webhooks.types';

/**
 * Main webhook event processor dispatcher
 * Routes events to specific handlers based on event type
 */
export async function processWebhookEvent(
  eventType: GitHubWebhookEventType,
  deliveryId: string,
  payload: any
): Promise<WebhookProcessingResult> {
  const startTime = Date.now();
  
  try {
    logger.info('Processing webhook event', {
      eventType,
      deliveryId,
      repositoryId: payload.repository?.id,
    });

    // Route to specific processor
    switch (eventType) {
      case 'push':
        await processPushEvent(payload as PushEventPayload);
        break;
      case 'pull_request':
        await processPullRequestEvent(payload as PullRequestEventPayload);
        break;
      case 'issues':
        await processIssuesEvent(payload as IssueEventPayload);
        break;
      case 'pull_request_review':
        await processPullRequestReviewEvent(payload as PullRequestReviewEventPayload);
        break;
      default:
        logger.warn('Unsupported event type', { eventType, deliveryId });
        return {
          success: true, // Not an error, just unsupported
          event: eventType,
          deliveryId,
          processedAt: new Date(),
          metadata: { skipped: true, reason: 'unsupported_event_type' },
        };
    }

    const processingTime = Date.now() - startTime;
    
    logger.info('Webhook event processed successfully', {
      eventType,
      deliveryId,
      processingTimeMs: processingTime,
    });

    return {
      success: true,
      event: eventType,
      deliveryId,
      processedAt: new Date(),
      metadata: { processingTimeMs: processingTime },
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('Webhook event processing failed', {
      eventType,
      deliveryId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTimeMs: processingTime,
    });

    return {
      success: false,
      event: eventType,
      deliveryId,
      processedAt: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: { processingTimeMs: processingTime },
    };
  }
}

/**
 * Process push events (commits)
 */
async function processPushEvent(payload: PushEventPayload): Promise<void> {
  const { repository, commits = [], pusher } = payload;

  // Find repository in database
  const repo = await findRepository(repository.id);
  if (!repo) {
    logger.warn('Push event for unknown repository', {
      repositoryId: repository.id,
      repositoryName: repository.full_name,
    });
    return;
  }

  logger.debug('Processing push event', {
    repositoryId: repo.id,
    commitCount: commits.length,
  });

  // Process each commit
  for (const commit of commits) {
    try {
      // Find or create author (map GitHub user to our User)
      const author = await findOrCreateAuthor(
        commit.author.username,
        commit.author.email,
        commit.author.name
      );

      // Upsert commit
      await prisma.commit.upsert({
        where: { githubId: commit.id },
        create: {
          githubId: commit.id,
          sha: commit.id,
          message: commit.message,
          repository: {
            connect: { id: repo.id },
          },
          author: author?.id ? {
            connect: { id: author.id },
          } : undefined,
          authorGithubId: author?.githubId,
          authorName: commit.author.name,
          authorEmail: commit.author.email,
          additions: commit.added?.length || 0,
          deletions: commit.removed?.length || 0,
          committedAt: new Date(commit.timestamp),
        },
        update: {
          message: commit.message,
          author: author?.id ? {
            connect: { id: author.id },
          } : undefined,
          authorGithubId: author?.githubId,
        },
      });

      logger.debug('Commit processed', {
        commitSha: commit.id.substring(0, 7),
        author: commit.author.name,
      });
    } catch (error) {
      logger.error('Failed to process commit', {
        commitId: commit.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Continue processing other commits
    }
  }

  // Queue metrics calculation for repository and authors
  const today = new Date().toISOString().split('T')[0];
  await queueMetricsCalculation({
    repositoryId: repo.id,
    organizationId: repo.organizationId,
    date: today,
    source: 'webhook',
    calculationType: 'incremental'
  });

  logger.info('Push event processed', {
    repositoryId: repo.id,
    commitsProcessed: commits.length,
  });
}

/**
 * Process pull request events
 */
async function processPullRequestEvent(payload: PullRequestEventPayload): Promise<void> {
  const { repository, pull_request: pr, action } = payload;

  // Find repository
  const repo = await findRepository(repository.id);
  if (!repo) {
    logger.warn('Pull request event for unknown repository', {
      repositoryId: repository.id,
    });
    return;
  }

  logger.debug('Processing pull request event', {
    repositoryId: repo.id,
    prNumber: pr.number,
    action,
  });

  // Find or create author
  const author = await findOrCreateAuthor(
    pr.user.login,
    undefined, // Email not available in PR webhook
    pr.user.login
  );

  // Determine PR state
  let state: 'OPEN' | 'CLOSED' | 'MERGED';
  if (pr.merged) {
    state = 'MERGED';
  } else if (pr.state === 'closed') {
    state = 'CLOSED';
  } else {
    state = 'OPEN';
  }

  // Upsert pull request
  await prisma.pullRequest.upsert({
    where: { githubId: BigInt(pr.id) },
    create: {
      githubId: BigInt(pr.id),
      number: pr.number,
      title: pr.title,
      state,
      repository: {
        connect: { id: repo.id },
      },
      author: author?.id ? {
        connect: { id: author.id },
      } : undefined,
      authorGithubId: author?.githubId ? BigInt(author.githubId) : undefined,
      additions: pr.additions || 0,
      deletions: pr.deletions || 0,
      filesChanged: pr.changed_files || 0,
      mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
      closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
      createdAt: new Date(pr.created_at),
      updatedAt: new Date(pr.updated_at),
    },
    update: {
      title: pr.title,
      state,
      additions: pr.additions || 0,
      deletions: pr.deletions || 0,
      filesChanged: pr.changed_files || 0,
      mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
      closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
      updatedAt: new Date(pr.updated_at),
    },
  });

  // Queue metrics calculation
  const today = new Date().toISOString().split('T')[0];
  await queueMetricsCalculation({
    repositoryId: repo.id,
    userId: author?.id,
    organizationId: repo.organizationId,
    date: today,
    source: 'webhook',
    calculationType: 'incremental'
  });

  logger.info('Pull request event processed', {
    repositoryId: repo.id,
    prNumber: pr.number,
    action,
    state,
  });
}

/**
 * Process issue events
 */
async function processIssuesEvent(payload: IssueEventPayload): Promise<void> {
  const { repository, issue, action } = payload;

  // Find repository
  const repo = await findRepository(repository.id);
  if (!repo) {
    logger.warn('Issue event for unknown repository', {
      repositoryId: repository.id,
    });
    return;
  }

  logger.debug('Processing issue event', {
    repositoryId: repo.id,
    issueNumber: issue.number,
    action,
  });

  // Find or create author
  const author = await findOrCreateAuthor(
    issue.user.login,
    undefined,
    issue.user.login
  );

  // Determine issue state
  const state = issue.state === 'open' ? 'OPEN' : 'CLOSED';

  // Upsert issue
  await prisma.issue.upsert({
    where: { githubId: BigInt(issue.id) },
    create: {
      githubId: BigInt(issue.id),
      number: issue.number,
      title: issue.title,
      state,
      repository: {
        connect: { id: repo.id },
      },
      author: author?.id ? {
        connect: { id: author.id },
      } : undefined,
      authorGithubId: author?.githubId ? BigInt(author.githubId) : undefined,
      closedAt: issue.closed_at ? new Date(issue.closed_at) : null,
      createdAt: new Date(issue.created_at),
    },
    update: {
      title: issue.title,
      state,
      closedAt: issue.closed_at ? new Date(issue.closed_at) : null,
    },
  });

  // Queue metrics calculation
  const today = new Date().toISOString().split('T')[0];
  await queueMetricsCalculation({
    repositoryId: repo.id,
    userId: author?.id,
    organizationId: repo.organizationId,
    date: today,
    source: 'webhook',
    calculationType: 'incremental'
  });

  logger.info('Issue event processed', {
    repositoryId: repo.id,
    issueNumber: issue.number,
    action,
    state,
  });
}

/**
 * Process pull request review events
 */
async function processPullRequestReviewEvent(
  payload: PullRequestReviewEventPayload
): Promise<void> {
  const { repository, review, pull_request: pr, action } = payload;

  // Find repository
  const repo = await findRepository(repository.id);
  if (!repo) {
    logger.warn('PR review event for unknown repository', {
      repositoryId: repository.id,
    });
    return;
  }

  logger.debug('Processing PR review event', {
    repositoryId: repo.id,
    prNumber: pr.number,
    reviewState: review.state,
    action,
  });

  // For now, we'll just log the review
  // In Task 022, we might create a separate Review model
  // For now, this ensures the PR exists in our database
  
  // Find or create PR author
  const author = await findOrCreateAuthor(pr.user.login, undefined, pr.user.login);

  // Ensure PR exists (upsert)
  await prisma.pullRequest.upsert({
    where: { githubId: BigInt(pr.id) },
    create: {
      githubId: BigInt(pr.id),
      number: pr.number,
      title: pr.title,
      state: pr.state === 'open' ? 'OPEN' : 'CLOSED',
      repository: {
        connect: { id: repo.id },
      },
      author: author?.id ? {
        connect: { id: author.id },
      } : undefined,
      authorGithubId: author?.githubId ? BigInt(author.githubId) : undefined,
      additions: 0,
      deletions: 0,
      filesChanged: 0,
      createdAt: new Date(pr.created_at),
      updatedAt: new Date(pr.updated_at),
    },
    update: {
      updatedAt: new Date(pr.updated_at),
    },
  });

  logger.info('PR review event processed', {
    repositoryId: repo.id,
    prNumber: pr.number,
    reviewState: review.state,
  });
}

/**
 * Helper: Find repository by GitHub ID
 * Throws errors to allow retry mechanism to work
 */
async function findRepository(githubId: number) {
  return await prisma.repository.findFirst({
    where: {
      githubId: BigInt(githubId),  // ✅ use the argument, and match Prisma’s BigInt field
    },
    select: {
      id: true,
      githubId: true,
      name: true,
      fullName: true,
      organizationId: true, // or remove if not needed
      webhookSecret: true,
      // any other valid fields…
    },
  });
}


/**
 * Helper: Find or create author (GitHub user -> our User)
 * 
 * Note: This creates a minimal user record if the GitHub user doesn't exist in our system.
 * These users won't be able to log in until they authenticate via OAuth.
 */
async function findOrCreateAuthor(
  username?: string,
  email?: string,
  name?: string
): Promise<{ id: string; githubId: bigint } | null> {
  // Need at least username or email
  if (!username && !email) {
    logger.debug('Cannot create author without username or email');
    return null;
  }

  // Try to find by username first (most reliable)
  if (username) {
    const existingUser = await prisma.user.findFirst({
      where: { 
        OR: [
          { email: username }, // Sometimes username is used as email identifier
          { name: username },
        ]
      },
      select: { id: true, githubId: true },
    });

    if (existingUser) {
      return existingUser;
    }
  }

  // Try to find by email
  if (email) {
    const existingUser = await prisma.user.findFirst({
      where: { email },
      select: { id: true, githubId: true },
    });

    if (existingUser) {
      return existingUser;
    }
  }

  // User not found - for now, we'll return null
  // In a full implementation, you might want to create a placeholder user
  // or fetch from GitHub API using the username
  
  logger.debug('Author not found in database', {
    username,
    email,
    name,
  });

  return null;
}