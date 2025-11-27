/**
 * Webhook Worker Unit Tests
 */
import { webhookQueue } from '../webhooks.queue';
import { processWebhookEvent } from '../webhooks.processor';
import { prisma } from '../../../database/prisma.client';
import { startWebhookWorker, stopWebhookWorker, getWorkerHealth } from '../webhooks.worker';

// Mock dependencies
jest.mock('../webhooks.queue', () => ({
  webhookQueue: {
    process: jest.fn(),
    close: jest.fn(),
    isPaused: jest.fn(),
    isReady: jest.fn(),
    on: jest.fn(),
  },
}));

jest.mock('../webhooks.processor', () => ({
  processWebhookEvent: jest.fn(),
}));

jest.mock('../../../database/prisma.client', () => ({
  prisma: {
    event: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('Webhook Worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startWebhookWorker', () => {
    it('should start the worker with correct concurrency', () => {
      startWebhookWorker();

      expect(webhookQueue.process).toHaveBeenCalledWith(
        5, // concurrency
        expect.any(Function)
      );
    });

    it('should process jobs successfully', async () => {
      const mockJob = {
        id: 'job-123',
        data: {
          event: 'push',
          deliveryId: 'delivery-123',
          repositoryId: 12345,
          payload: { repository: { id: 12345 } },
          receivedAt: new Date(),
        },
        attemptsMade: 0,
        opts: { attempts: 3 },
      };

      const mockResult = {
        success: true,
        event: 'push',
        deliveryId: 'delivery-123',
        processedAt: new Date(),
        metadata: { processingTimeMs: 100 },
      };

      (processWebhookEvent as jest.Mock).mockResolvedValue(mockResult);
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({ id: 'event-1' });
      (prisma.event.update as jest.Mock).mockResolvedValue({});

      // Get the processor function
      let processorFn: any;
      (webhookQueue.process as jest.Mock).mockImplementation((concurrency, fn) => {
        processorFn = fn;
      });

      startWebhookWorker();

      // Call the processor function
      const result = await processorFn(mockJob);

      expect(result).toEqual(mockResult);
      expect(processWebhookEvent).toHaveBeenCalledWith(
        'push',
        'delivery-123',
        mockJob.data.payload
      );
      expect(prisma.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'event-1' },
          data: expect.objectContaining({
            processed: true,
            processedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should handle processing failures', async () => {
      const mockJob = {
        id: 'job-456',
        data: {
          event: 'pull_request',
          deliveryId: 'delivery-456',
          repositoryId: 12345,
          payload: { repository: { id: 12345 } },
          receivedAt: new Date(),
        },
        attemptsMade: 1,
        opts: { attempts: 3 },
      };

      const mockError = new Error('Processing failed');
      (processWebhookEvent as jest.Mock).mockRejectedValue(mockError);
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({ id: 'event-2' });
      (prisma.event.update as jest.Mock).mockResolvedValue({});

      let processorFn: any;
      (webhookQueue.process as jest.Mock).mockImplementation((concurrency, fn) => {
        processorFn = fn;
      });

      startWebhookWorker();

      // Should throw to trigger retry
      await expect(processorFn(mockJob)).rejects.toThrow('Processing failed');

      expect(prisma.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            processed: false,
          }),
        })
      );
    });

    it('should handle non-existent events gracefully', async () => {
      const mockJob = {
        id: 'job-789',
        data: {
          event: 'issues',
          deliveryId: 'delivery-789',
          repositoryId: 12345,
          payload: { repository: { id: 12345 } },
          receivedAt: new Date(),
        },
        attemptsMade: 0,
        opts: { attempts: 3 },
      };

      const mockResult = {
        success: true,
        event: 'issues',
        deliveryId: 'delivery-789',
        processedAt: new Date(),
        metadata: {},
      };

      (processWebhookEvent as jest.Mock).mockResolvedValue(mockResult);
      (prisma.event.findFirst as jest.Mock).mockResolvedValue(null);

      let processorFn: any;
      (webhookQueue.process as jest.Mock).mockImplementation((concurrency, fn) => {
        processorFn = fn;
      });

      startWebhookWorker();

      // Should not throw
      const result = await processorFn(mockJob);

      expect(result).toEqual(mockResult);
      expect(prisma.event.update).not.toHaveBeenCalled();
    });
  });

  describe('stopWebhookWorker', () => {
    it('should close the queue gracefully', async () => {
      (webhookQueue.close as jest.Mock).mockResolvedValue(undefined);

      await stopWebhookWorker();

      expect(webhookQueue.close).toHaveBeenCalled();
    });
  });

  describe('getWorkerHealth', () => {
    it('should return healthy status when queue is ready', async () => {
      (webhookQueue.isPaused as jest.Mock).mockResolvedValue(false);
      (webhookQueue.isReady as jest.Mock).mockResolvedValue(true);

      const health = await getWorkerHealth();

      expect(health.healthy).toBe(true);
      expect(health.isPaused).toBe(false);
      expect(health.isReady).toBe(true);
      expect(health.concurrency).toBe(5);
    });

    it('should return unhealthy status when queue is paused', async () => {
      (webhookQueue.isPaused as jest.Mock).mockResolvedValue(true);
      (webhookQueue.isReady as jest.Mock).mockResolvedValue(true);

      const health = await getWorkerHealth();

      expect(health.healthy).toBe(false);
      expect(health.isPaused).toBe(true);
    });

    it('should return unhealthy status when queue is not ready', async () => {
      (webhookQueue.isPaused as jest.Mock).mockResolvedValue(false);
      (webhookQueue.isReady as jest.Mock).mockResolvedValue(false);

      const health = await getWorkerHealth();

      expect(health.healthy).toBe(false);
      expect(health.isReady).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      (webhookQueue.isPaused as jest.Mock).mockRejectedValue(new Error('Redis error'));

      const health = await getWorkerHealth();

      expect(health.healthy).toBe(false);
      expect(health.error).toBe('Redis error');
    });
  });
});
