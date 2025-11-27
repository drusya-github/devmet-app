/**
 * Webhook Queue Configuration
 * Handles async processing of GitHub webhook events
 */

import Bull from 'bull';
import { config } from '../../config';
import { logger } from '../../config/logger';
import type { WebhookJobData } from './webhooks.types';

/**
 * Webhook queue for processing GitHub webhook events
 * Uses Redis DB 1 for queues (shared with import queue)
 */
export const webhookQueue = new Bull<WebhookJobData>('webhooks', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    db: 1, // Use DB 1 for queues
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // 2s, 4s, 8s
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs
    timeout: 2 * 60 * 1000, // 2 minutes timeout (webhooks should be fast)
  },
});

// Handle completed jobs
webhookQueue.on('completed', (job) => {
  logger.info('Webhook job completed', {
    jobId: job.id,
    event: job.data.event,
    deliveryId: job.data.deliveryId,
    repositoryId: job.data.repositoryId,
    attempts: job.attemptsMade,
  });
});

// Handle failed jobs
webhookQueue.on('failed', (job, error) => {
  logger.error('Webhook job failed permanently', {
    jobId: job.id,
    event: job.data.event,
    deliveryId: job.data.deliveryId,
    repositoryId: job.data.repositoryId,
    attempts: job.attemptsMade,
    error: error.message,
    stack: error.stack,
  });
});

// Handle stalled jobs
webhookQueue.on('stalled', (job) => {
  logger.warn('Webhook job stalled', {
    jobId: job.id,
    event: job.data.event,
    deliveryId: job.data.deliveryId,
    repositoryId: job.data.repositoryId,
  });
});

// Handle job errors
webhookQueue.on('error', (error) => {
  logger.error('Webhook queue error', {
    error: error.message,
    stack: error.stack,
  });
});

/**
 * Add webhook event to queue for async processing
 * @param data Webhook job data
 * @returns Job instance
 */
export async function queueWebhookEvent(data: WebhookJobData) {
  try {
    const job = await webhookQueue.add(data, {
      jobId: data.deliveryId, // Use deliveryId as job ID for idempotency
      removeOnComplete: true,
      removeOnFail: false,
    });

    logger.debug('Webhook event queued', {
      jobId: job.id,
      event: data.event,
      deliveryId: data.deliveryId,
      repositoryId: data.repositoryId,
    });

    return job;
  } catch (error) {
    logger.error('Failed to queue webhook event', {
      error: error instanceof Error ? error.message : 'Unknown error',
      event: data.event,
      deliveryId: data.deliveryId,
    });
    throw error;
  }
}

/**
 * Get queue statistics
 * @returns Queue job counts
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    webhookQueue.getWaitingCount(),
    webhookQueue.getActiveCount(),
    webhookQueue.getCompletedCount(),
    webhookQueue.getFailedCount(),
    webhookQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Clean up old jobs from queue
 * @param grace Grace period in milliseconds
 */
export async function cleanQueue(grace: number = 24 * 60 * 60 * 1000) {
  await webhookQueue.clean(grace, 'completed');
  await webhookQueue.clean(grace, 'failed');
  logger.info('Webhook queue cleaned', { graceMs: grace });
}

/**
 * Close queue gracefully
 */
export async function closeQueue() {
  logger.info('Closing webhook queue...');
  await webhookQueue.close();
  logger.info('Webhook queue closed');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await closeQueue();
});

process.on('SIGINT', async () => {
  await closeQueue();
});




