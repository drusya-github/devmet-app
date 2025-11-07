/**
 * Global error handling middleware for Fastify
 * Catches all errors and returns consistent error responses
 */

import { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../config/logger';
import { ErrorResponse } from '../types/server';

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Register error handler with Fastify
 */
export function registerErrorHandler(server: FastifyInstance): void {
  server.setErrorHandler(
    async (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      // Log the error
      logger.error('Error occurred', {
        requestId: request.id,
        error: error.message,
        stack: error.stack,
        url: request.url,
        method: request.method,
        ip: request.ip,
        statusCode: error.statusCode || 500,
      });

      // Determine status code
      const statusCode = error.statusCode || 500;

      // Build error response
      const errorResponse: ErrorResponse = {
        statusCode,
        error: getErrorName(statusCode),
        message: error.message || 'Internal Server Error',
        timestamp: new Date().toISOString(),
        path: request.url,
      };

      // Add validation errors if present
      if (error.validation) {
        errorResponse.validation = error.validation.map((err: any) => ({
          field: err.params?.missingProperty || err.instancePath,
          message: err.message || 'Validation failed',
        }));
      }

      // Don't expose internal errors in production
      if (statusCode === 500 && process.env.NODE_ENV === 'production') {
        errorResponse.message = 'Internal Server Error';
      }

      // Send error response
      reply.status(statusCode).send(errorResponse);
    }
  );

  // Handle 404 errors
  server.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    const errorResponse: ErrorResponse = {
      statusCode: 404,
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    logger.warn('Route not found', {
      requestId: request.id,
      method: request.method,
      url: request.url,
      ip: request.ip,
    });

    reply.status(404).send(errorResponse);
  });
}

/**
 * Get error name from status code
 */
function getErrorName(statusCode: number): string {
  const errorNames: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };

  return errorNames[statusCode] || 'Error';
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(fn: (request: FastifyRequest, reply: FastifyReply) => Promise<any>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await fn(request, reply);
    } catch (error) {
      throw error;
    }
  };
}

export default registerErrorHandler;
