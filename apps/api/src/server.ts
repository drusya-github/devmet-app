/**
 * DevMetrics API Server
 * Main entry point for the DevMetrics backend API
 */

import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config';
import { logger } from './config/logger';
import { registerErrorHandler } from './middleware/error-handler';
import { registerRequestLogger } from './middleware/request-logger';
import type { HealthCheckResponse, ApiInfoResponse } from './types/server';
import {
  connectDatabase,
  disconnectDatabase,
  checkDatabaseHealth,
  connectRedis,
  disconnectRedis,
  checkRedisHealth,
} from './database';
import authPlugin from './plugins/auth.plugin';

// Initialize Fastify
const server = fastify({
  logger: false, // Using Winston instead of Pino
  trustProxy: true,
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'requestId',
  // Disable address logging to prevent macOS network interface error
  disableRequestLogging: true,
});

/**
 * Register all plugins and middleware
 */
async function registerPlugins(): Promise<void> {
  // Request logging (must be first)
  registerRequestLogger(server);

  // CORS - Allow frontend to access API
  await server.register(cors, {
    origin: config.server.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  // Security headers
  await server.register(helmet, {
    contentSecurityPolicy: config.server.nodeEnv === 'production' ? undefined : false,
  });

  // Rate limiting - Prevent abuse
  await server.register(rateLimit, {
    max: config.rateLimit.maxRequests,
    timeWindow: config.rateLimit.timeWindowMs,
    errorResponseBuilder: (request, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. You can make ${config.rateLimit.maxRequests} requests per ${config.rateLimit.timeWindowMs / 1000} seconds.`,
      timestamp: new Date().toISOString(),
    }),
  });

  // Authentication middleware (must be before routes)
  const authMiddleware = await import('./middleware/auth.middleware');
  await server.register(authMiddleware.default);

  // Error handler (must be registered last)
  registerErrorHandler(server);

  logger.info('All plugins registered successfully');
}


/**
 * Register application routes
 */
async function registerRoutes(): Promise<void> {
  // Authentication routes
  await server.register(async (fastify) => {
    const { authRoutes } = await import('./modules/auth');
    await authRoutes(fastify);
  }, { prefix: '/api/auth' });

  // User profile routes
  await server.register(async (fastify) => {
    const { usersRoutes } = await import('./modules/users');
    await usersRoutes(fastify);
  }, { prefix: '/api/users' });

  // Repository routes
  await server.register(async (fastify) => {
    const { repositoriesRoutes } = await import('./modules/repositories');
    await repositoriesRoutes(fastify);
  }, { prefix: '/api/repositories' });

  // Webhook routes (no rate limiting for GitHub webhooks)
  await server.register(async (fastify) => {
    const { webhooksRoutes } = await import('./modules/webhooks');
    await webhooksRoutes(fastify);
  }, { 
    prefix: '/api/webhooks',
    // Disable rate limiting for webhook endpoints
    // GitHub webhooks need reliable delivery
  });

  // Health check endpoint
  server.get<{ Reply: HealthCheckResponse }>('/health', async (request, reply) => {
    try {
      // Check both database and Redis health
      const [dbHealth, redisHealth] = await Promise.all([
        checkDatabaseHealth(),
        checkRedisHealth(),
      ]);

      // If either service is unhealthy, return error
      if (!dbHealth.healthy || !redisHealth.healthy) {
        const errors: string[] = [];
        if (!dbHealth.healthy) errors.push(`Database: ${dbHealth.error}`);
        if (!redisHealth.healthy) errors.push(`Redis: ${redisHealth.error}`);

        const response: HealthCheckResponse = {
          status: 'error',
          timestamp: new Date().toISOString(),
          environment: config.server.nodeEnv,
          version: '1.0.0',
          database: dbHealth.healthy ? 'connected' : 'disconnected',
          redis: redisHealth.healthy ? 'connected' : 'disconnected',
          message: errors.join('; '),
        };

        return reply.status(503).send(response);
      }

      const response: HealthCheckResponse = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: config.server.nodeEnv,
        version: '1.0.0',
        database: 'connected',
        redis: 'connected',
        uptime: process.uptime(),
        latency: dbHealth.latency,
        redisLatency: redisHealth.latency,
      };

      return reply.status(200).send(response);
    } catch (error) {
      logger.error('Health check failed', { error });

      const response: HealthCheckResponse = {
        status: 'error',
        timestamp: new Date().toISOString(),
        environment: config.server.nodeEnv,
        version: '1.0.0',
        database: 'disconnected',
        redis: 'disconnected',
        message: 'Health check error',
      };

      return reply.status(503).send(response);
    }
  });

  // API info endpoint
  server.get<{ Reply: ApiInfoResponse }>('/api', async (request, reply) => {
    const response: ApiInfoResponse = {
      name: 'DevMetrics API',
      version: '1.0.0',
      description: 'Real-time Development Analytics Platform',
      environment: config.server.nodeEnv,
      endpoints: {
        health: '/health',
        api: '/api',
      },
    };

    return reply.status(200).send(response);
  });

  // Test routes for middleware verification (TASK-015)
  // TODO: Remove these after verification
  server.get('/api/test/protected', {
    preHandler: [server.authenticate],
  }, async (request, reply) => {
    return {
      success: true,
      message: 'You are authenticated!',
      user: request.user ? {
        id: request.user.id,
        email: request.user.email,
        name: request.user.name,
      } : null,
    };
  });

  server.get('/api/test/optional', {
    preHandler: [server.optionalAuthenticate],
  }, async (request, reply) => {
    return {
      success: true,
      authenticated: !!request.user,
      userId: request.user?.id ?? null,
    };
  });

  server.get('/api/test/middleware-check', async (request, reply) => {
    return {
      hasAuthenticate: typeof server.authenticate === 'function',
      hasOptionalAuthenticate: typeof server.optionalAuthenticate === 'function',
      hasRequireRole: typeof server.requireRole === 'function',
      hasRequireOrganization: typeof server.requireOrganization === 'function',
    };
  });

  logger.info('All routes registered successfully');
}

/**
 * Initialize server for testing (registers plugins and routes without starting)
 */
export async function initializeServer(): Promise<void> {
  // Register plugins and middleware
  await registerPlugins();

  // Register routes
  await registerRoutes();
}

/**
 * Start the server
 */
async function start(): Promise<void> {
  try {
    // Connect to database and Redis with retry logic
    await Promise.all([connectDatabase(), connectRedis()]);

    // Initialize server (plugins and routes)
    await initializeServer();

    // Start background workers
    try {
      const { startImportWorker } = await import('./modules/repositories/import.worker');
      startImportWorker();
      logger.info('Import worker started');
    } catch (error) {
      logger.warn('Failed to start import worker', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue startup even if worker fails
    }

    // Start listening (suppress automatic logging to avoid macOS network interface error)
    await server.listen({
      port: config.server.port,
      host: config.server.host,
      listenTextResolver: () => '', // Suppress Fastify's built-in server address logging
    });

    // Log startup success
    logger.info('Server started successfully', {
      port: config.server.port,
      host: config.server.host,
      environment: config.server.nodeEnv,
    });

    // Pretty console output
    console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║         DevMetrics API Server                         ║
║                                                       ║
║  🚀 Server running at: http://localhost:${config.server.port}      ║
║  📊 Environment: ${config.server.nodeEnv.padEnd(10)}                       ║
║  🗄️  Database: Connected                              ║
║  🔴 Redis: Connected                                  ║
║  📝 Logging: Winston (${config.server.logLevel})                       ║
║  ⚡ Status: Ready                                     ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
    `);
  } catch (error) {
    logger.error('Failed to start server', { error });
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, starting graceful shutdown`);
  console.log(`\n\n🛑 ${signal} received, shutting down gracefully...`);

  try {
    // Stop background workers
    try {
      const { stopImportWorker } = await import('./modules/repositories/import.worker');
      await stopImportWorker();
      logger.info('Import worker stopped');
    } catch (error) {
      logger.warn('Error stopping import worker', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Close server
    await server.close();
    logger.info('Fastify server closed');

    // Disconnect from database and Redis
    await Promise.all([disconnectDatabase(), disconnectRedis()]);

    console.log('✅ Shutdown complete\n');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack,
  });
  console.error('❌ Unhandled rejection:', reason);
  process.exit(1);
});

// Export server for testing
export { server };

// Start the server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  start();
}
