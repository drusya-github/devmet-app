/**
 * Import Queue Configuration
 * Handles background processing of historical data imports
 */

import Bull from 'bull';
import { config } from '../../config';
import { logger } from '../../config/logger';

/**
 * Import queue for processing historical data imports
 * Uses Redis DB 1 for queues (same as webhook queue)
 */
export const importQueue = new Bull('imports', {
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
    removeOnComplete: 50, // Keep last 50 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs
    timeout: 30 * 60 * 1000, // 30 minutes timeout for large imports
  },
});

// Handle completed jobs
importQueue.on('completed', (job) => {
  logger.info('Import job completed', {
    jobId: job.id,
    repoId: job.data.repoId,
    attempts: job.attemptsMade,
  });
});

// Handle failed jobs
importQueue.on('failed', (job, error) => {
  logger.error('Import job failed permanently', {
    jobId: job.id,
    repoId: job.data.repoId,
    attempts: job.attemptsMade,
    error: error.message,
  });
});

// Handle stalled jobs
importQueue.on('stalled', (job) => {
  logger.warn('Import job stalled', {
    jobId: job.id,
    repoId: job.data.repoId,
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Closing import queue...');
  await importQueue.close();
});

process.on('SIGINT', async () => {
  logger.info('Closing import queue...');
  await importQueue.close();
});



