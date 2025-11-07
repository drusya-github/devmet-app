/**
 * Unit tests for Prisma Client Service
 * Tests singleton pattern, connection management, and health checks
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { PrismaClient } from '@prisma/client';

// Mock Prisma Client with proper typing
const mockPrismaClient = {
  $connect: jest.fn<() => Promise<void>>(),
  $disconnect: jest.fn<() => Promise<void>>(),
  $queryRaw: jest.fn<(...args: any[]) => Promise<any>>(),
  $on: jest.fn<(event: string, callback: Function) => void>(),
} as unknown as PrismaClient;

// Mock the Prisma Client constructor
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient),
}));

describe('Prisma Client Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset module cache to get fresh instance
    jest.resetModules();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', async () => {
      const { getPrismaClient } = await import('../prisma.client');

      const instance1 = getPrismaClient();
      const instance2 = getPrismaClient();

      expect(instance1).toBe(instance2);
    });

    it('should create only one PrismaClient instance', async () => {
      const { PrismaClient } = await import('@prisma/client');
      const { getPrismaClient } = await import('../prisma.client');

      getPrismaClient();
      getPrismaClient();
      getPrismaClient();

      expect(PrismaClient).toHaveBeenCalledTimes(1);
    });
  });

  describe('Connection Management', () => {
    it('should connect to database successfully', async () => {
      (mockPrismaClient.$connect as any).mockResolvedValue(undefined);
      (mockPrismaClient.$queryRaw as any).mockResolvedValue([{ connection_test: 1 }]);

      const { connectDatabase } = await import('../prisma.client');

      await expect(connectDatabase()).resolves.not.toThrow();
      expect(mockPrismaClient.$connect).toHaveBeenCalled();
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalled();
    });

    it('should retry connection on failure', async () => {
      (mockPrismaClient.$connect as any)
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce(undefined);

      (mockPrismaClient.$queryRaw as any).mockResolvedValue([{ connection_test: 1 }]);

      const { connectDatabase } = await import('../prisma.client');

      await expect(connectDatabase()).resolves.not.toThrow();
      expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      (mockPrismaClient.$connect as any).mockRejectedValue(new Error('Connection failed'));

      const { connectDatabase } = await import('../prisma.client');

      await expect(connectDatabase()).rejects.toThrow(/Failed to connect to database/);
    }, 15000); // Increase timeout for retry delays

    it('should disconnect from database successfully', async () => {
      (mockPrismaClient.$disconnect as any).mockResolvedValue(undefined);
      (mockPrismaClient.$connect as any).mockResolvedValue(undefined);
      (mockPrismaClient.$queryRaw as any).mockResolvedValue([{ connection_test: 1 }]);

      const { connectDatabase, disconnectDatabase } = await import('../prisma.client');

      await connectDatabase();
      await expect(disconnectDatabase()).resolves.not.toThrow();
      expect(mockPrismaClient.$disconnect).toHaveBeenCalled();
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when database is accessible', async () => {
      (mockPrismaClient.$queryRaw as any).mockResolvedValue([{ health_check: 1 }]);

      const { checkDatabaseHealth } = await import('../prisma.client');

      const health = await checkDatabaseHealth();

      expect(health.healthy).toBe(true);
      expect(health.latency).toBeGreaterThanOrEqual(0);
      expect(health.details?.connected).toBeDefined();
    });

    it('should return unhealthy status when database is not accessible', async () => {
      (mockPrismaClient.$queryRaw as any).mockRejectedValue(new Error('Connection error'));

      const { checkDatabaseHealth } = await import('../prisma.client');

      const health = await checkDatabaseHealth();

      expect(health.healthy).toBe(false);
      expect(health.error).toBe('Connection error');
    });

    it('should measure query latency', async () => {
      (mockPrismaClient.$queryRaw as any).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve([{ health_check: 1 }]), 50);
        });
      });

      const { checkDatabaseHealth } = await import('../prisma.client');

      const health = await checkDatabaseHealth();

      expect(health.healthy).toBe(true);
      expect(health.latency).toBeGreaterThanOrEqual(40); // Allow some margin
    });
  });

  describe('Connection Status', () => {
    it('should return false when not connected', async () => {
      const { isConnectedToDatabase } = await import('../prisma.client');

      expect(isConnectedToDatabase()).toBe(false);
    });

    it('should return true after successful connection', async () => {
      (mockPrismaClient.$connect as any).mockResolvedValue(undefined);
      (mockPrismaClient.$queryRaw as any).mockResolvedValue([{ connection_test: 1 }]);

      const { connectDatabase, isConnectedToDatabase } = await import('../prisma.client');

      await connectDatabase();
      expect(isConnectedToDatabase()).toBe(true);
    });
  });

  describe('Retry Helper', () => {
    it('should execute function successfully on first try', async () => {
      const mockFn = jest.fn<() => Promise<string>>().mockResolvedValue('success');

      const { withRetry } = await import('../prisma.client');

      const result = await withRetry(mockFn, 3);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const mockFn = jest
        .fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');

      const { withRetry } = await import('../prisma.client');

      const result = await withRetry(mockFn, 3);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    }, 10000);

    it('should throw error after all retries fail', async () => {
      const mockFn = jest.fn<() => Promise<string>>().mockRejectedValue(new Error('Always fails'));

      const { withRetry } = await import('../prisma.client');

      await expect(withRetry(mockFn, 3)).rejects.toThrow('Always fails');
      expect(mockFn).toHaveBeenCalledTimes(3);
    }, 10000);
  });
});
