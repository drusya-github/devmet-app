import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
// Update this import path based on your actual JWT utility location
import { verifyToken } from '../utils/jwt';

// Properly declare the user type on FastifyRequest
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  
  interface FastifyRequest {
    user?: {
      userId: string;
      email: string;
      username: string;
    };
  }
}

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
      const decoded = verifyToken(token);
      
      // Attach user data to request
      request.user = {
        userId: decoded.userId,
        email: decoded.email,
        username: decoded.username,
      };
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
