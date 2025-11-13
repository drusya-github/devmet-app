/**
 * Webhook Controller
 * Handles GitHub webhook HTTP requests
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../config/logger';
import { webhookService } from './webhooks.service';
import { baseWebhookPayloadSchema } from './webhooks.validation';
import type { GitHubWebhookPayload } from './webhooks.types';

/**
 * GitHub Webhook Controller
 */
export class WebhookController {
  /**
   * Handle GitHub webhook POST requests
   * 
   * This endpoint receives webhook events from GitHub.
   * It must respond quickly (within 10 seconds) to avoid timeouts.
   * 
   * Process:
   * 1. Extract headers and validate
   * 2. Verify webhook signature (HMAC SHA-256)
   * 3. Validate payload structure
   * 4. Queue event for async processing
   * 5. Return 200 OK immediately
   * 
   * @param request - Fastify request
   * @param reply - Fastify reply
   */
  async handleGitHubWebhook(
    request: FastifyRequest<{
      Body: GitHubWebhookPayload;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Get raw body for signature verification
      // Fastify provides rawBody if configured in route
      const rawBody = (request as any).rawBody || JSON.stringify(request.body);
      const payload = request.body;
      const headers = request.headers;

      // Log webhook receipt
      const event = headers['x-github-event'];
      const deliveryId = headers['x-github-delivery'];

      logger.info('Webhook received', {
        event,
        deliveryId,
        repositoryId: payload?.repository?.id,
        repositoryName: payload?.repository?.full_name,
      });

      // Validate basic payload structure
      const payloadValidation = baseWebhookPayloadSchema.safeParse(payload);
      if (!payloadValidation.success) {
        logger.warn('Invalid webhook payload structure', {
          event,
          deliveryId,
          errors: payloadValidation.error.issues,
        });

        return reply.code(400).send({
          error: 'Invalid payload structure',
          message: 'Webhook payload does not match expected format',
          details: payloadValidation.error.issues,
        });
      }

      // Process webhook (verify signature, validate, queue)
      const result = await webhookService.processWebhook(
        headers as Record<string, string>,
        rawBody,
        payload
      );

      const processingTime = Date.now() - startTime;

      if (!result.success) {
        // Determine appropriate status code based on error type
        const isValidationError = result.error?.includes('Missing required headers') || 
                                   result.error?.includes('Invalid webhook headers');
        const statusCode = isValidationError ? 400 : 401;
        
        logger.error('Webhook processing failed', {
          event,
          deliveryId,
          error: result.error,
          processingTimeMs: processingTime,
        });

        return reply.code(statusCode).send({
          error: 'Webhook processing failed',
          message: result.message,
          deliveryId: result.deliveryId,
        });
      }

      // Success - webhook queued for processing
      logger.info('Webhook processed successfully', {
        event,
        deliveryId,
        processingTimeMs: processingTime,
      });

      return reply.code(200).send({
        success: true,
        message: result.message,
        deliveryId: result.deliveryId,
        receivedAt: new Date().toISOString(),
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Unhandled error processing webhook', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        processingTimeMs: processingTime,
      });

      // Always return 200 to prevent GitHub from retrying
      // Log the error for investigation
      return reply.code(200).send({
        success: false,
        message: 'Internal error processing webhook',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Health check endpoint for webhooks
   * Can be used to verify the webhook endpoint is accessible
   * 
   * @param request - Fastify request
   * @param reply - Fastify reply
   */
  async healthCheck(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const stats = await webhookService.getWebhookStats();

      return reply.code(200).send({
        status: 'healthy',
        service: 'webhooks',
        timestamp: new Date().toISOString(),
        queue: stats.queue,
      });
    } catch (error) {
      logger.error('Webhook health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return reply.code(503).send({
        status: 'unhealthy',
        service: 'webhooks',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get webhook statistics
   * Protected endpoint for monitoring
   * 
   * @param request - Fastify request
   * @param reply - Fastify reply
   */
  async getStats(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const stats = await webhookService.getWebhookStats();

      return reply.code(200).send({
        success: true,
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to get webhook stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return reply.code(500).send({
        success: false,
        error: 'Failed to retrieve webhook statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Verify webhook configuration
   * GitHub sends a ping event when webhook is created
   * 
   * @param request - Fastify request
   * @param reply - Fastify reply
   */
  async handlePing(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const deliveryId = request.headers['x-github-delivery'];
    const hookId = request.headers['x-github-hook-id'];

    logger.info('Webhook ping received', {
      deliveryId,
      hookId,
    });

    return reply.code(200).send({
      success: true,
      message: 'Webhook endpoint is configured correctly',
      pong: true,
      deliveryId,
    });
  }
}

// Export singleton instance
export const webhookController = new WebhookController();

