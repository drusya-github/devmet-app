/**
 * Webhook Event Processor (Updated for Task 022)
 * Main dispatcher that routes events to specific processor modules
 */
import { logger } from '../../config/logger';
import type {
  GitHubWebhookEventType,
  PushEventPayload,
  PullRequestEventPayload,
  IssueEventPayload,
  PullRequestReviewEventPayload,
  WebhookProcessingResult,
} from './webhooks.types';
import type { ProcessingContext } from './processors/processors.types';
import {
  processPushEvent,
  processPullRequestEvent,
  processIssueEvent,
  processPullRequestReviewEvent,
} from './processors/processors-index';

/**
 * Main webhook event prnpm ocessor dispatcher
 * Routes events to specific handlers based on event type
 * 
 * This is the entry point for all webhook event processing
 */
export async function processWebhookEvent(
  eventType: GitHubWebhookEventType,
  deliveryId: string,
  payload: any
): Promise<WebhookProcessingResult> {
  const startTime = Date.now();
  
  // Create processing context
  const context: ProcessingContext = {
    deliveryId,
    eventType,
    receivedAt: new Date(),
  };

  try {
    logger.info('Processing webhook event', {
      eventType,
      deliveryId,
      repositoryId: payload.repository?.id,
      repositoryName: payload.repository?.full_name,
    });

    let result;

    // Route to specific processor
    switch (eventType) {
      case 'push':
        result = await processPushEvent(
          payload as PushEventPayload,
          context
        );
        break;

      case 'pull_request':
        result = await processPullRequestEvent(
          payload as PullRequestEventPayload,
          context
        );
        break;

      case 'issues':
        result = await processIssueEvent(
          payload as IssueEventPayload,
          context
        );
        break;

      case 'pull_request_review':
        result = await processPullRequestReviewEvent(
          payload as PullRequestReviewEventPayload,
          context
        );
        break;

      default:
        logger.warn('Unsupported event type', { 
          eventType, 
          deliveryId,
          availableTypes: ['push', 'pull_request', 'issues', 'pull_request_review'],
        });
        return {
          success: true, // Not an error, just unsupported
          event: eventType,
          deliveryId,
          processedAt: new Date(),
          metadata: { 
            skipped: true, 
            reason: 'unsupported_event_type',
            note: 'This event type is not currently processed',
          },
        };
    }

    const processingTime = Date.now() - startTime;

    logger.info('Webhook event processed successfully', {
      eventType,
      deliveryId,
      processingTimeMs: processingTime,
      recordsCreated: result.recordsCreated,
      recordsUpdated: result.recordsUpdated,
      skipped: result.metadata?.skipped || false,
    });

    return {
      success: true,
      event: eventType,
      deliveryId,
      processedAt: new Date(),
      metadata: {
        processingTimeMs: processingTime,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        ...result.metadata,
      },
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('Webhook event processing failed', {
      eventType,
      deliveryId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTimeMs: processingTime,
    });

    // Return failure result (will trigger retry in worker)
    return {
      success: false,
      event: eventType,
      deliveryId,
      processedAt: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: { 
        processingTimeMs: processingTime,
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      },
    };
  }
}