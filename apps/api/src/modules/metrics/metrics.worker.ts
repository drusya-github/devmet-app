/**
 * DevMetrics - Metrics Queue Worker
 * Processes metrics calculation jobs from the Bull queue
 */

import Bull from 'bull';
import { MetricsJobData } from './metrics.types';
import { MetricsService } from './metrics.service';
import { prisma } from '../../database/prisma.client';
import { logger } from '../../utils/logger';

// Create metrics service instance
const metricsService = new MetricsService(prisma);

/**
 * Process metrics calculation job
 * This is the main worker function that Bull calls for each job
 */
export async function processMetricsJob(job: Bull.Job<MetricsJobData>): Promise<void> {
  const startTime = Date.now();
  const { organizationId, userId, repositoryId, calculationType, startDate, endDate, timeWindow } = job.data;

  logger.info('Processing metrics job', {
    jobId: job.id,
    organizationId,
    userId,
    repositoryId,
    calculationType,
  });

  try {
    switch (calculationType) {
      case 'incremental':
        await processIncrementalCalculation(job.data);
        break;

      case 'batch':
        await processBatchCalculation(job.data);
        break;

      case 'historical':
        await processHistoricalCalculation(job.data);
        break;

      default:
        throw new Error(`Unknown calculation type: ${calculationType}`);
    }

    const duration = Date.now() - startTime;
    logger.info('Metrics job completed successfully', {
      jobId: job.id,
      organizationId,
      duration: `${duration}ms`,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Metrics job failed', {
      jobId: job.id,
      organizationId,
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error; // Re-throw to trigger Bull's retry mechanism
  }
}

/**
 * Process incremental metrics calculation
 * Called when new events are processed (real-time updates)
 */
async function processIncrementalCalculation(data: MetricsJobData): Promise<void> {
  const { organizationId, userId, repositoryId } = data;
  
  // Use today's date if not specified
  const date = data.startDate || new Date();
  date.setHours(0, 0, 0, 0); // Normalize to start of day

  logger.debug('Calculating incremental metrics', {
    organizationId,
    userId,
    repositoryId,
    date: date.toISOString(),
  });

  // If specific user is provided, calculate only their metrics
  if (userId) {
    const devMetrics = await metricsService.calculateDeveloperMetrics(userId, organizationId, date);
    await metricsService.storeDeveloperMetrics(devMetrics);
    logger.debug('Developer metrics calculated', { userId, date: date.toISOString() });
  }

  // If specific repository is provided, calculate only its metrics
  if (repositoryId) {
    const repoMetrics = await metricsService.calculateRepositoryMetrics(repositoryId, date);
    await metricsService.storeRepositoryMetrics(repoMetrics);
    logger.debug('Repository metrics calculated', { repositoryId, date: date.toISOString() });
  }

  // Always calculate team metrics for the organization
  const teamMetrics = await metricsService.calculateTeamMetrics(organizationId, date);
  await metricsService.storeTeamMetrics(teamMetrics);
  logger.debug('Team metrics calculated', { organizationId, date: date.toISOString() });

  // If no specific user/repo, calculate for all active entities
  if (!userId && !repositoryId) {
    await metricsService.calculateIncrementalMetrics({
      organizationId,
      date,
    });
    logger.debug('All incremental metrics calculated', { organizationId, date: date.toISOString() });
  }
}

/**
 * Process batch metrics calculation
 * Used for calculating metrics over a date range
 */
async function processBatchCalculation(data: MetricsJobData): Promise<void> {
  const { organizationId, startDate, endDate, repositoryId } = data;

  if (!startDate || !endDate) {
    throw new Error('startDate and endDate are required for batch calculation');
  }

  logger.debug('Calculating batch metrics', {
    organizationId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  await metricsService.calculateBatchMetrics({
    organizationId,
    startDate,
    endDate,
    includeRepositories: repositoryId ? [repositoryId] : undefined,
  });

  logger.debug('Batch metrics calculation completed', {
    organizationId,
    days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
  });
}

/**
 * Process historical data import
 * Used when initially connecting a repository to backfill metrics
 */
async function processHistoricalCalculation(data: MetricsJobData): Promise<void> {
  const { organizationId, repositoryId, startDate, endDate } = data;

  if (!startDate || !endDate) {
    throw new Error('startDate and endDate are required for historical calculation');
  }

  logger.info('Calculating historical metrics', {
    organizationId,
    repositoryId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  // Historical calculation is similar to batch, but might have different logic
  // For example, we might want to fetch additional data from GitHub API
  await metricsService.calculateBatchMetrics({
    organizationId,
    startDate,
    endDate,
    includeRepositories: repositoryId ? [repositoryId] : undefined,
    recalculate: true, // Overwrite existing metrics
  });

  logger.info('Historical metrics calculation completed', {
    organizationId,
    repositoryId,
    days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
  });
}

/**
 * Job completed handler
 */
export function onJobCompleted(job: Bull.Job<MetricsJobData>, result: any): void {
  logger.info('Metrics job completed', {
    jobId: job.id,
    organizationId: job.data.organizationId,
    processedOn: new Date().toISOString(),
  });
}

/**
 * Job failed handler
 */
export function onJobFailed(job: Bull.Job<MetricsJobData>, error: Error): void {
  logger.error('Metrics job failed', {
    jobId: job.id,
    organizationId: job.data.organizationId,
    error: error.message,
    stack: error.stack,
    attemptsMade: job.attemptsMade,
    attemptsTotal: job.opts.attempts,
  });
}

/**
 * Job stalled handler (job took too long)
 */
export function onJobStalled(job: Bull.Job<MetricsJobData>): void {
  logger.warn('Metrics job stalled', {
    jobId: job.id,
    organizationId: job.data.organizationId,
    stalledAt: new Date().toISOString(),
  });
}

/**
 * Graceful shutdown
 */
export async function shutdownWorker(queue: Bull.Queue): Promise<void> {
  logger.info('Shutting down metrics worker...');
  
  try {
    await queue.close();
    logger.info('Metrics worker shut down successfully');
  } catch (error) {
    logger.error('Error shutting down metrics worker', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
