/**
 * Repository routes
 * Defines HTTP endpoints for repository management
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { repositoriesService } from './repositories.service';
import { logger } from '../../config/logger';
import { AppError } from '../../middleware/error-handler';
import { prisma } from '../../database/prisma.client';
import {
  listAvailableRepositoriesQuerySchema,
  connectRepositorySchema,
  bulkConnectRepositoriesSchema,
  repositoryIdParamSchema,
} from './repositories.validation';

/**
 * Register repository routes
 */
export async function repositoriesRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/repositories/available
   * List available GitHub repositories for the authenticated user
   * Filters out already connected repositories
   */
  fastify.get<{
    Querystring: {
      page?: string;
      perPage?: string;
      type?: 'all' | 'owner' | 'member';
      sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    };
  }>(
    '/available',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!request.user) {
          throw new AppError(401, 'Not authenticated');
        }

        // Validate query parameters
        const queryParams = listAvailableRepositoriesQuerySchema.parse(request.query);

        // Fetch available repositories
        const result = await repositoriesService.listAvailableRepositories(
          request.user.id,
          queryParams
        );

        return reply.send({
          success: true,
          data: result.data,
          pagination: result.pagination,
        });
      } catch (error) {
        // Handle validation errors
        if (error instanceof Error && error.name === 'ZodError') {
          logger.warn('Invalid query parameters for repository listing', {
            userId: request.user?.id,
            error: error.message,
          });
          throw new AppError(400, 'Invalid query parameters');
        }

        // Re-throw AppError as-is
        if (error instanceof AppError) {
          throw error;
        }

        // Log unexpected errors
        logger.error('Failed to list available repositories', {
          userId: request.user?.id,
          error: error instanceof Error ? error.message : String(error),
        });

        throw new AppError(500, 'Failed to list available repositories');
      }
    }
  );

  /**
   * POST /api/repositories
   * Connect a GitHub repository to an organization
   */
  fastify.post<{
    Body: {
      githubRepoId: number;
      orgId: string;
    };
  }>(
    '/',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!request.user) {
          throw new AppError(401, 'Not authenticated');
        }

        // Validate request body
        const body = connectRepositorySchema.parse(request.body);

        // Get IP address for audit logging
        const ipAddress = request.ip || request.headers['x-forwarded-for'] || 'unknown';

        // Connect repository
        const repo = await repositoriesService.connectRepository(
          request.user.id,
          body.githubRepoId,
          body.orgId,
          ipAddress as string
        );

        return reply.status(201).send({
          success: true,
          data: repo,
        });
      } catch (error) {
        // Handle validation errors
        if (error instanceof Error && error.name === 'ZodError') {
          logger.warn('Invalid request body for repository connection', {
            userId: request.user?.id,
            error: error.message,
          });
          throw new AppError(400, 'Invalid request body');
        }

        // Re-throw AppError as-is
        if (error instanceof AppError) {
          throw error;
        }

        // Log unexpected errors
        logger.error('Failed to connect repository', {
          userId: request.user?.id,
          error: error instanceof Error ? error.message : String(error),
        });

        throw new AppError(500, 'Failed to connect repository');
      }
    }
  );

  /**
   * GET /api/repositories
   * List connected repositories for an organization
   */
  fastify.get<{
    Querystring: {
      orgId: string;
    };
  }>(
    '/',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!request.user) {
          throw new AppError(401, 'Not authenticated');
        }

        const orgId = (request.query as any).orgId;
        if (!orgId || typeof orgId !== 'string') {
          throw new AppError(400, 'orgId query parameter is required');
        }

        // List connected repositories
        const repos = await repositoriesService.listConnectedRepositories(
          orgId,
          request.user.id
        );

        return reply.send({
          success: true,
          data: repos,
        });
      } catch (error) {
        // Re-throw AppError as-is
        if (error instanceof AppError) {
          throw error;
        }

        // Log unexpected errors
        logger.error('Failed to list connected repositories', {
          userId: request.user?.id,
          error: error instanceof Error ? error.message : String(error),
        });

        throw new AppError(500, 'Failed to list connected repositories');
      }
    }
  );

  /**
   * GET /api/repositories/:id
   * Get repository details by ID
   */
  fastify.get<{
    Params: {
      id: string;
    };
  }>(
    '/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!request.user) {
          throw new AppError(401, 'Not authenticated');
        }

        // Validate params
        const params = repositoryIdParamSchema.parse(request.params);

        // Get repository (will check permissions internally)
        const repo = await prisma.repository.findUnique({
          where: { id: params.id },
          include: {
            _count: {
              select: {
                commits: true,
                pullRequests: true,
                issues: true,
              },
            },
          },
        });

        if (!repo) {
          throw new AppError(404, 'Repository not found');
        }

        // Check user has access to organization
        const userOrg = await prisma.userOrganization.findFirst({
          where: {
            userId: request.user.id,
            orgId: repo.orgId,
          },
        });

        if (!userOrg) {
          throw new AppError(403, 'User does not have access to this repository');
        }

        return reply.send({
          success: true,
          data: {
            id: repo.id,
            orgId: repo.orgId,
            githubId: repo.githubId.toString(),
            name: repo.name,
            fullName: repo.fullName,
            description: repo.description,
            language: repo.language,
            isPrivate: repo.isPrivate,
            webhookId: repo.webhookId?.toString() || null,
            syncStatus: repo.syncStatus,
            lastSyncedAt: repo.lastSyncedAt,
            createdAt: repo.createdAt,
            updatedAt: repo.updatedAt,
            stats: {
              commits: repo._count.commits,
              pullRequests: repo._count.pullRequests,
              issues: repo._count.issues,
            },
          },
        });
      } catch (error) {
        // Handle validation errors
        if (error instanceof Error && error.name === 'ZodError') {
          throw new AppError(400, 'Invalid repository ID');
        }

        // Re-throw AppError as-is
        if (error instanceof AppError) {
          throw error;
        }

        // Log unexpected errors
        logger.error('Failed to get repository', {
          userId: request.user?.id,
          error: error instanceof Error ? error.message : String(error),
        });

        throw new AppError(500, 'Failed to get repository');
      }
    }
  );

  /**
   * DELETE /api/repositories/:id
   * Disconnect a repository from an organization
   */
  fastify.delete<{
    Params: {
      id: string;
    };
  }>(
    '/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!request.user) {
          throw new AppError(401, 'Not authenticated');
        }

        // Validate params
        const params = repositoryIdParamSchema.parse(request.params);

        // Get IP address for audit logging
        const ipAddress = request.ip || request.headers['x-forwarded-for'] || 'unknown';

        // Disconnect repository
        await repositoriesService.disconnectRepository(
          request.user.id,
          params.id,
          ipAddress as string
        );

        return reply.status(204).send();
      } catch (error) {
        // Handle validation errors
        if (error instanceof Error && error.name === 'ZodError') {
          throw new AppError(400, 'Invalid repository ID');
        }

        // Re-throw AppError as-is
        if (error instanceof AppError) {
          throw error;
        }

        // Log unexpected errors
        logger.error('Failed to disconnect repository', {
          userId: request.user?.id,
          error: error instanceof Error ? error.message : String(error),
        });

        throw new AppError(500, 'Failed to disconnect repository');
      }
    }
  );

  /**
   * POST /api/repositories/bulk
   * Connect multiple repositories in bulk
   */
  fastify.post<{
    Body: {
      githubRepoIds: number[];
      orgId: string;
    };
  }>(
    '/bulk',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!request.user) {
          throw new AppError(401, 'Not authenticated');
        }

        // Validate request body
        const body = bulkConnectRepositoriesSchema.parse(request.body);

        // Get IP address for audit logging
        const ipAddress = request.ip || request.headers['x-forwarded-for'] || 'unknown';

        // Connect repositories in bulk
        const result = await repositoriesService.connectRepositories(
          request.user.id,
          body.githubRepoIds,
          body.orgId,
          ipAddress as string
        );

        return reply.status(201).send({
          success: true,
          data: result,
        });
      } catch (error) {
        // Handle validation errors
        if (error instanceof Error && error.name === 'ZodError') {
          logger.warn('Invalid request body for bulk repository connection', {
            userId: request.user?.id,
            error: error.message,
          });
          throw new AppError(400, 'Invalid request body');
        }

        // Re-throw AppError as-is
        if (error instanceof AppError) {
          throw error;
        }

        // Log unexpected errors
        logger.error('Failed to connect repositories in bulk', {
          userId: request.user?.id,
          error: error instanceof Error ? error.message : String(error),
        });

        throw new AppError(500, 'Failed to connect repositories in bulk');
      }
    }
  );
}

