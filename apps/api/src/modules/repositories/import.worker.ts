/**
 * Import Worker
 * Processes historical data import jobs from the queue
 */

import { importQueue } from './import.queue';
import { importService } from './import.service';
import { logger } from '../../config/logger';

/**
 * Process import jobs from the queue
 * Handles importing historical data for repositories
 */
export function startImportWorker(): void {
  logger.info('Starting import worker...');

  // Process import jobs (3 concurrent workers)
  importQueue.process('import-historical-data', 3, async (job) => {
    const { repoId, days = 90 } = job.data;

    logger.info('Processing import job', {
      jobId: job.id,
      repoId,
      days,
      attempt: job.attemptsMade + 1,
    });

    try {
      const result = await importService.importHistoricalData(repoId, days);

      logger.info('Import job completed successfully', {
        jobId: job.id,
        repoId,
        commits: result.commits,
        pullRequests: result.pullRequests,
        issues: result.issues,
        errors: result.errors.length,
      });

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      logger.error('Import job failed', {
        jobId: job.id,
        repoId,
        attempt: job.attemptsMade + 1,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Re-throw to trigger retry
      throw error;
    }
  });

  logger.info('Import worker started successfully');
}

/**
 * Stop the import worker gracefully
 */
export async function stopImportWorker(): Promise<void> {
  logger.info('Stopping import worker...');
  await importQueue.close();
  logger.info('Import worker stopped');
}



