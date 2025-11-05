/**
 * DevMetrics API Server
 * Main entry point for the DevMetrics backend API
 */

import dotenv from 'dotenv';
import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Initialize Prisma Client
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Initialize Fastify
const server = fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    } : undefined,
  },
});

// Register plugins
async function registerPlugins() {
  // CORS
  await server.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Security headers
  await server.register(helmet);

  // Rate limiting
  await server.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  });
}

// Health check route
server.get('/health', async (request, reply) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: '1.0.0',
      database: 'connected',
    };
  } catch (error) {
    reply.status(503);
    return {
      status: 'error',
      message: 'Database connection failed',
    };
  }
});

// API routes
server.get('/api', async (request, reply) => {
  return {
    name: 'DevMetrics API',
    version: '1.0.0',
    description: 'Real-time Development Analytics Platform',
    endpoints: {
      health: '/health',
      api: '/api',
    },
  };
});

// Start server
async function start() {
  try {
    await registerPlugins();
    
    await server.listen({ port: PORT, host: HOST });
    
    console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║         DevMetrics API Server                         ║
║                                                       ║
║  🚀 Server running at: http://localhost:${PORT}      ║
║  📊 Environment: ${process.env.NODE_ENV}                              ║
║  🗄️  Database: Connected                              ║
║  ⚡ Status: Ready                                     ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
    `);
    
    // Test database connection
    await prisma.$connect();
    console.log('✓ Database connection verified\n');
    
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\nShutting down gracefully...');
  await prisma.$disconnect();
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\nShutting down gracefully...');
  await prisma.$disconnect();
  await server.close();
  process.exit(0);
});

// Start the server
start();


