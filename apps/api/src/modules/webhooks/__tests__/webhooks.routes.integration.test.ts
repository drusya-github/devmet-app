/**
 * Webhook Routes Integration Tests
 * Tests for webhook HTTP endpoints with sample payloads
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { server, initializeServer } from '../../../server';
import { prisma } from '../../../database/prisma.client';
import { queueWebhookEvent } from '../webhooks.queue';

// Mock dependencies
jest.mock('../../../database/prisma.client', () => ({
  prisma: {
    repository: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('../webhooks.queue', () => ({
  queueWebhookEvent: jest.fn(),
  getQueueStats: jest.fn().mockResolvedValue({
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    total: 0,
  }),
}));

describe('Webhook Routes Integration Tests', () => {
  const testSecret = 'test-webhook-secret-for-testing-only';
  const samplePayloadsDir = path.join(__dirname, 'sample-payloads');

  beforeAll(async () => {
    // Initialize server for testing (registers routes without starting)
    await initializeServer();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await server.close();
  });

  /**
   * Helper function to generate HMAC signature
   */
  function generateSignature(payload: string): string {
    const hmac = crypto.createHmac('sha256', testSecret);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Helper function to load sample payload
   */
  function loadSamplePayload(filename: string): any {
    const filePath = path.join(samplePayloadsDir, filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  }

  describe('POST /api/webhooks/github', () => {
    const mockRepo = {
      id: 'repo-uuid',
      githubId: BigInt(123456789),
      name: 'test-repo',
      fullName: 'testuser/test-repo',
      organizationId: 'org-uuid',
      webhookSecret: testSecret,
    };

    beforeEach(() => {
      (prisma.repository.findFirst as jest.Mock).mockResolvedValue(mockRepo);
      (queueWebhookEvent as jest.Mock).mockResolvedValue({ id: 'job-id' });
    });

    it('should accept valid push webhook', async () => {
      const payload = loadSamplePayload('push.json');
      const payloadString = JSON.stringify(payload);
      const signature = generateSignature(payloadString);

      const response = await server.inject({
        method: 'POST',
        url: '/api/webhooks/github',
        payload: payloadString,
        headers: {
          'content-type': 'application/json',
          'x-github-event': 'push',
          'x-github-delivery': '12345678-1234-1234-1234-123456789abc',
          'x-hub-signature-256': signature,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('queued');
      expect(queueWebhookEvent).toHaveBeenCalled();
    });

    it('should accept valid pull_request webhook', async () => {
      const payload = loadSamplePayload('pull_request.json');
      const payloadString = JSON.stringify(payload);
      const signature = generateSignature(payloadString);

      const response = await server.inject({
        method: 'POST',
        url: '/api/webhooks/github',
        payload: payloadString,
        headers: {
          'content-type': 'application/json',
          'x-github-event': 'pull_request',
          'x-github-delivery': '12345678-1234-1234-1234-123456789abd',
          'x-hub-signature-256': signature,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(queueWebhookEvent).toHaveBeenCalled();
    });

    it('should accept valid issues webhook', async () => {
      const payload = loadSamplePayload('issues.json');
      const payloadString = JSON.stringify(payload);
      const signature = generateSignature(payloadString);

      const response = await server.inject({
        method: 'POST',
        url: '/api/webhooks/github',
        payload: payloadString,
        headers: {
          'content-type': 'application/json',
          'x-github-event': 'issues',
          'x-github-delivery': '12345678-1234-1234-1234-123456789abe',
          'x-hub-signature-256': signature,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(queueWebhookEvent).toHaveBeenCalled();
    });

    it('should accept valid pull_request_review webhook', async () => {
      const payload = loadSamplePayload('pull_request_review.json');
      const payloadString = JSON.stringify(payload);
      const signature = generateSignature(payloadString);

      const response = await server.inject({
        method: 'POST',
        url: '/api/webhooks/github',
        payload: payloadString,
        headers: {
          'content-type': 'application/json',
          'x-github-event': 'pull_request_review',
          'x-github-delivery': '12345678-1234-1234-1234-123456789abf',
          'x-hub-signature-256': signature,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(queueWebhookEvent).toHaveBeenCalled();
    });

    it('should reject webhook with invalid signature', async () => {
      const payload = loadSamplePayload('push.json');
      const payloadString = JSON.stringify(payload);

      const response = await server.inject({
        method: 'POST',
        url: '/api/webhooks/github',
        payload: payloadString,
        headers: {
          'content-type': 'application/json',
          'x-github-event': 'push',
          'x-github-delivery': '12345678-1234-1234-1234-123456789abc',
          'x-hub-signature-256': 'sha256=invalid_signature_here',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('failed');
      expect(queueWebhookEvent).not.toHaveBeenCalled();
    });

    it('should reject webhook with missing headers', async () => {
      const payload = loadSamplePayload('push.json');
      const payloadString = JSON.stringify(payload);

      const response = await server.inject({
        method: 'POST',
        url: '/api/webhooks/github',
        payload: payloadString,
        headers: {
          'content-type': 'application/json',
          // Missing required headers
        },
      });

      expect(response.statusCode).toBe(400);
      expect(queueWebhookEvent).not.toHaveBeenCalled();
    });

    it('should acknowledge unsupported event types', async () => {
      const payload = loadSamplePayload('push.json');
      const payloadString = JSON.stringify(payload);
      const signature = generateSignature(payloadString);

      const response = await server.inject({
        method: 'POST',
        url: '/api/webhooks/github',
        payload: payloadString,
        headers: {
          'content-type': 'application/json',
          'x-github-event': 'unsupported_event',
          'x-github-delivery': '12345678-1234-1234-1234-123456789abc',
          'x-hub-signature-256': signature,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('not supported');
      expect(queueWebhookEvent).not.toHaveBeenCalled();
    });

    it('should acknowledge webhooks for unknown repositories', async () => {
      const payload = loadSamplePayload('push.json');
      const payloadString = JSON.stringify(payload);
      const signature = generateSignature(payloadString);

      (prisma.repository.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await server.inject({
        method: 'POST',
        url: '/api/webhooks/github',
        payload: payloadString,
        headers: {
          'content-type': 'application/json',
          'x-github-event': 'push',
          'x-github-delivery': '12345678-1234-1234-1234-123456789abc',
          'x-hub-signature-256': signature,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('not connected');
      expect(queueWebhookEvent).not.toHaveBeenCalled();
    });

    it('should handle malformed JSON payload', async () => {
      const signature = generateSignature('invalid json');

      const response = await server.inject({
        method: 'POST',
        url: '/api/webhooks/github',
        payload: 'invalid json',
        headers: {
          'content-type': 'application/json',
          'x-github-event': 'push',
          'x-github-delivery': '12345678-1234-1234-1234-123456789abc',
          'x-hub-signature-256': signature,
        },
      });

      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/webhooks/ping', () => {
    it('should respond to ping requests', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/webhooks/ping',
        headers: {
          'x-github-event': 'ping',
          'x-github-delivery': '12345678-1234-1234-1234-123456789abc',
          'x-github-hook-id': '123',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.pong).toBe(true);
    });
  });

  describe('GET /api/webhooks/health', () => {
    it('should return health status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/webhooks/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      console.log('Health check response body:', JSON.stringify(body, null, 2));
      expect(body.status).toBe('healthy');
      expect(body.service).toBe('webhooks');
      expect(body.queue).toBeDefined();
    });
  });

  describe('GET /api/webhooks/stats', () => {
    it('should require authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/webhooks/stats',
      });

      expect(response.statusCode).toBe(401);
    });

    // Note: Testing with authentication would require setting up a valid JWT
    // This will be covered in end-to-end tests with actual authentication
  });
});

