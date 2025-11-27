/**
 * Webhook Service
 * Business logic for GitHub webhook handling and signature verification
 */

import crypto from 'crypto';
import { config } from '../../config';
import { logger } from '../../config/logger';
import { prisma } from '../../database/prisma.client';
import { queueWebhookEvent } from './webhooks.queue';
import type {
  GitHubWebhookPayload,
  WebhookHeaders,
  SignatureVerificationResult,
  WebhookValidationResult,
  GitHubWebhookEventType,
  WebhookJobData,
} from './webhooks.types';
import { webhookEventTypeSchema } from './webhooks.validation';

/**
 * Webhook Service Class
 * Handles webhook signature verification, validation, and queueing
 */
export class WebhookService {
  /**
   * Verify GitHub webhook signature using HMAC SHA-256
   * 
   * GitHub signs webhook payloads with the webhook secret using HMAC-SHA256.
   * The signature is sent in the X-Hub-Signature-256 header.
   * 
   * @param payload - Raw webhook payload (string or Buffer)
   * @param signature - Signature from X-Hub-Signature-256 header
   * @param secret - Webhook secret (repository-specific or global)
   * @returns Verification result
   */
  verifySignature(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): SignatureVerificationResult {
    try {
      // GitHub sends signature in format: sha256=<signature>
      if (!signature.startsWith('sha256=')) {
        return {
          valid: false,
          error: 'Invalid signature format. Expected sha256=<signature>',
        };
      }

      // Extract the signature hash
      const signatureHash = signature.substring(7);

      // Calculate expected signature
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(payload);
      const expectedHash = hmac.digest('hex');

      // Use timing-safe comparison to prevent timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signatureHash, 'hex'),
        Buffer.from(expectedHash, 'hex')
      );

      if (!isValid) {
        logger.warn('Webhook signature verification failed', {
          receivedSignature: signature.substring(0, 20) + '...',
          expectedPrefix: 'sha256=' + expectedHash.substring(0, 10) + '...',
        });
      }

      return { valid: isValid };
    } catch (error) {
      logger.error('Error verifying webhook signature', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Signature verification error',
      };
    }
  }

  /**
   * Verify webhook signature using repository-specific secret
   * Falls back to global secret if repository secret is not available
   * 
   * @param payload - Raw webhook payload
   * @param signature - Signature from header
   * @param repositorySecret - Repository-specific webhook secret (if available)
   * @returns Verification result
   */
  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    repositorySecret?: string | null
  ): SignatureVerificationResult {
    // Try repository-specific secret first
    if (repositorySecret) {
      const result = this.verifySignature(payload, signature, repositorySecret);
      if (result.valid) {
        return result;
      }
      logger.debug('Repository-specific secret verification failed, trying global secret');
    }

    // Fall back to global webhook secret
    return this.verifySignature(payload, signature, config.github.webhookSecret);
  }

  /**
   * Extract webhook headers from request
   * 
   * @param headers - Request headers
   * @returns Webhook headers or null if invalid
   */
  extractWebhookHeaders(headers: Record<string, string | string[] | undefined>): WebhookHeaders | null {
    const event = this.getHeaderValue(headers['x-github-event']);
    const deliveryId = this.getHeaderValue(headers['x-github-delivery']);
    const signature = this.getHeaderValue(headers['x-hub-signature-256']);
    const hookId = this.getHeaderValue(headers['x-github-hook-id']);

    if (!event || !deliveryId || !signature) {
      logger.warn('Missing required webhook headers', {
        hasEvent: !!event,
        hasDeliveryId: !!deliveryId,
        hasSignature: !!signature,
      });
      return null;
    }

    return {
      event,
      deliveryId,
      signature,
      hookId,
    };
  }

  /**
   * Helper to get single string value from header
   */
  private getHeaderValue(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }

  /**
   * Validate webhook event type
   * 
   * @param eventType - GitHub event type
   * @returns Whether the event type is supported
   */
  isSupportedEventType(eventType: string): boolean {
    const result = webhookEventTypeSchema.safeParse(eventType);
    return result.success;
  }

  /**
   * Validate repository exists and is connected
   * 
   * @param repositoryId - GitHub repository ID
   * @returns Validation result with repository data
   */
  async validateRepository(repositoryId: number): Promise<WebhookValidationResult> {
    try {
      const repository = await prisma.repository.findFirst({
        where: {
          githubId: BigInt(repositoryId),
        },
        select: {
          id: true,
          githubId: true,
          name: true,
          fullName: true,
          organizationId: true,
          webhookSecret: true,
        },
      });

      if (!repository) {
        return {
          valid: false,
          error: `Repository with GitHub ID ${repositoryId} not found or not connected`,
        };
      }

      return {
        valid: true,
        repository,
      };
    } catch (error) {
      logger.error('Error validating repository', {
        repositoryId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        valid: false,
        error: 'Database error while validating repository',
      };
    }
  }

  /**
   * Process webhook event
   * Validates, verifies signature, and queues for async processing
   * 
   * @param headers - Request headers
   * @param rawPayload - Raw payload (for signature verification)
   * @param payload - Parsed webhook payload
   * @returns Processing result
   */
  async processWebhook(
    headers: Record<string, string | string[] | undefined>,
    rawPayload: string | Buffer,
    payload: GitHubWebhookPayload
  ): Promise<{
    success: boolean;
    message: string;
    deliveryId?: string;
    error?: string;
  }> {
    // Extract webhook headers
    const webhookHeaders = this.extractWebhookHeaders(headers);
    if (!webhookHeaders) {
      return {
        success: false,
        message: 'Invalid webhook headers',
        error: 'Missing required headers: X-GitHub-Event, X-GitHub-Delivery, X-Hub-Signature-256',
      };
    }

    const { event, deliveryId, signature } = webhookHeaders;

    logger.info('Processing webhook', {
      event,
      deliveryId,
      repositoryId: payload.repository.id,
      repositoryName: payload.repository.full_name,
    });

    // Check if event type is supported
    if (!this.isSupportedEventType(event)) {
      logger.debug('Unsupported webhook event type', {
        event,
        deliveryId,
      });

      return {
        success: true, // Return 200 to acknowledge receipt
        message: `Event type '${event}' not supported`,
        deliveryId,
      };
    }

    // Validate repository exists in our database
    const repoValidation = await this.validateRepository(payload.repository.id);
    if (!repoValidation.valid) {
      logger.warn('Webhook for unknown repository', {
        event,
        deliveryId,
        repositoryId: payload.repository.id,
        repositoryName: payload.repository.full_name,
        error: repoValidation.error,
      });

      return {
        success: true, // Return 200 to prevent GitHub from retrying
        message: repoValidation.error || 'Repository not connected',
        deliveryId,
      };
    }

    // Verify webhook signature
    const signatureResult = this.verifyWebhookSignature(
      rawPayload,
      signature,
      repoValidation.repository?.webhookSecret
    );

    if (!signatureResult.valid) {
      logger.error('Webhook signature verification failed', {
        event,
        deliveryId,
        repositoryId: payload.repository.id,
        error: signatureResult.error,
      });

      return {
        success: false,
        message: 'Signature verification failed',
        deliveryId,
        error: signatureResult.error || 'Invalid signature',
      };
    }

    // Queue webhook for async processing
    try {
      const jobData: WebhookJobData = {
        event: event as GitHubWebhookEventType,
        deliveryId,
        repositoryId: payload.repository.id,
        repositoryFullName: payload.repository.full_name,
        payload,
        receivedAt: new Date(),
      };

      await queueWebhookEvent(jobData);

      logger.info('Webhook queued successfully', {
        event,
        deliveryId,
        repositoryId: payload.repository.id,
      });

      return {
        success: true,
        message: 'Webhook received and queued for processing',
        deliveryId,
      };
    } catch (error) {
      logger.error('Failed to queue webhook', {
        event,
        deliveryId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        message: 'Failed to queue webhook for processing',
        deliveryId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get webhook statistics
   * 
   * @returns Webhook processing statistics
   */
  async getWebhookStats() {
    try {
      // Get queue stats (will be implemented in Task 21)
      const { getQueueStats } = await import('./webhooks.queue');
      const queueStats = await getQueueStats();

      // Get webhook count from events table (if exists)
      // This will be fully implemented in Task 21
      const stats = {
        queue: queueStats,
        totalReceived: 0, // To be implemented
        totalProcessed: 0, // To be implemented
        totalFailed: 0, // To be implemented
      };

      return stats;
    } catch (error) {
      logger.error('Error getting webhook stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

// Export singleton instance
export const webhookService = new WebhookService();
