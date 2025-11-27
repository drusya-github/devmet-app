/**
 * Webhook Processor Unit Tests
 */
import { processWebhookEvent } from '../webhooks.processor';
import { prisma } from '../../../database/prisma.client';
import { queueMetricsCalculation } from '../../../modules/metrics/metrics.queue';

// Mock dependencies
jest.mock('../../../database/prisma.client', () => ({
  prisma: {
    repository: {
      findFirst: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    commit: {
      upsert: jest.fn(),
    },
    pullRequest: {
      upsert: jest.fn(),
    },
    issue: {
      upsert: jest.fn(),
    },
  },
}));

jest.mock('../../../modules/metrics/metrics.queue', () => ({
  queueMetricsCalculation: jest.fn(),
}));

describe('Webhook Processor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processWebhookEvent', () => {
    it('should process push events successfully', async () => {
      const mockRepo = {
        id: 'repo-1',
        githubId: BigInt(12345),
        name: 'test-repo',
        fullName: 'org/test-repo',
        orgId: 'org-1',
      };

      (prisma.repository.findFirst as jest.Mock).mockResolvedValue(mockRepo);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.commit.upsert as jest.Mock).mockResolvedValue({});
      (queueMetricsCalculation as jest.Mock).mockResolvedValue({});

      const payload = {
        repository: {
          id: 12345,
          name: 'test-repo',
          full_name: 'org/test-repo',
        },
        commits: [
          {
            id: 'abc123',
            message: 'Test commit',
            timestamp: '2025-11-13T12:00:00Z',
            author: {
              name: 'Test Author',
              email: 'test@example.com',
              username: 'testuser',
            },
            committer: {
              name: 'Test Author',
              email: 'test@example.com',
            },
            added: ['file1.ts'],
            removed: [],
            modified: ['file2.ts'],
          },
        ],
        pusher: {
          name: 'testuser',
          email: 'test@example.com',
        },
      };

      const result = await processWebhookEvent('push', 'delivery-123', payload);

      expect(result.success).toBe(true);
      expect(result.event).toBe('push');
      expect(result.deliveryId).toBe('delivery-123');
      expect(prisma.repository.findFirst).toHaveBeenCalled();
      expect(prisma.commit.upsert).toHaveBeenCalled();
      expect(queueMetricsCalculation).toHaveBeenCalled();
    });

    it('should skip processing for unknown repository', async () => {
      (prisma.repository.findFirst as jest.Mock).mockResolvedValue(null);

      const payload = {
        repository: {
          id: 99999,
          name: 'unknown-repo',
          full_name: 'org/unknown-repo',
        },
        commits: [],
        pusher: { name: 'test', email: 'test@example.com' },
      };

      const result = await processWebhookEvent('push', 'delivery-123', payload);

      expect(result.success).toBe(true);
      expect(prisma.commit.upsert).not.toHaveBeenCalled();
      expect(queueMetricsCalculation).not.toHaveBeenCalled();
    });

    it('should process pull request events', async () => {
      const mockRepo = {
        id: 'repo-1',
        githubId: BigInt(12345),
        name: 'test-repo',
        fullName: 'org/test-repo',
        orgId: 'org-1',
      };

      (prisma.repository.findFirst as jest.Mock).mockResolvedValue(mockRepo);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.pullRequest.upsert as jest.Mock).mockResolvedValue({});
      (queueMetricsCalculation as jest.Mock).mockResolvedValue({});

      const payload = {
        action: 'opened',
        repository: {
          id: 12345,
          name: 'test-repo',
          full_name: 'org/test-repo',
        },
        pull_request: {
          id: 54321,
          number: 42,
          title: 'Test PR',
          state: 'open',
          user: {
            login: 'testuser',
            id: 67890,
            avatar_url: 'https://example.com/avatar.png',
          },
          created_at: '2025-11-13T12:00:00Z',
          updated_at: '2025-11-13T12:00:00Z',
          merged: false,
          merged_at: null,
          closed_at: null,
          additions: 100,
          deletions: 50,
          changed_files: 5,
        },
      };

      const result = await processWebhookEvent('pull_request', 'delivery-456', payload);

      expect(result.success).toBe(true);
      expect(result.event).toBe('pull_request');
      expect(prisma.pullRequest.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { githubId: BigInt(54321) },
          create: expect.objectContaining({
            number: 42,
            title: 'Test PR',
            state: 'OPEN',
          }),
        })
      );
      expect(queueMetricsCalculation).toHaveBeenCalled();
    });

    it('should process issue events', async () => {
      const mockRepo = {
        id: 'repo-1',
        githubId: BigInt(12345),
        name: 'test-repo',
        fullName: 'org/test-repo',
        orgId: 'org-1',
      };

      (prisma.repository.findFirst as jest.Mock).mockResolvedValue(mockRepo);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.issue.upsert as jest.Mock).mockResolvedValue({});
      (queueMetricsCalculation as jest.Mock).mockResolvedValue({});

      const payload = {
        action: 'opened',
        repository: {
          id: 12345,
          name: 'test-repo',
          full_name: 'org/test-repo',
        },
        issue: {
          id: 11111,
          number: 10,
          title: 'Test Issue',
          state: 'open',
          user: {
            login: 'testuser',
            id: 67890,
            avatar_url: 'https://example.com/avatar.png',
          },
          created_at: '2025-11-13T12:00:00Z',
          closed_at: null,
        },
      };

      const result = await processWebhookEvent('issues', 'delivery-789', payload);

      expect(result.success).toBe(true);
      expect(result.event).toBe('issues');
      expect(prisma.issue.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { githubId: BigInt(11111) },
          create: expect.objectContaining({
            number: 10,
            title: 'Test Issue',
            state: 'OPEN',
          }),
        })
      );
      expect(queueMetricsCalculation).toHaveBeenCalled();
    });

    it('should handle unsupported event types gracefully', async () => {
      const payload = {
        repository: { id: 12345 },
      };

      const result = await processWebhookEvent('create' as any, 'delivery-999', payload);

      expect(result.success).toBe(true);
      expect(result.metadata?.skipped).toBe(true);
      expect(result.metadata?.reason).toBe('unsupported_event_type');
    });

    it('should handle processing errors', async () => {
      (prisma.repository.findFirst as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const payload = {
        repository: { id: 12345 },
        commits: [],
        pusher: { name: 'test', email: 'test@example.com' },
      };

      const result = await processWebhookEvent('push', 'delivery-error', payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should handle merged pull requests', async () => {
      const mockRepo = {
        id: 'repo-1',
        githubId: BigInt(12345),
        name: 'test-repo',
        fullName: 'org/test-repo',
        orgId: 'org-1',
      };

      (prisma.repository.findFirst as jest.Mock).mockResolvedValue(mockRepo);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.pullRequest.upsert as jest.Mock).mockResolvedValue({});
      (queueMetricsCalculation as jest.Mock).mockResolvedValue({});

      const payload = {
        action: 'closed',
        repository: { id: 12345, name: 'test-repo', full_name: 'org/test-repo' },
        pull_request: {
          id: 54321,
          number: 42,
          title: 'Test PR',
          state: 'closed',
          merged: true,
          user: { login: 'testuser', id: 67890, avatar_url: '' },
          created_at: '2025-11-13T12:00:00Z',
          updated_at: '2025-11-13T13:00:00Z',
          merged_at: '2025-11-13T13:00:00Z',
          closed_at: '2025-11-13T13:00:00Z',
          additions: 100,
          deletions: 50,
          changed_files: 5,
        },
      };

      const result = await processWebhookEvent('pull_request', 'delivery-merged', payload);

      expect(result.success).toBe(true);
      expect(prisma.pullRequest.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            state: 'MERGED',
          }),
        })
      );
    });
  });
});
