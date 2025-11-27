import { processPushEvent } from '../../processors/push.processor';
import { prisma } from '../../../../database/prisma.client';
import { queueMetricsCalculation } from '../../../metrics/metrics.queue';

// Mock dependencies
jest.mock('../../../../database/prisma.client', () => ({
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
  },
}));

jest.mock('../../../metrics/metrics.queue', () => ({
  queueMetricsCalculation: jest.fn(),
}));

describe('Push Event Processor', () => {
  const mockRepo = {
    id: 'repo-1',
    githubId: BigInt(12345),
    name: 'test-repo',
    fullName: 'org/test-repo',
    orgId: 'org-1',
  };

  const mockContext = {
    deliveryId: 'delivery-123',
    eventType: 'push',
    receivedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process push event successfully', async () => {
    // Setup mocks
    (prisma.repository.findFirst as jest.Mock).mockResolvedValue(mockRepo);
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.commit.upsert as jest.Mock).mockResolvedValue({
      id: 'commit-1',
      githubId: 'abc123',
    });

    const payload = {
      repository: { id: 12345, full_name: 'org/test-repo' },
      commits: [
        {
          id: 'abc123',
          message: 'Test commit',
          author: {
            name: 'Test User',
            email: 'test@example.com',
            username: 'testuser',
          },
          timestamp: '2025-01-01T12:00:00Z',
          added: ['file1.ts'],
          removed: [],
          modified: ['file2.ts'],
        },
      ],
      pusher: { name: 'testuser' },
    };

    const result = await processPushEvent(payload as any, mockContext);

    expect(result.success).toBe(true);
    expect(result.recordsCreated).toBe(1);
    expect(prisma.commit.upsert).toHaveBeenCalledTimes(1);
    expect(queueMetricsCalculation).toHaveBeenCalled();
  });

  it('should skip unknown repository', async () => {
    (prisma.repository.findFirst as jest.Mock).mockResolvedValue(null);

    const payload = {
      repository: { id: 99999, full_name: 'unknown/repo' },
      commits: [],
      pusher: { name: 'testuser' },
    };

    const result = await processPushEvent(payload as any, mockContext);

    expect(result.success).toBe(true);
    expect(result.recordsCreated).toBe(0);
    expect(result.metadata?.skipped).toBe(true);
  });

  it('should handle processing errors', async () => {
    (prisma.repository.findFirst as jest.Mock).mockRejectedValue(
      new Error('Database error')
    );

    const payload = {
      repository: { id: 12345, full_name: 'org/test-repo' },
      commits: [],
      pusher: { name: 'testuser' },
    };

    await expect(processPushEvent(payload as any, mockContext)).rejects.toThrow(
      'Database error'
    );
  });
});