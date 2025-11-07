/**
 * Request logging middleware using Winston
 * Logs all incoming HTTP requests with detailed information
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../config/logger';

/**
 * Request logger middleware
 */
export async function requestLogger(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const startTime = Date.now();
  const requestId = request.id; // Fastify auto-generates request IDs

  // Log request start
  logger.info('Incoming request', {
    requestId,
    method: request.method,
    url: request.url,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    contentType: request.headers['content-type'],
  });

  // Hook into response completion to log
  reply.raw.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.info('Request completed', {
      requestId,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration: `${duration}ms`,
      ip: request.ip,
    });
  });
}

/**
 * Register request logger as a global hook
 */
export function registerRequestLogger(server: FastifyInstance): void {
  server.addHook('onRequest', requestLogger);
}

export default registerRequestLogger;
