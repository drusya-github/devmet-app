/**
 * Pull Request Event Processor
 * Handles GitHub pull request events with cycle time tracking
 */
import { prisma } from '../../../database/prisma.client';
import { logger } from '../../../config/logger';
import { queueMetricsCalculation } from '../../metrics/metrics.queue';
import type { PullRequestEventPayload } from '../webhooks.types';
import type { ProcessorResult, ProcessingContext } from './processors.types';
import {
  findRepository,
  findOrCreateAuthor,
  extractUsername,
  getTodayDate,
  calculateHoursDiff,
} from './processors.helpers';

/**
 * Process pull request event
 * Handles: opened, closed, reopened, synchronize, edited, merged
 * Calculates PR cycle time (time from creation to merge/close)
 */
export async function processPullRequestEvent(
  payload: PullRequestEventPayload,
  context: ProcessingContext
): Promise<ProcessorResult> {
  const { repository, pull_request: pr, action } = payload;

  try {
    // Find repository
    const repo = await findRepository(repository.id);
    if (!repo) {
      logger.warn('Pull request event for unknown repository - skipping', {
        deliveryId: context.deliveryId,
        repositoryId: repository.id,
        action,
      });
      return {
        success: true,
        recordsCreated: 0,
        recordsUpdated: 0,
        metadata: { skipped: true, reason: 'repository_not_connected' },
      };
    }

    logger.info('Processing pull request event', {
      deliveryId: context.deliveryId,
      repositoryId: repo.id,
      prNumber: pr.number,
      action,
      prState: pr.state,
      merged: pr.merged,
    });

    // Find or create author
    const authorUsername = extractUsername(pr.user.login);
    const author = await findOrCreateAuthor(
      authorUsername,
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

    // Calculate PR cycle time if merged or closed
    let cycleTimeHours: number | undefined;
    const createdAt = new Date(pr.created_at);
    
    if (pr.merged_at) {
      cycleTimeHours = calculateHoursDiff(createdAt, new Date(pr.merged_at));
    } else if (pr.closed_at && state === 'CLOSED') {
      cycleTimeHours = calculateHoursDiff(createdAt, new Date(pr.closed_at));
    }

    // Get existing PR to check if it's an update
    const existingPR = await prisma.pullRequest.findUnique({
      where: { githubId: BigInt(pr.id) },
      select: { id: true },
    });

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
        authorGithubId: author?.githubId,
        additions: pr.additions || 0,
        deletions: pr.deletions || 0,
        filesChanged: pr.changed_files || 0,
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
        createdAt: createdAt,
        updatedAt: new Date(pr.updated_at),
      },
      update: {
        title: pr.title,
        state,
        author: author?.id ? {
          connect: { id: author.id },
        } : undefined,
        authorGithubId: author?.githubId,
        additions: pr.additions || 0,
        deletions: pr.deletions || 0,
        filesChanged: pr.changed_files || 0,
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
        updatedAt: new Date(pr.updated_at),
      },
    });

    // Queue metrics calculation
    const today = getTodayDate();
    await queueMetricsCalculation({
      repositoryId: repo.id,
      userId: author?.id,
      organizationId: repo.organizationId,
      date: today,
      source: 'webhook',
      calculationType: 'incremental',
    });

    logger.info('Pull request event processing complete', {
      deliveryId: context.deliveryId,
      repositoryId: repo.id,
      prNumber: pr.number,
      action,
      state,
      cycleTimeHours,
      isUpdate: !!existingPR,
    });

    return {
      success: true,
      recordsCreated: existingPR ? 0 : 1,
      recordsUpdated: existingPR ? 1 : 0,
      metadata: {
        repositoryId: repo.id,
        prNumber: pr.number,
        state,
        action,
        cycleTimeHours,
      },
    };
  } catch (error) {
    logger.error('Pull request event processing failed', {
      deliveryId: context.deliveryId,
      repositoryId: repository.id,
      prNumber: payload.pull_request.number,
      action,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw error; // Re-throw to trigger retry mechanism
  }
}