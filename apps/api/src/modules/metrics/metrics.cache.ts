/**
 * Metrics Cache Utility
 * Provides caching functionality for metrics API using existing Redis client
 */

import { redis, DEFAULT_TTL } from '../../database/redis.client';
import { logger } from '../../config/logger';

// Cache TTL for metrics (15 minutes)
const METRICS_CACHE_TTL = 15 * 60; // seconds

/**
 * Metrics cache utility class
 */
export class MetricsCacheUtil {
  /**
   * Generate a cache key for metrics
   */
  static generateCacheKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .filter((key) => params[key] !== undefined && params[key] !== null)
      .map((key) => {
        const value = params[key];
        // Handle Date objects
        if (value instanceof Date) {
          return `${key}:${value.toISOString()}`;
        }
        // Handle arrays
        if (Array.isArray(value)) {
          return `${key}:${value.join(',')}`;
        }
        return `${key}:${value}`;
      })
      .join('|');
    
    return `metrics:${prefix}:${sortedParams}`;
  }

  /**
   * Get cached data
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key);
      if (!cached) {
        logger.debug('Cache miss', { key });
        return null;
      }
      
      logger.debug('Cache hit', { key });
      return JSON.parse(cached) as T;
    } catch (error) {
      logger.error('Cache get error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Set cached data with TTL
   */
  static async set(
    key: string,
    data: any,
    ttl: number = METRICS_CACHE_TTL
  ): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(data));
      logger.debug('Cache set', { key, ttl });
    } catch (error) {
      logger.error('Cache set error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Delete cached data
   */
  static async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
      logger.debug('Cache deleted', { key });
    } catch (error) {
      logger.error('Cache delete error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Delete all cached data matching a pattern
   */
  static async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.debug('Cache pattern deleted', { pattern, count: keys.length });
      }
    } catch (error) {
      logger.error('Cache delete pattern error', {
        pattern,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Invalidate all metrics cache for an organization
   */
  static async invalidateOrgMetrics(organizationId: string): Promise<void> {
    await this.deletePattern(`metrics:*organizationId:${organizationId}*`);
    logger.info('Organization metrics cache invalidated', { organizationId });
  }

  /**
   * Invalidate all metrics cache for a user
   */
  static async invalidateUserMetrics(userId: string): Promise<void> {
    await this.deletePattern(`metrics:*userId:${userId}*`);
    logger.info('User metrics cache invalidated', { userId });
  }

  /**
   * Invalidate all metrics cache for a repository
   */
  static async invalidateRepoMetrics(repositoryId: string): Promise<void> {
    await this.deletePattern(`metrics:*repositoryId:${repositoryId}*`);
    logger.info('Repository metrics cache invalidated', { repositoryId });
  }

  /**
   * Check if Redis is connected
   */
  static async isConnected(): Promise<boolean> {
    try {
      await redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  static async getStats(): Promise<{
    keysCount: number;
    memoryUsed: string;
    hitRate?: number;
  }> {
    try {
      const info = await redis.info('stats');
      const keys = await redis.keys('metrics:*');
      
      // Parse memory info
      const memInfo = await redis.info('memory');
      const memMatch = memInfo.match(/used_memory_human:(.+)/);
      const memoryUsed = memMatch ? memMatch[1].trim() : 'unknown';
      
      return {
        keysCount: keys.length,
        memoryUsed,
      };
    } catch (error) {
      logger.error('Error getting cache stats', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        keysCount: 0,
        memoryUsed: 'unknown',
      };
    }
  }
}

export default MetricsCacheUtil;
