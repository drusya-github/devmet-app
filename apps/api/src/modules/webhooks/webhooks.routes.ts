/**
 * Webhook Routes
 * Defines HTTP routes for GitHub webhook endpoints
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { webhookController } from './webhooks.controller';
import type { GitHubWebhookPayload } from './webhooks.types';

/**
 * Register webhook routes
 * 
 * Routes:
 * - POST /github - Main webhook endpoint (public, no auth)
 * - GET /health - Health check for webhook service
 * - GET /stats - Webhook statistics (requires auth)
 * - POST /ping - Webhook ping handler
 * 
 * Note: Webhook endpoints should NOT have rate limiting or authentication
 * as they need to receive events from GitHub reliably.
 * 
 * @param fastify - Fastify instance
 */
export async function webhooksRoutes(fastify: FastifyInstance): Promise<void> {
  // Add custom content type parser to capture raw body for signature verification
  // This must be done before registering routes
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    async (req: any, body: string) => {
      // Store raw body for HMAC verification
      req.rawBody = body;
      // Parse JSON
      try {
        return JSON.parse(body);
      } catch (err) {
        throw new Error('Invalid JSON');
      }
    }
  );

  /**
   * POST /api/webhooks/github
   * Main webhook endpoint that receives events from GitHub
   * 
   * This endpoint is PUBLIC and has NO authentication/rate limiting
   * Security is handled by HMAC signature verification
   */
  fastify.post<{
    Body: GitHubWebhookPayload;
  }>(
    '/github',
    async (request, reply) => {
      return webhookController.handleGitHubWebhook(request, reply);
    }
  );

  /**
   * POST /api/webhooks/ping
   * Handle GitHub webhook ping events
   * Sent when webhook is first created or tested
   */
  fastify.post('/ping', async (request, reply) => {
    return webhookController.handlePing(request, reply);
  });

  /**
   * GET /api/webhooks/health
   * Health check endpoint for webhook service
   */
  fastify.get('/health', async (request, reply) => {
    return webhookController.healthCheck(request, reply);
  });

  /**
   * GET /api/webhooks/stats
   * Get webhook processing statistics
   * Protected endpoint - requires authentication
   */
  fastify.get(
    '/stats',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      return webhookController.getStats(request, reply);
    }
  );
}

