/**
 * Unit tests for Redis Client Service
 * Tests singleton pattern, connection management, health checks, and helper methods
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock Redis Client with proper typing
const mockRedisClient = {
  connect: jest.fn<() => Promise<void>>(),
  quit: jest.fn<() => Promise<string>>(),
  ping: jest.fn<() => Promise<string>>(),
  get: jest.fn<(key: string) => Promise<string | null>>(),
  set: jest.fn<(...args: any[]) => Promise<string>>(),
  del: jest.fn<(...keys: string[]) => Promise<number>>(),
  expire: jest.fn<(key: string, seconds: number) => Promise<number>>(),
  exists: jest.fn<(key: string) => Promise<number>>(),
  ttl: jest.fn<(key: string) => Promise<number>>(),
  keys: jest.fn<(pattern: string) => Promise<string[]>>(),
  info: jest.fn<(section: string) => Promise<string>>(),
  flushall: jest.fn<() => Promise<string>>(),
  on: jest.fn<(event: string, callback: Function) => void>(),
};

// Mock IORedis constructor
jest.mock('ioredis', () => {
  return jest.fn(() => mockRedisClient);
});

describe('Redis Client Service', () => {
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
      const { getRedisClient } = await import('../redis.client');

      const instance1 = getRedisClient();
      const instance2 = getRedisClient();

      expect(instance1).toBe(instance2);
    });

    it('should create only one Redis instance', async () => {
      const Redis = (await import('ioredis')).default;
      const { getRedisClient } = await import('../redis.client');

      getRedisClient();
      getRedisClient();
      getRedisClient();

      expect(Redis).toHaveBeenCalledTimes(1);
    });
  });

  describe('Connection Management', () => {
    it('should connect to Redis successfully', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.ping.mockResolvedValue('PONG');

      const { connectRedis } = await import('../redis.client');

      await expect(connectRedis()).resolves.not.toThrow();
      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(mockRedisClient.ping).toHaveBeenCalled();
    });

    it('should retry connection on failure', async () => {
      mockRedisClient.connect
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce(undefined);

      mockRedisClient.ping.mockResolvedValue('PONG');

      const { connectRedis } = await import('../redis.client');

      await expect(connectRedis()).resolves.not.toThrow();
      expect(mockRedisClient.connect).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      mockRedisClient.connect.mockRejectedValue(new Error('Connection failed'));

      const { connectRedis } = await import('../redis.client');

      await expect(connectRedis()).rejects.toThrow(/Failed to connect to Redis/);
    }, 15000); // Increase timeout for retry delays

    it('should throw error if PING fails', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.ping.mockResolvedValue('UNEXPECTED');

      const { connectRedis } = await import('../redis.client');

      await expect(connectRedis()).rejects.toThrow(/Redis PING failed/);
    });

    it('should disconnect from Redis successfully', async () => {
      mockRedisClient.quit.mockResolvedValue('OK');
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.ping.mockResolvedValue('PONG');

      const { connectRedis, disconnectRedis } = await import('../redis.client');

      await connectRedis();
      await expect(disconnectRedis()).resolves.not.toThrow();
      expect(mockRedisClient.quit).toHaveBeenCalled();
    });

    it('should skip connect if already connected', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.ping.mockResolvedValue('PONG');

      const { connectRedis } = await import('../redis.client');

      await connectRedis();
      await connectRedis(); // Second call should be skipped

      expect(mockRedisClient.connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when Redis is accessible', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');
      mockRedisClient.info.mockResolvedValue('used_memory_human:1.5M\r\n');

      const { checkRedisHealth } = await import('../redis.client');

      const health = await checkRedisHealth();

      expect(health.healthy).toBe(true);
      expect(health.latency).toBeGreaterThanOrEqual(0);
      expect(health.details?.connected).toBeDefined();
      expect(health.details?.memoryUsage).toBe('1.5M');
    });

    it('should return unhealthy status when Redis is not accessible', async () => {
      mockRedisClient.ping.mockRejectedValue(new Error('Connection error'));

      const { checkRedisHealth } = await import('../redis.client');

      const health = await checkRedisHealth();

      expect(health.healthy).toBe(false);
      expect(health.error).toBe('Connection error');
    });

    it('should handle health check when PING returns unexpected value', async () => {
      mockRedisClient.ping.mockResolvedValue('UNEXPECTED');

      const { checkRedisHealth } = await import('../redis.client');

      const health = await checkRedisHealth();

      expect(health.healthy).toBe(false);
      expect(health.error).toContain('Unexpected PING response');
    });

    it('should measure ping latency', async () => {
      mockRedisClient.ping.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve('PONG'), 50);
        });
      });
      mockRedisClient.info.mockResolvedValue('used_memory_human:1.5M\r\n');

      const { checkRedisHealth } = await import('../redis.client');

      const health = await checkRedisHealth();

      expect(health.healthy).toBe(true);
      expect(health.latency).toBeGreaterThanOrEqual(40); // Allow some margin
    });
  });

  describe('Connection Status', () => {
    it('should return false when not connected', async () => {
      const { isConnectedToRedis } = await import('../redis.client');

      expect(isConnectedToRedis()).toBe(false);
    });

    it('should return true after successful connection', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.ping.mockResolvedValue('PONG');

      const { connectRedis, isConnectedToRedis } = await import('../redis.client');

      await connectRedis();
      expect(isConnectedToRedis()).toBe(true);
    });
  });

  describe('Basic Operations', () => {
    describe('get', () => {
      it('should get a value from Redis', async () => {
        mockRedisClient.get.mockResolvedValue('test-value');

        const { get } = await import('../redis.client');

        const result = await get('test-key');

        expect(result).toBe('test-value');
        expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
      });

      it('should return null for non-existent key', async () => {
        mockRedisClient.get.mockResolvedValue(null);

        const { get } = await import('../redis.client');

        const result = await get('non-existent');

        expect(result).toBeNull();
      });
    });

    describe('getJSON', () => {
      it('should get and parse JSON value', async () => {
        const data = { id: 1, name: 'Test' };
        mockRedisClient.get.mockResolvedValue(JSON.stringify(data));

        const { getJSON } = await import('../redis.client');

        const result = await getJSON('test-key');

        expect(result).toEqual(data);
      });

      it('should return null for non-existent key', async () => {
        mockRedisClient.get.mockResolvedValue(null);

        const { getJSON } = await import('../redis.client');

        const result = await getJSON('non-existent');

        expect(result).toBeNull();
      });
    });

    describe('set', () => {
      it('should set a value without TTL', async () => {
        mockRedisClient.set.mockResolvedValue('OK');

        const { set } = await import('../redis.client');

        const result = await set('test-key', 'test-value');

        expect(result).toBe('OK');
        expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', 'test-value');
      });

      it('should set a value with TTL', async () => {
        mockRedisClient.set.mockResolvedValue('OK');

        const { set } = await import('../redis.client');

        const result = await set('test-key', 'test-value', 300);

        expect(result).toBe('OK');
        expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', 'test-value', 'EX', 300);
      });
    });

    describe('setJSON', () => {
      it('should set a JSON value', async () => {
        mockRedisClient.set.mockResolvedValue('OK');

        const { setJSON } = await import('../redis.client');

        const data = { id: 1, name: 'Test' };
        const result = await setJSON('test-key', data);

        expect(result).toBe('OK');
        expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', JSON.stringify(data));
      });

      it('should set a JSON value with TTL', async () => {
        mockRedisClient.set.mockResolvedValue('OK');

        const { setJSON } = await import('../redis.client');

        const data = { id: 1, name: 'Test' };
        const result = await setJSON('test-key', data, 300);

        expect(result).toBe('OK');
        expect(mockRedisClient.set).toHaveBeenCalledWith(
          'test-key',
          JSON.stringify(data),
          'EX',
          300
        );
      });
    });

    describe('del', () => {
      it('should delete a single key', async () => {
        mockRedisClient.del.mockResolvedValue(1);

        const { del } = await import('../redis.client');

        const result = await del('test-key');

        expect(result).toBe(1);
        expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
      });

      it('should delete multiple keys', async () => {
        mockRedisClient.del.mockResolvedValue(3);

        const { del } = await import('../redis.client');

        const result = await del('key1', 'key2', 'key3');

        expect(result).toBe(3);
        expect(mockRedisClient.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
      });
    });

    describe('expire', () => {
      it('should set expiration on a key', async () => {
        mockRedisClient.expire.mockResolvedValue(1);

        const { expire } = await import('../redis.client');

        const result = await expire('test-key', 300);

        expect(result).toBe(1);
        expect(mockRedisClient.expire).toHaveBeenCalledWith('test-key', 300);
      });
    });

    describe('exists', () => {
      it('should return true if key exists', async () => {
        mockRedisClient.exists.mockResolvedValue(1);

        const { exists } = await import('../redis.client');

        const result = await exists('test-key');

        expect(result).toBe(true);
      });

      it('should return false if key does not exist', async () => {
        mockRedisClient.exists.mockResolvedValue(0);

        const { exists } = await import('../redis.client');

        const result = await exists('non-existent');

        expect(result).toBe(false);
      });
    });

    describe('ttl', () => {
      it('should return remaining TTL', async () => {
        mockRedisClient.ttl.mockResolvedValue(300);

        const { ttl } = await import('../redis.client');

        const result = await ttl('test-key');

        expect(result).toBe(300);
      });

      it('should return -1 if key has no expiration', async () => {
        mockRedisClient.ttl.mockResolvedValue(-1);

        const { ttl } = await import('../redis.client');

        const result = await ttl('test-key');

        expect(result).toBe(-1);
      });
    });
  });

  describe('Session Management', () => {
    describe('setSession', () => {
      it('should set a session with default TTL', async () => {
        mockRedisClient.set.mockResolvedValue('OK');

        const { setSession, DEFAULT_TTL } = await import('../redis.client');

        const sessionData = { userId: 1, role: 'admin' };
        await setSession('session-123', sessionData);

        expect(mockRedisClient.set).toHaveBeenCalledWith(
          'session:session-123',
          JSON.stringify(sessionData),
          'EX',
          DEFAULT_TTL.SESSION
        );
      });

      it('should set a session with custom TTL', async () => {
        mockRedisClient.set.mockResolvedValue('OK');

        const { setSession } = await import('../redis.client');

        const sessionData = { userId: 1, role: 'admin' };
        await setSession('session-123', sessionData, 600);

        expect(mockRedisClient.set).toHaveBeenCalledWith(
          'session:session-123',
          JSON.stringify(sessionData),
          'EX',
          600
        );
      });
    });

    describe('getSession', () => {
      it('should get a session', async () => {
        const sessionData = { userId: 1, role: 'admin' };
        mockRedisClient.get.mockResolvedValue(JSON.stringify(sessionData));

        const { getSession } = await import('../redis.client');

        const result = await getSession('session-123');

        expect(result).toEqual(sessionData);
        expect(mockRedisClient.get).toHaveBeenCalledWith('session:session-123');
      });

      it('should return null for non-existent session', async () => {
        mockRedisClient.get.mockResolvedValue(null);

        const { getSession } = await import('../redis.client');

        const result = await getSession('non-existent');

        expect(result).toBeNull();
      });
    });

    describe('deleteSession', () => {
      it('should delete a session', async () => {
        mockRedisClient.del.mockResolvedValue(1);

        const { deleteSession } = await import('../redis.client');

        const result = await deleteSession('session-123');

        expect(result).toBe(1);
        expect(mockRedisClient.del).toHaveBeenCalledWith('session:session-123');
      });
    });

    describe('extendSession', () => {
      it('should extend session TTL with default duration', async () => {
        mockRedisClient.expire.mockResolvedValue(1);

        const { extendSession, DEFAULT_TTL } = await import('../redis.client');

        const result = await extendSession('session-123');

        expect(result).toBe(1);
        expect(mockRedisClient.expire).toHaveBeenCalledWith(
          'session:session-123',
          DEFAULT_TTL.SESSION
        );
      });

      it('should extend session TTL with custom duration', async () => {
        mockRedisClient.expire.mockResolvedValue(1);

        const { extendSession } = await import('../redis.client');

        const result = await extendSession('session-123', 600);

        expect(result).toBe(1);
        expect(mockRedisClient.expire).toHaveBeenCalledWith('session:session-123', 600);
      });
    });
  });

  describe('Cache Invalidation', () => {
    describe('deletePattern', () => {
      it('should delete all keys matching pattern', async () => {
        mockRedisClient.keys.mockResolvedValue(['key1', 'key2', 'key3']);
        mockRedisClient.del.mockResolvedValue(3);

        const { deletePattern } = await import('../redis.client');

        const result = await deletePattern('cache:*');

        expect(result).toBe(3);
        expect(mockRedisClient.keys).toHaveBeenCalledWith('cache:*');
        expect(mockRedisClient.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
      });

      it('should return 0 if no keys match pattern', async () => {
        mockRedisClient.keys.mockResolvedValue([]);

        const { deletePattern } = await import('../redis.client');

        const result = await deletePattern('non-existent:*');

        expect(result).toBe(0);
        expect(mockRedisClient.del).not.toHaveBeenCalled();
      });
    });

    describe('invalidateCache', () => {
      it('should invalidate cache for resource type without ID', async () => {
        mockRedisClient.keys.mockResolvedValue(['cache:user:1:*', 'cache:user:2:*']);
        mockRedisClient.del.mockResolvedValue(2);

        const { invalidateCache } = await import('../redis.client');

        const result = await invalidateCache('user');

        expect(result).toBe(2);
        expect(mockRedisClient.keys).toHaveBeenCalledWith('cache:user:*');
      });

      it('should invalidate cache for specific resource', async () => {
        mockRedisClient.keys.mockResolvedValue(['cache:user:123:profile']);
        mockRedisClient.del.mockResolvedValue(1);

        const { invalidateCache } = await import('../redis.client');

        const result = await invalidateCache('user', 123);

        expect(result).toBe(1);
        expect(mockRedisClient.keys).toHaveBeenCalledWith('cache:user:123:*');
      });
    });

    describe('flushAll', () => {
      it('should flush all data from Redis', async () => {
        mockRedisClient.flushall.mockResolvedValue('OK');

        const { flushAll } = await import('../redis.client');

        const result = await flushAll();

        expect(result).toBe('OK');
        expect(mockRedisClient.flushall).toHaveBeenCalled();
      });
    });
  });
});
