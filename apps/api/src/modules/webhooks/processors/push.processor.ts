/**
 * Push Event Processor
 * Handles GitHub push events and creates commit records
 */
import { prisma } from '../../../database/prisma.client';
import { logger } from '../../../config/logger';
import { queueMetricsCalculation } from '../../metrics/metrics.queue';
import type { PushEventPayload } from '../webhooks.types';
import type { ProcessorResult, ProcessingContext } from './processors.types';
import {
  findRepository,
  findOrCreateAuthor,
  sanitizeEmail,
  extractUsername,
  getTodayDate,
} from './processors.helpers';

/**
 * Process push event (commits)
 * Extracts commits and creates/updates commit records in database
 */
export async function processPushEvent(
  payload: PushEventPayload,
  context: ProcessingContext
): Promise<ProcessorResult> {
  const { repository, commits = [], pusher } = payload;
  let createdCount = 0;
  let updatedCount = 0;

  try {
    // Find repository in database
    const repo = await findRepository(repository.id);
    if (!repo) {
      logger.warn('Push event for unknown repository - skipping', {
        deliveryId: context.deliveryId,
        repositoryId: repository.id,
        repositoryName: repository.full_name,
      });
      return {
        success: true, // Not an error, just not connected
        recordsCreated: 0,
        recordsUpdated: 0,
        metadata: { skipped: true, reason: 'repository_not_connected' },
      };
    }

    logger.info('Processing push event', {
      deliveryId: context.deliveryId,
      repositoryId: repo.id,
      repositoryName: repo.fullName,
      commitCount: commits.length,
    });

    // Process each commit
    for (const commit of commits) {
      try {
        // Extract and sanitize author information
        const authorEmail = sanitizeEmail(commit.author.email);
        const authorUsername = extractUsername(commit.author.username);
        const authorName = commit.author.name || authorUsername || 'Unknown';

        // Find or create author
        const author = await findOrCreateAuthor(
          authorUsername,
          authorEmail,
          authorName
        );

        // Count file changes (additions + deletions)
        const additions = commit.added?.length || 0;
        const deletions = commit.removed?.length || 0;
        const filesChanged = 
          (commit.added?.length || 0) + 
          (commit.removed?.length || 0) + 
          (commit.modified?.length || 0);

        // Upsert commit record
        const result = await prisma.commit.upsert({
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
            authorName: authorName,
            authorEmail: authorEmail,
            additions: additions,
            deletions: deletions,
            committedAt: new Date(commit.timestamp),
          },
          update: {
            message: commit.message,
            author: author?.id ? {
              connect: { id: author.id },
            } : undefined,
            authorGithubId: author?.githubId,
            authorName: authorName,
            authorEmail: authorEmail,
            additions: additions,
            deletions: deletions,
          },
        });

        // Track if created or updated
        createdCount++;

        logger.debug('Commit processed', {
          deliveryId: context.deliveryId,
          commitSha: commit.id.substring(0, 7),
          author: authorName,
          additions,
          deletions,
          filesChanged,
        });
      } catch (error) {
        logger.error('Failed to process commit', {
          deliveryId: context.deliveryId,
          commitId: commit.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Continue processing other commits even if one fails
      }
    }

    // Queue metrics calculation for repository and authors
    const today = getTodayDate();
    await queueMetricsCalculation({
      repositoryId: repo.id,
      organizationId: repo.organizationId,
      date: today,
      source: 'webhook',
      calculationType: 'incremental',
    });

    logger.info('Push event processing complete', {
      deliveryId: context.deliveryId,
      repositoryId: repo.id,
      commitsProcessed: createdCount,
      totalCommits: commits.length,
      skippedCommits: commits.length - createdCount,
    });

    return {
      success: true,
      recordsCreated: createdCount,
      recordsUpdated: updatedCount,
      metadata: {
        repositoryId: repo.id,
        totalCommits: commits.length,
        commitsProcessed: createdCount,
      },
    };
  } catch (error) {
    logger.error('Push event processing failed', {
      deliveryId: context.deliveryId,
      repositoryId: repository.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw error; // Re-throw to trigger retry mechanism
  }
}