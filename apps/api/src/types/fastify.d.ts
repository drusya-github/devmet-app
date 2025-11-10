import 'fastify';
import { Role, User, Organization } from '@prisma/client';

// Full authenticated user with organizations
export type AuthenticatedUser = User & {
  organizations: Array<{
    role: Role;
    joinedAt: Date;
    organization: Organization;
  }>;
};

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    optionalAuthenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (roles: Role[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireOrganization: () => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export {};