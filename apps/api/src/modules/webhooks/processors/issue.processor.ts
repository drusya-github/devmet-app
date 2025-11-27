/**
 * Issue Event Processor
 * Handles GitHub issue events with resolution time tracking
 */
import { prisma } from '../../../database/prisma.client';
import { logger } from '../../../config/logger';
import { queueMetricsCalculation } from '../../metrics/metrics.queue';
import type { IssueEventPayload } from '../webhooks.types';
import type { ProcessorResult, ProcessingContext } from './processors.types';
import {
  findRepository,
  findOrCreateAuthor,
  extractUsername,
  getTodayDate,
  calculateHoursDiff,
} from './processors.helpers';

/**
 * Process issue event
 * Handles: opened, closed, reopened, edited, assigned, unassigned
 * Calculates issue resolution time (time from creation to close)
 */
export async function processIssueEvent(
  payload: IssueEventPayload,
  context: ProcessingContext
): Promise<ProcessorResult> {
  const { repository, issue, action } = payload;

  try {
    // Find repository
    const repo = await findRepository(repository.id);
    if (!repo) {
      logger.warn('Issue event for unknown repository - skipping', {
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

    logger.info('Processing issue event', {
      deliveryId: context.deliveryId,
      repositoryId: repo.id,
      issueNumber: issue.number,
      action,
      issueState: issue.state,
    });

    // Find or create author
    const authorUsername = extractUsername(issue.user.login);
    const author = await findOrCreateAuthor(
      authorUsername,
      undefined, // Email not available in issue webhook
      issue.user.login
    );

    // Determine issue state
    const state = issue.state === 'open' ? 'OPEN' : 'CLOSED';

    // Calculate resolution time if closed
    let resolutionTimeHours: number | undefined;
    const createdAt = new Date(issue.created_at);
    
    if (issue.closed_at && state === 'CLOSED') {
      resolutionTimeHours = calculateHoursDiff(createdAt, new Date(issue.closed_at));
    }

    // Get existing issue to check if it's an update
    const existingIssue = await prisma.issue.findUnique({
      where: { githubId: BigInt(issue.id) },
      select: { id: true, state: true },
    });

    // Check if this is a state transition
    const isStateTransition = existingIssue && existingIssue.state !== state;

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
        authorGithubId: author?.githubId,
        closedAt: issue.closed_at ? new Date(issue.closed_at) : null,
        createdAt: createdAt,
      },
      update: {
        title: issue.title,
        state,
        author: author?.id ? {
          connect: { id: author.id },
        } : undefined,
        authorGithubId: author?.githubId,
        closedAt: issue.closed_at ? new Date(issue.closed_at) : null,
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

    logger.info('Issue event processing complete', {
      deliveryId: context.deliveryId,
      repositoryId: repo.id,
      issueNumber: issue.number,
      action,
      state,
      resolutionTimeHours,
      isUpdate: !!existingIssue,
      isStateTransition,
    });

    return {
      success: true,
      recordsCreated: existingIssue ? 0 : 1,
      recordsUpdated: existingIssue ? 1 : 0,
      metadata: {
        repositoryId: repo.id,
        issueNumber: issue.number,
        state,
        action,
        resolutionTimeHours,
        isStateTransition,
      },
    };
  } catch (error) {
    logger.error('Issue event processing failed', {
      deliveryId: context.deliveryId,
      repositoryId: repository.id,
      issueNumber: payload.issue.number,
      action,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw error; // Re-throw to trigger retry mechanism
  }
}