/**
 * Pull Request Review Event Processor
 * Handles GitHub pull request review events
 * Ensures PR exists and tracks review metrics
 */
import { prisma } from '../../../database/prisma.client';
import { logger } from '../../../config/logger';
import { queueMetricsCalculation } from '../../metrics/metrics.queue';
import type { PullRequestReviewEventPayload } from '../webhooks.types';
import type { ProcessorResult, ProcessingContext } from './processors.types';
import {
  findRepository,
  findOrCreateAuthor,
  extractUsername,
  getTodayDate,
} from './processors.helpers';

/**
 * Process pull request review event
 * Handles: submitted, edited, dismissed
 * Ensures PR exists in database and tracks review metadata
 * 
 * Note: Full review tracking (separate Review model) will be in future enhancement
 * Note: Review webhook has limited PR data, so we work with what's available
 */
export async function processPullRequestReviewEvent(
  payload: PullRequestReviewEventPayload,
  context: ProcessingContext
): Promise<ProcessorResult> {
  const { repository, review, pull_request: pr, action } = payload;

  try {
    // Find repository
    const repo = await findRepository(repository.id);
    if (!repo) {
      logger.warn('PR review event for unknown repository - skipping', {
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

    logger.info('Processing PR review event', {
      deliveryId: context.deliveryId,
      repositoryId: repo.id,
      prNumber: pr.number,
      reviewState: review.state,
      action,
    });

    // Find or create PR author
    const prAuthorUsername = extractUsername(pr.user.login);
    const prAuthor = await findOrCreateAuthor(
      prAuthorUsername,
      undefined,
      pr.user.login
    );

    // Find or create reviewer
    const reviewerUsername = extractUsername(review.user.login);
    const reviewer = await findOrCreateAuthor(
      reviewerUsername,
      undefined,
      review.user.login
    );

    // Check if PR exists
    const existingPR = await prisma.pullRequest.findUnique({
      where: { githubId: BigInt(pr.id) },
      select: { id: true },
    });

    // Determine PR state (review webhook has limited data)
    // We only know if it's open or closed, not if merged
    const prState = pr.state === 'open' ? 'OPEN' : 'CLOSED';

    // Ensure PR exists in database (upsert with limited data)
    await prisma.pullRequest.upsert({
      where: { githubId: BigInt(pr.id) },
      create: {
        githubId: BigInt(pr.id),
        number: pr.number,
        title: pr.title,
        state: prState,
        repository: {
          connect: { id: repo.id },
        },
        author: prAuthor?.id ? {
          connect: { id: prAuthor.id },
        } : undefined,
        authorGithubId: prAuthor?.githubId,
        additions: 0, // Not available in review webhook
        deletions: 0,
        filesChanged: 0,
        createdAt: new Date(pr.created_at),
        updatedAt: new Date(pr.updated_at),
        closedAt: null, // Not reliably available in review webhook
        mergedAt: null, // Not available in review webhook
      },
      update: {
        // Only update fields that are reliable in review webhook
        title: pr.title,
        updatedAt: new Date(pr.updated_at),
        // Don't override state unless we're certain (could be stale)
      },
    });

    // Queue metrics calculation for reviewer
    const today = getTodayDate();
    await queueMetricsCalculation({
      repositoryId: repo.id,
      userId: reviewer?.id,
      organizationId: repo.organizationId,
      date: today,
      source: 'webhook',
      calculationType: 'incremental',
    });

    logger.info('PR review event processing complete', {
      deliveryId: context.deliveryId,
      repositoryId: repo.id,
      prNumber: pr.number,
      reviewState: review.state,
      action,
      reviewerId: reviewer?.id,
      prExisted: !!existingPR,
    });

    return {
      success: true,
      recordsCreated: existingPR ? 0 : 1,
      recordsUpdated: existingPR ? 1 : 0,
      metadata: {
        repositoryId: repo.id,
        prNumber: pr.number,
        reviewState: review.state,
        action,
        reviewerId: reviewer?.id,
      },
    };
  } catch (error) {
    logger.error('PR review event processing failed', {
      deliveryId: context.deliveryId,
      repositoryId: repository.id,
      prNumber: payload.pull_request.number,
      reviewState: payload.review.state,
      action,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw error; // Re-throw to trigger retry mechanism
  }
}