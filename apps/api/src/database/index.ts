/**
 * Database Module
 * Exports all database-related functionality
 */

// Prisma (PostgreSQL) exports
export {
  prisma,
  getPrismaClient,
  connectDatabase,
  disconnectDatabase,
  checkDatabaseHealth,
  withRetry,
  isConnectedToDatabase,
} from './prisma.client';

// Redis exports
export {
  redis,
  getRedisClient,
  connectRedis,
  disconnectRedis,
  checkRedisHealth,
  isConnectedToRedis,
  // Helper methods
  get,
  getJSON,
  set,
  setJSON,
  del,
  expire,
  exists,
  ttl,
  // Session management
  setSession,
  getSession,
  deleteSession,
  extendSession,
  // Cache invalidation
  deletePattern,
  invalidateCache,
  flushAll,
  // Constants
  DEFAULT_TTL,
} from './redis.client';

// Re-export types for convenience
export type { PrismaClient } from '@prisma/client';
export type { Redis } from 'ioredis';
