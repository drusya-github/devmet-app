/**
 * DevMetrics - Metrics Worker Bootstrap
 * Starts the Bull queue worker for metrics processing
 * 
 * Usage:
 *   npm run worker:metrics
 *   OR
 *   node dist/modules/metrics/worker.bootstrap.js
 */

import { metricsQueue } from './metrics.queue';
import {
  processMetricsJob,
  onJobCompleted,
  onJobFailed,
  onJobStalled,
  shutdownWorker,
} from './metrics.worker';
import { logger } from '../../utils/logger';

// Configure queue processing
const CONCURRENCY = 5; // Process 5 jobs concurrently
const TIMEOUT = 5 * 60 * 1000; // 5 minutes timeout per job

/**
 * Start the metrics worker
 */
async function startWorker() {
  logger.info('Starting metrics worker...', {
    concurrency: CONCURRENCY,
    timeout: `${TIMEOUT / 1000}s`,
  });

  // Register the job processor
  metricsQueue.process(CONCURRENCY, async (job) => {
    return await processMetricsJob(job);
  });

  // Register event handlers
  metricsQueue.on('completed', onJobCompleted);
  metricsQueue.on('failed', onJobFailed);
  metricsQueue.on('stalled', onJobStalled);

  // Additional event handlers for monitoring
  metricsQueue.on('active', (job) => {
    logger.debug('Metrics job started', {
      jobId: job.id,
      organizationId: job.data.organizationId,
    });
  });

  metricsQueue.on('waiting', (jobId) => {
    logger.debug('Metrics job waiting', { jobId });
  });

  metricsQueue.on('progress', (job, progress) => {
    logger.debug('Metrics job progress', {
      jobId: job.id,
      progress: `${progress}%`,
    });
  });

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down metrics worker...');
    await shutdownWorker(metricsQueue);
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down metrics worker...');
    await shutdownWorker(metricsQueue);
    process.exit(0);
  });

  logger.info('Metrics worker started successfully');
  logger.info('Waiting for metrics jobs...');
}

// Start the worker if this file is run directly
if (require.main === module) {
  startWorker().catch((error) => {
    logger.error('Failed to start metrics worker', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  });
}

export { startWorker };