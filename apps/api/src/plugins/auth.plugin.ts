import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { verifyAccessToken } from '../utils/jwt';

// Type declarations are now in src/types/fastify.d.ts
// This plugin is deprecated - use auth.middleware.ts instead

/**
 * Authentication plugin for Fastify
 * Decorates fastify instance with authenticate method for JWT verification
 */
async function authPlugin(fastify: FastifyInstance) {
  fastify.decorate('authenticate', async function (
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      // Get authorization header
      const authHeader = request.headers.authorization;
      
      if (!authHeader) {
        return reply.status(401).send({
          success: false,
          error: 'Missing authorization header',
        });
      }

      if (!authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          success: false,
          error: 'Invalid authorization header format. Expected: Bearer <token>',
        });
      }

      // Extract token
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Verify token  
      const decoded = verifyAccessToken(token);
      
      // Note: This plugin is deprecated
      // The proper auth middleware fetches the full user from database
      // This is kept for backward compatibility only
      throw new Error('This auth plugin is deprecated. Use auth.middleware.ts instead');
    } catch (error: any) {
      return reply.status(401).send({
        success: false,
        error: error.message || 'Invalid or expired token',
      });
    }
  });
}

export default fp(authPlugin, {
  name: 'authenticate',
});
