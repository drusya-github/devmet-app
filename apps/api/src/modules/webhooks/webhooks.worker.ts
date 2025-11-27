/**
 * Webhook Worker
 * Processes webhook events from the Bull queue
 */
import { webhookQueue } from './webhooks.queue';
import { processWebhookEvent } from './webhooks.processor';
import { prisma } from '../../database/prisma.client';
import { logger } from '../../config/logger';
import type { WebhookJobData } from './webhooks.types';

/**
 * Worker configuration
 */
const CONCURRENCY = 5; // Process 5 jobs concurrently

/**
 * Start the webhook worker
 * Processes webhook events from the queue
 */
export function startWebhookWorker() {
  logger.info('Starting webhook worker', {
    concurrency: CONCURRENCY,
    queue: 'webhooks',
  });

  // Process webhook events
  webhookQueue.process(CONCURRENCY, async (job) => {
    const { event, deliveryId, repositoryId, payload, receivedAt } = job.data;

    logger.info('Processing webhook job', {
      jobId: job.id,
      event,
      deliveryId,
      repositoryId,
      attempt: job.attemptsMade + 1,
      maxAttempts: job.opts.attempts,
      receivedAt,
    });

    try {
      // Process the webhook event
      const result = await processWebhookEvent(event, deliveryId, payload);

      // Update event record as processed
      await markEventAsProcessed(deliveryId, result.success);

      if (!result.success) {
        throw new Error(result.error || 'Processing failed');
      }

      logger.info('Webhook job completed successfully', {
        jobId: job.id,
        event,
        deliveryId,
        repositoryId,
        processingTimeMs: result.metadata?.processingTimeMs,
      });

      return result;
    } catch (error) {
      logger.error('Webhook job processing failed', {
        jobId: job.id,
        event,
        deliveryId,
        repositoryId,
        attempt: job.attemptsMade + 1,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Update event as failed
      await markEventAsProcessed(deliveryId, false);

      // Re-throw to trigger Bull's retry mechanism
      throw error;
    }
  });

  logger.info('Webhook worker started successfully');
}

/**
 * Stop the webhook worker
 */
export async function stopWebhookWorker() {
  logger.info('Stopping webhook worker...');
  
  // Wait for all active jobs to complete
  await webhookQueue.close();
  
  logger.info('Webhook worker stopped');
}

/**
 * Helper: Mark event as processed in database
 * 
 * Note: This function attempts to find and update the Event record.
 * GitHub delivery IDs are UUIDs (strings), but the Event.githubId field is BigInt.
 * In Task 020, events are stored with numeric githubId when possible.
 * This function handles both cases gracefully.
 */
async function markEventAsProcessed(deliveryId: string, success: boolean): Promise<void> {
  try {
    // Try to find event by delivery ID
    // The actual storage mechanism depends on Task 020 implementation
    let event = null;
    
    // If deliveryId is numeric, try BigInt conversion
    if (/^\d+$/.test(deliveryId)) {
      event = await prisma.event.findFirst({
        where: { githubId: BigInt(deliveryId) },
        select: { id: true },
      });
    }
    
    // If still not found and this looks like a UUID, we can't match it
    // because githubId is BigInt in the schema (this is a schema design issue)
    // For now, we'll just log and continue - the webhook endpoint should store
    // events with numeric githubId if possible
    
    if (event) {
      await prisma.event.update({
        where: { id: event.id },
        data: {
          processed: success,
          processedAt: new Date(),
        },
      });

      logger.debug('Event marked as processed', {
        deliveryId,
        eventId: event.id,
        success,
      });
    } else {
      // This is expected for UUID delivery IDs until schema is updated
      logger.debug('Event not found in database (may be UUID delivery ID)', { 
        deliveryId,
        isNumeric: /^\d+$/.test(deliveryId),
      });
    }
  } catch (error) {
    logger.error('Failed to mark event as processed', {
      deliveryId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Don't throw - this is not critical for job completion
  }
}

/**
 * Get worker health status
 */
export async function getWorkerHealth() {
  try {
    const [isPaused, isReady] = await Promise.all([
      webhookQueue.isPaused(),
      webhookQueue.isReady(),
    ]);

    return {
      healthy: isReady && !isPaused,
      isPaused,
      isReady,
      name: 'webhook-worker',
      concurrency: CONCURRENCY,
    };
  } catch (error) {
    logger.error('Failed to get worker health', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Auto-start worker if this file is run directly
if (require.main === module) {
  logger.info('Starting webhook worker in standalone mode...');
  
  startWebhookWorker();

  // Handle graceful shutdown
  const shutdown = async () => {
    logger.info('Received shutdown signal');
    await stopWebhookWorker();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}