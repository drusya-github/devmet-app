/**
 * Metrics Queue Configuration (Placeholder for Task 023)
 * This is a stub that will be fully implemented in Task 023
 */
import Bull from 'bull';
import { config } from '../../config';
import { logger } from '../../config/logger';


export type TimeWindow = 'daily' | 'weekly' | 'monthly';
export type MetricsJobSource = 'webhook' | 'manual' | 'scheduler';
/**
export type MetricsJobSource = 'webhook' | 'manual' | 'scheduler';

/**
 * Metrics calculation job data
 */
export interface MetricsJobData {
  organizationId: string;
  userId?: string;        // Optional - if calculating for specific user
  repositoryId?: string;  // Optional - if calculating for specific repo

  // For single-day / incremental calculations
  date?: string | Date;

  // Where the job came from (webhook, manual trigger, scheduler, etc.)
  source?: MetricsJobSource;

  // For range-based calculations
  startDate?: Date;
  endDate?: Date;
  timeWindow?: TimeWindow;

  calculationType: 'incremental' | 'batch' | 'historical';
}

/**
 * Metrics queue for calculating developer, team, and repository metrics
 * Uses Redis DB 1 for queues (shared with webhook queue)
 */
export const metricsQueue = new Bull<MetricsJobData>('metrics', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    db: 1, // Use DB 1 for queues
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5s, 10s, 20s
    },
    removeOnComplete: 100,
    removeOnFail: 500,
    timeout: 5 * 60 * 1000, // 5 minutes timeout
  },
});

/**
 * Add metrics calculation job to queue
 * @param data Metrics job data
 * @returns Job instance
 */
export async function queueMetricsCalculation(data: MetricsJobData) {
  try {
    const job = await metricsQueue.add(data, {
      priority: data.source === 'webhook' ? 1 : 10, // Webhooks have higher priority
    });

    logger.debug('Metrics calculation queued', {
      jobId: job.id,
      repositoryId: data.repositoryId,
      userId: data.userId,
      date: data.date,
      source: data.source,
    });

    return job;
  } catch (error) {
    logger.error('Failed to queue metrics calculation', {
      error: error instanceof Error ? error.message : 'Unknown error',
      data,
    });
    throw error;
  }
}

/**
 * Close queue gracefully
 */
export async function closeMetricsQueue() {
  logger.info('Closing metrics queue...');
  await metricsQueue.close();
  logger.info('Metrics queue closed');
}

// Note: Worker implementation will be added in Task 023
logger.info('Metrics queue initialized (worker pending Task 023)');
