/**
 * Redis Connection Service
 * Implements singleton pattern with connection pooling, retry logic, and health checks
 *
 * Features:
 * - Singleton pattern to prevent multiple Redis instances
 * - Connection retry logic with exponential backoff
 * - Graceful disconnect on shutdown
 * - Event logging for monitoring
 * - Helper methods for common operations (get, set, del, expire)
 * - Session management helpers
 * - Cache invalidation utilities
 * - Health check method
 */

import Redis, { RedisOptions } from 'ioredis';
import { config, isDevelopment } from '../config';
import { logger } from '../config/logger';

/**
 * Singleton instance of Redis Client
 * Prevents multiple connections to Redis
 */
let redisInstance: Redis | null = null;

/**
 * Connection state tracking
 */
let isConnected = false;
let isShuttingDown = false;

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Default TTL values (in seconds)
 */
export const DEFAULT_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 900, // 15 minutes
  LONG: 3600, // 1 hour
  SESSION: 86400, // 24 hours
  WEEK: 604800, // 7 days
};

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attemptNumber: number): number {
  const delay =
    RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attemptNumber - 1);
  return Math.min(delay, RETRY_CONFIG.maxDelayMs);
}

/**
 * Parse Redis URL to extract host and port
 */
function parseRedisUrl(url: string): { host: string; port: number } {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || 'localhost',
      port: parseInt(parsed.port, 10) || 6379,
    };
  } catch (error) {
    logger.warn('Failed to parse Redis URL, using defaults', { url });
    return { host: 'localhost', port: 6379 };
  }
}

/**
 * Creates and configures a new Redis Client instance
 */
function createRedisClient(): Redis {
  logger.info('Creating new Redis Client instance');

  const { host, port } = parseRedisUrl(config.redis.url);

  const options: RedisOptions = {
    host,
    port,
    maxRetriesPerRequest: RETRY_CONFIG.maxRetries,
    retryStrategy: (times: number) => {
      if (times > RETRY_CONFIG.maxRetries) {
        logger.error('Redis max retry attempts exceeded');
        return null; // Stop retrying
      }
      const delay = getRetryDelay(times);
      logger.info(`Redis retry attempt ${times}, waiting ${delay}ms`);
      return delay;
    },
    reconnectOnError: (err) => {
      logger.warn('Redis reconnecting due to error', {
        error: err.message,
      });
      return true;
    },
    enableReadyCheck: true,
    lazyConnect: true, // Don't connect immediately, we'll do it manually
  };

  const client = new Redis(options);

  // Event handlers for monitoring
  client.on('connect', () => {
    logger.info('Redis client connecting...');
  });

  client.on('ready', () => {
    isConnected = true;
    logger.info('Redis client ready', {
      host,
      port,
      environment: config.server.nodeEnv,
    });
  });

  client.on('error', (error) => {
    logger.error('Redis client error', {
      error: error.message,
      stack: error.stack,
    });
  });

  client.on('close', () => {
    isConnected = false;
    logger.info('Redis connection closed');
  });

  client.on('reconnecting', () => {
    logger.info('Redis client reconnecting...');
  });

  client.on('end', () => {
    isConnected = false;
    logger.info('Redis connection ended');
  });

  return client;
}

/**
 * Gets or creates the singleton Redis Client instance
 *
 * @returns {Redis} The singleton Redis Client instance
 */
export function getRedisClient(): Redis {
  if (!redisInstance) {
    redisInstance = createRedisClient();
    logger.info('Redis Client singleton instance created');
  }
  return redisInstance;
}

/**
 * Connects to Redis with retry logic
 * Implements exponential backoff for failed connection attempts
 *
 * @returns {Promise<void>}
 * @throws {Error} If connection fails after all retry attempts
 */
export async function connectRedis(): Promise<void> {
  if (isConnected) {
    logger.warn('Redis already connected, skipping connect');
    return;
  }

  if (isShuttingDown) {
    throw new Error('Cannot connect during shutdown');
  }

  const client = getRedisClient();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      logger.info(`Attempting Redis connection (attempt ${attempt}/${RETRY_CONFIG.maxRetries})`);

      await client.connect();

      // Verify connection with a simple command
      const pong = await client.ping();

      if (pong !== 'PONG') {
        throw new Error(`Redis PING failed, got: ${pong}`);
      }

      isConnected = true;
      logger.info('Redis connected successfully', {
        attempt,
        environment: config.server.nodeEnv,
      });

      return;
    } catch (error) {
      lastError = error as Error;
      logger.error(`Redis connection attempt ${attempt} failed`, {
        error: error instanceof Error ? error.message : String(error),
        attempt,
        maxRetries: RETRY_CONFIG.maxRetries,
      });

      // If this isn't the last attempt, wait before retrying
      if (attempt < RETRY_CONFIG.maxRetries) {
        const delayMs = getRetryDelay(attempt);
        logger.info(`Retrying Redis connection in ${delayMs}ms...`);
        await sleep(delayMs);
      }
    }
  }

  // All retry attempts failed
  const errorMessage = `Failed to connect to Redis after ${RETRY_CONFIG.maxRetries} attempts`;
  logger.error(errorMessage, {
    lastError: lastError?.message,
    stack: lastError?.stack,
  });

  throw new Error(`${errorMessage}: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Disconnects from Redis gracefully
 * Ensures all pending commands are completed before disconnecting
 *
 * @returns {Promise<void>}
 */
export async function disconnectRedis(): Promise<void> {
  if (!isConnected) {
    logger.warn('Redis not connected, skipping disconnect');
    return;
  }

  if (isShuttingDown) {
    logger.warn('Shutdown already in progress');
    return;
  }

  isShuttingDown = true;

  try {
    logger.info('Disconnecting from Redis...');

    const client = getRedisClient();
    await client.quit();

    isConnected = false;
    logger.info('Redis disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting from Redis', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  } finally {
    isShuttingDown = false;
  }
}

/**
 * Performs a health check on the Redis connection
 * Tests connectivity and command execution
 *
 * @returns {Promise<{healthy: boolean, latency?: number, error?: string}>}
 */
export async function checkRedisHealth(): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
  details?: {
    connected: boolean;
    responseTime: number;
    memoryUsage?: string;
  };
}> {
  try {
    const client = getRedisClient();
    const startTime = Date.now();

    // Execute PING to test the connection
    const pong = await client.ping();

    const latency = Date.now() - startTime;

    if (pong !== 'PONG') {
      throw new Error(`Unexpected PING response: ${pong}`);
    }

    // Get memory info for additional health details
    let memoryUsage: string | undefined;
    try {
      const info = await client.info('memory');
      const match = info.match(/used_memory_human:([^\r\n]+)/);
      memoryUsage = match ? match[1] : undefined;
    } catch (err) {
      // Memory info is optional, don't fail health check
      logger.debug('Could not fetch Redis memory info', { error: err });
    }

    logger.debug('Redis health check passed', { latency: `${latency}ms` });

    return {
      healthy: true,
      latency,
      details: {
        connected: isConnected,
        responseTime: latency,
        memoryUsage,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error('Redis health check failed', {
      error: errorMessage,
      connected: isConnected,
    });

    return {
      healthy: false,
      error: errorMessage,
      details: {
        connected: false,
        responseTime: -1,
      },
    };
  }
}

/**
 * Gets the connection status
 *
 * @returns {boolean} True if connected, false otherwise
 */
export function isConnectedToRedis(): boolean {
  return isConnected;
}

// ============================================================================
// HELPER METHODS FOR COMMON OPERATIONS
// ============================================================================

/**
 * Get a value from Redis
 *
 * @param key - Redis key
 * @returns {Promise<string | null>} Value or null if not found
 */
export async function get(key: string): Promise<string | null> {
  try {
    const client = getRedisClient();
    return await client.get(key);
  } catch (error) {
    logger.error('Redis GET error', {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get a value from Redis and parse as JSON
 *
 * @param key - Redis key
 * @returns {Promise<T | null>} Parsed value or null if not found
 */
export async function getJSON<T = any>(key: string): Promise<T | null> {
  try {
    const value = await get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    logger.error('Redis GET JSON error', {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Set a value in Redis with optional TTL
 *
 * @param key - Redis key
 * @param value - Value to store
 * @param ttl - Time to live in seconds (optional)
 * @returns {Promise<'OK'>}
 */
export async function set(key: string, value: string, ttl?: number): Promise<'OK'> {
  try {
    const client = getRedisClient();
    if (ttl) {
      return await client.set(key, value, 'EX', ttl);
    }
    return await client.set(key, value);
  } catch (error) {
    logger.error('Redis SET error', {
      key,
      ttl,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Set a value in Redis as JSON with optional TTL
 *
 * @param key - Redis key
 * @param value - Value to store (will be JSON stringified)
 * @param ttl - Time to live in seconds (optional)
 * @returns {Promise<'OK'>}
 */
export async function setJSON(key: string, value: any, ttl?: number): Promise<'OK'> {
  try {
    return await set(key, JSON.stringify(value), ttl);
  } catch (error) {
    logger.error('Redis SET JSON error', {
      key,
      ttl,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Delete one or more keys from Redis
 *
 * @param keys - Key(s) to delete
 * @returns {Promise<number>} Number of keys deleted
 */
export async function del(...keys: string[]): Promise<number> {
  try {
    const client = getRedisClient();
    return await client.del(...keys);
  } catch (error) {
    logger.error('Redis DEL error', {
      keys,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Set expiration time for a key
 *
 * @param key - Redis key
 * @param seconds - Expiration time in seconds
 * @returns {Promise<number>} 1 if timeout was set, 0 if key doesn't exist
 */
export async function expire(key: string, seconds: number): Promise<number> {
  try {
    const client = getRedisClient();
    return await client.expire(key, seconds);
  } catch (error) {
    logger.error('Redis EXPIRE error', {
      key,
      seconds,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Check if a key exists
 *
 * @param key - Redis key
 * @returns {Promise<boolean>} True if key exists
 */
export async function exists(key: string): Promise<boolean> {
  try {
    const client = getRedisClient();
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    logger.error('Redis EXISTS error', {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get remaining TTL for a key
 *
 * @param key - Redis key
 * @returns {Promise<number>} TTL in seconds, -1 if no expire, -2 if key doesn't exist
 */
export async function ttl(key: string): Promise<number> {
  try {
    const client = getRedisClient();
    return await client.ttl(key);
  } catch (error) {
    logger.error('Redis TTL error', {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// ============================================================================
// SESSION MANAGEMENT HELPERS
// ============================================================================

/**
 * Store a session in Redis
 *
 * @param sessionId - Session identifier
 * @param sessionData - Session data object
 * @param ttl - Session TTL in seconds (default: 24 hours)
 * @returns {Promise<'OK'>}
 */
export async function setSession(
  sessionId: string,
  sessionData: any,
  ttl: number = DEFAULT_TTL.SESSION
): Promise<'OK'> {
  const key = `session:${sessionId}`;
  return await setJSON(key, sessionData, ttl);
}

/**
 * Get a session from Redis
 *
 * @param sessionId - Session identifier
 * @returns {Promise<T | null>} Session data or null if not found
 */
export async function getSession<T = any>(sessionId: string): Promise<T | null> {
  const key = `session:${sessionId}`;
  return await getJSON<T>(key);
}

/**
 * Delete a session from Redis
 *
 * @param sessionId - Session identifier
 * @returns {Promise<number>} 1 if deleted, 0 if not found
 */
export async function deleteSession(sessionId: string): Promise<number> {
  const key = `session:${sessionId}`;
  return await del(key);
}

/**
 * Extend a session's TTL
 *
 * @param sessionId - Session identifier
 * @param ttl - New TTL in seconds (default: 24 hours)
 * @returns {Promise<number>} 1 if timeout was set, 0 if session doesn't exist
 */
export async function extendSession(
  sessionId: string,
  ttl: number = DEFAULT_TTL.SESSION
): Promise<number> {
  const key = `session:${sessionId}`;
  return await expire(key, ttl);
}

// ============================================================================
// CACHE INVALIDATION UTILITIES
// ============================================================================

/**
 * Delete all keys matching a pattern
 * WARNING: Use with caution, can be slow for large datasets
 *
 * @param pattern - Redis key pattern (e.g., "user:*", "cache:api:*")
 * @returns {Promise<number>} Number of keys deleted
 */
export async function deletePattern(pattern: string): Promise<number> {
  try {
    const client = getRedisClient();
    const keys = await client.keys(pattern);

    if (keys.length === 0) {
      logger.debug('No keys found matching pattern', { pattern });
      return 0;
    }

    logger.info('Deleting keys matching pattern', {
      pattern,
      count: keys.length,
    });

    return await client.del(...keys);
  } catch (error) {
    logger.error('Redis DELETE PATTERN error', {
      pattern,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Invalidate cache for a specific resource type
 *
 * @param resourceType - Type of resource (e.g., "user", "repository", "metrics")
 * @param resourceId - Optional specific resource ID
 * @returns {Promise<number>} Number of keys deleted
 */
export async function invalidateCache(
  resourceType: string,
  resourceId?: string | number
): Promise<number> {
  const pattern = resourceId ? `cache:${resourceType}:${resourceId}:*` : `cache:${resourceType}:*`;

  logger.info('Invalidating cache', { resourceType, resourceId, pattern });
  return await deletePattern(pattern);
}

/**
 * Flush all data from Redis
 * WARNING: This deletes ALL data in the current Redis database
 *
 * @returns {Promise<'OK'>}
 */
export async function flushAll(): Promise<'OK'> {
  try {
    const client = getRedisClient();
    logger.warn('Flushing all Redis data');
    return await client.flushall();
  } catch (error) {
    logger.error('Redis FLUSH ALL error', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Gets the Redis Client instance (alias for backward compatibility)
 * Use this in your application code
 */
export const redis = getRedisClient();

/**
 * Export default for convenient importing
 */
export default redis;
