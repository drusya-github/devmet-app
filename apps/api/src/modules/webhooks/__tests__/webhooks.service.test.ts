/**
 * Webhook Service Unit Tests
 * Tests for signature verification and webhook processing logic
 */

import crypto from 'crypto';
import { WebhookService } from '../webhooks.service';
import { prisma } from '../../../database/prisma.client';
import { queueWebhookEvent } from '../webhooks.queue';
import type { GitHubWebhookPayload } from '../webhooks.types';

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
}));

jest.mock('../../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('WebhookService', () => {
  let webhookService: WebhookService;
  const testSecret = 'test-webhook-secret';

  beforeEach(() => {
    webhookService = new WebhookService();
    jest.clearAllMocks();
  });

  describe('verifySignature', () => {
    it('should verify valid HMAC signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(payload);
      const validSignature = `sha256=${hmac.digest('hex')}`;

      const result = webhookService.verifySignature(payload, validSignature, testSecret);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const invalidSignature = 'sha256=invalid_signature_hash_here_1234567890abcdef';

      const result = webhookService.verifySignature(payload, invalidSignature, testSecret);

      expect(result.valid).toBe(false);
    });

    it('should reject signature without sha256= prefix', () => {
      const payload = JSON.stringify({ test: 'data' });
      const signature = 'invalid_format';

      const result = webhookService.verifySignature(payload, signature, testSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid signature format');
    });

    it('should handle Buffer payload', () => {
      const payload = Buffer.from(JSON.stringify({ test: 'data' }));
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(payload);
      const validSignature = `sha256=${hmac.digest('hex')}`;

      const result = webhookService.verifySignature(payload, validSignature, testSecret);

      expect(result.valid).toBe(true);
    });
  });

  describe('extractWebhookHeaders', () => {
    it('should extract valid webhook headers', () => {
      const headers = {
        'x-github-event': 'push',
        'x-github-delivery': '12345678-1234-1234-1234-123456789abc',
        'x-hub-signature-256': 'sha256=abcdef123456',
        'x-github-hook-id': '123',
      };

      const result = webhookService.extractWebhookHeaders(headers);

      expect(result).toEqual({
        event: 'push',
        deliveryId: '12345678-1234-1234-1234-123456789abc',
        signature: 'sha256=abcdef123456',
        hookId: '123',
      });
    });

    it('should return null if required headers are missing', () => {
      const headers = {
        'x-github-event': 'push',
        // Missing delivery ID and signature
      };

      const result = webhookService.extractWebhookHeaders(headers);

      expect(result).toBeNull();
    });

    it('should handle array header values', () => {
      const headers = {
        'x-github-event': ['push'],
        'x-github-delivery': ['12345678-1234-1234-1234-123456789abc'],
        'x-hub-signature-256': ['sha256=abcdef123456'],
      };

      const result = webhookService.extractWebhookHeaders(headers);

      expect(result?.event).toBe('push');
      expect(result?.deliveryId).toBe('12345678-1234-1234-1234-123456789abc');
    });
  });

  describe('isSupportedEventType', () => {
    it('should return true for supported event types', () => {
      const supportedEvents = [
        'push',
        'pull_request',
        'pull_request_review',
        'issues',
        'issue_comment',
        'create',
        'delete',
      ];

      supportedEvents.forEach((event) => {
        expect(webhookService.isSupportedEventType(event)).toBe(true);
      });
    });

    it('should return false for unsupported event types', () => {
      const unsupportedEvents = ['fork', 'star', 'watch', 'release'];

      unsupportedEvents.forEach((event) => {
        expect(webhookService.isSupportedEventType(event)).toBe(false);
      });
    });
  });

  describe('validateRepository', () => {
    it('should return valid result for connected repository', async () => {
      const mockRepo = {
        id: 'repo-uuid',
        githubId: BigInt(123456789),
        name: 'test-repo',
        fullName: 'testuser/test-repo',
        organizationId: 'org-uuid',
        webhookSecret: 'repo-secret',
      };

      (prisma.repository.findFirst as jest.Mock).mockResolvedValue(mockRepo);

      const result = await webhookService.validateRepository(123456789);

      expect(result.valid).toBe(true);
      expect(result.repository).toEqual(mockRepo);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid result for unknown repository', async () => {
      (prisma.repository.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await webhookService.validateRepository(999999999);

      expect(result.valid).toBe(false);
      expect(result.repository).toBeUndefined();
      expect(result.error).toContain('not found or not connected');
    });

    it('should handle database errors', async () => {
      (prisma.repository.findFirst as jest.Mock).mockRejectedValue(new Error('DB error'));

      const result = await webhookService.validateRepository(123456789);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Database error');
    });
  });

  describe('processWebhook', () => {
    const mockHeaders = {
      'x-github-event': 'push',
      'x-github-delivery': '12345678-1234-1234-1234-123456789abc',
      'x-hub-signature-256': '',
    };

    const mockPayload: GitHubWebhookPayload = {
      repository: {
        id: 123456789,
        node_id: 'test',
        name: 'test-repo',
        full_name: 'testuser/test-repo',
        private: false,
        owner: {
          login: 'testuser',
          id: 1234567,
          avatar_url: 'https://example.com/avatar.jpg',
          type: 'User',
        },
        html_url: 'https://github.com/testuser/test-repo',
        description: 'Test repo',
        fork: false,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-11-10T00:00:00Z',
        pushed_at: '2023-11-10T12:00:00Z',
        git_url: 'git://github.com/testuser/test-repo.git',
        ssh_url: 'git@github.com:testuser/test-repo.git',
        clone_url: 'https://github.com/testuser/test-repo.git',
        svn_url: 'https://github.com/testuser/test-repo',
        homepage: null,
        size: 100,
        stargazers_count: 5,
        watchers_count: 5,
        language: 'TypeScript',
        has_issues: true,
        has_projects: true,
        has_downloads: true,
        has_wiki: true,
        has_pages: false,
        forks_count: 2,
        archived: false,
        disabled: false,
        open_issues_count: 3,
        license: null,
        topics: [],
        visibility: 'public',
        default_branch: 'main',
      },
      sender: {
        login: 'testuser',
        id: 1234567,
        avatar_url: 'https://example.com/avatar.jpg',
        type: 'User',
      },
    };

    it('should successfully process valid webhook', async () => {
      const payload = JSON.stringify(mockPayload);
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(payload);
      const signature = `sha256=${hmac.digest('hex')}`;

      const headersWithSignature = {
        ...mockHeaders,
        'x-hub-signature-256': signature,
      };

      const mockRepo = {
        id: 'repo-uuid',
        githubId: BigInt(123456789),
        name: 'test-repo',
        fullName: 'testuser/test-repo',
        organizationId: 'org-uuid',
        webhookSecret: testSecret,
      };

      (prisma.repository.findFirst as jest.Mock).mockResolvedValue(mockRepo);
      (queueWebhookEvent as jest.Mock).mockResolvedValue({ id: 'job-id' });

      const result = await webhookService.processWebhook(
        headersWithSignature,
        payload,
        mockPayload
      );

      expect(result.success).toBe(true);
      expect(result.deliveryId).toBe(mockHeaders['x-github-delivery']);
      expect(queueWebhookEvent).toHaveBeenCalled();
    });

    it('should reject webhook with invalid signature', async () => {
      const payload = JSON.stringify(mockPayload);
      const headersWithInvalidSignature = {
        ...mockHeaders,
        'x-hub-signature-256': 'sha256=invalid_signature',
      };

      const mockRepo = {
        id: 'repo-uuid',
        githubId: BigInt(123456789),
        name: 'test-repo',
        fullName: 'testuser/test-repo',
        organizationId: 'org-uuid',
        webhookSecret: testSecret,
      };

      (prisma.repository.findFirst as jest.Mock).mockResolvedValue(mockRepo);

      const result = await webhookService.processWebhook(
        headersWithInvalidSignature,
        payload,
        mockPayload
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Signature verification');
      expect(queueWebhookEvent).not.toHaveBeenCalled();
    });

    it('should handle unsupported event types gracefully', async () => {
      const headersWithUnsupportedEvent = {
        ...mockHeaders,
        'x-github-event': 'unsupported_event',
        'x-hub-signature-256': 'sha256=valid',
      };

      const result = await webhookService.processWebhook(
        headersWithUnsupportedEvent,
        '',
        mockPayload
      );

      expect(result.success).toBe(true); // Should acknowledge but not process
      expect(result.message).toContain('not supported');
      expect(queueWebhookEvent).not.toHaveBeenCalled();
    });

    it('should handle unknown repositories gracefully', async () => {
      const payload = JSON.stringify(mockPayload);
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(payload);
      const signature = `sha256=${hmac.digest('hex')}`;

      const headersWithSignature = {
        ...mockHeaders,
        'x-hub-signature-256': signature,
      };

      (prisma.repository.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await webhookService.processWebhook(
        headersWithSignature,
        payload,
        mockPayload
      );

      expect(result.success).toBe(true); // Acknowledge to prevent retry
      expect(result.message).toContain('not connected');
      expect(queueWebhookEvent).not.toHaveBeenCalled();
    });

    it('should return error for missing headers', async () => {
      const result = await webhookService.processWebhook(
        {}, // Empty headers
        '',
        mockPayload
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required headers');
    });
  });
});

