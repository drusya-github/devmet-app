/**
 * Prisma Database Connection Service
 * Implements singleton pattern with connection pooling, retry logic, and health checks
 *
 * Features:
 * - Singleton pattern to prevent multiple Prisma instances
 * - Connection pooling configuration
 * - Graceful disconnect on shutdown
 * - Query logging in development mode
 * - Connection retry logic with exponential backoff
 * - Health check method for monitoring
 */

import { PrismaClient } from '@prisma/client';
import { config, isDevelopment } from '../config';
import { logger } from '../config/logger';

/**
 * Singleton instance of Prisma Client
 * Prevents multiple connections to the database
 */
let prismaInstance: PrismaClient | null = null;

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
 * Creates and configures a new Prisma Client instance
 */
function createPrismaClient(): PrismaClient {
  logger.info('Creating new Prisma Client instance');

  const client = new PrismaClient({
    // Query logging configuration
    log: isDevelopment
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
          { emit: 'stdout', level: 'info' },
        ]
      : [
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ],

    // Connection pool configuration
    datasources: {
      db: {
        url: config.database.url,
      },
    },
  });

  // Attach logging event handlers
  if (isDevelopment) {
    client.$on('query' as never, (e: any) => {
      logger.debug('Prisma Query', {
        query: e.query,
        params: e.params,
        duration: `${e.duration}ms`,
      });
    });
  }

  client.$on('error' as never, (e: any) => {
    logger.error('Prisma Error', {
      message: e.message,
      target: e.target,
    });
  });

  client.$on('warn' as never, (e: any) => {
    logger.warn('Prisma Warning', {
      message: e.message,
      target: e.target,
    });
  });

  return client;
}

/**
 * Gets or creates the singleton Prisma Client instance
 *
 * @returns {PrismaClient} The singleton Prisma Client instance
 */
export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = createPrismaClient();
    logger.info('Prisma Client singleton instance created');
  }
  return prismaInstance;
}

/**
 * Connects to the database with retry logic
 * Implements exponential backoff for failed connection attempts
 *
 * @returns {Promise<void>}
 * @throws {Error} If connection fails after all retry attempts
 */
export async function connectDatabase(): Promise<void> {
  if (isConnected) {
    logger.warn('Database already connected, skipping connect');
    return;
  }

  if (isShuttingDown) {
    throw new Error('Cannot connect during shutdown');
  }

  const client = getPrismaClient();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      logger.info(`Attempting database connection (attempt ${attempt}/${RETRY_CONFIG.maxRetries})`);

      await client.$connect();

      // Verify connection with a simple query
      await client.$queryRaw`SELECT 1 as connection_test`;

      isConnected = true;
      logger.info('Database connected successfully', {
        attempt,
        environment: config.server.nodeEnv,
      });

      return;
    } catch (error) {
      lastError = error as Error;
      logger.error(`Database connection attempt ${attempt} failed`, {
        error: error instanceof Error ? error.message : String(error),
        attempt,
        maxRetries: RETRY_CONFIG.maxRetries,
      });

      // If this isn't the last attempt, wait before retrying
      if (attempt < RETRY_CONFIG.maxRetries) {
        const delayMs = getRetryDelay(attempt);
        logger.info(`Retrying connection in ${delayMs}ms...`);
        await sleep(delayMs);
      }
    }
  }

  // All retry attempts failed
  const errorMessage = `Failed to connect to database after ${RETRY_CONFIG.maxRetries} attempts`;
  logger.error(errorMessage, {
    lastError: lastError?.message,
    stack: lastError?.stack,
  });

  throw new Error(`${errorMessage}: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Disconnects from the database gracefully
 * Ensures all pending queries are completed before disconnecting
 *
 * @returns {Promise<void>}
 */
export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) {
    logger.warn('Database not connected, skipping disconnect');
    return;
  }

  if (isShuttingDown) {
    logger.warn('Shutdown already in progress');
    return;
  }

  isShuttingDown = true;

  try {
    logger.info('Disconnecting from database...');

    const client = getPrismaClient();
    await client.$disconnect();

    isConnected = false;
    logger.info('Database disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting from database', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  } finally {
    isShuttingDown = false;
  }
}

/**
 * Performs a health check on the database connection
 * Tests connectivity and query execution
 *
 * @returns {Promise<{healthy: boolean, latency?: number, error?: string}>}
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
  details?: {
    connected: boolean;
    responseTime: number;
  };
}> {
  try {
    const client = getPrismaClient();
    const startTime = Date.now();

    // Execute a simple query to test the connection
    await client.$queryRaw`SELECT 1 as health_check`;

    const latency = Date.now() - startTime;

    logger.debug('Database health check passed', { latency: `${latency}ms` });

    return {
      healthy: true,
      latency,
      details: {
        connected: isConnected,
        responseTime: latency,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error('Database health check failed', {
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
 * Executes a function with automatic retry logic
 * Useful for transient database errors
 *
 * @param fn - Function to execute
 * @param retries - Number of retry attempts (default: 3)
 * @returns {Promise<T>} Result of the function
 */
export async function withRetry<T>(fn: () => Promise<T>, retries: number = 3): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      logger.warn('Database operation failed, retrying...', {
        attempt,
        maxRetries: retries,
        error: error instanceof Error ? error.message : String(error),
      });

      if (attempt < retries) {
        const delay = getRetryDelay(attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('Operation failed after all retries');
}

/**
 * Gets the connection status
 *
 * @returns {boolean} True if connected, false otherwise
 */
export function isConnectedToDatabase(): boolean {
  return isConnected;
}

/**
 * Gets the Prisma Client instance (alias for backward compatibility)
 * Use this in your application code
 */
export const prisma = getPrismaClient();

/**
 * Export default for convenient importing
 */
export default prisma;
