/**
 * Metrics API Routes
 * Defines HTTP routes for metrics endpoints
 */

import type { FastifyInstance } from 'fastify';
import { metricsController } from './metrics.routes.controller';
import {
  developerMetricsQueryJsonSchema,
  teamMetricsQueryJsonSchema,
  repositoryMetricsQueryJsonSchema,
  trendsQueryJsonSchema,
  userIdParamJsonSchema,
  organizationIdParamJsonSchema,
  repositoryIdParamJsonSchema,
} from './metrics.validation';

import { logger } from '../../config/logger';

/**
 * Register metrics routes
 */
export async function metricsRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/metrics/developer/:userId
   * Get individual developer metrics
   *
   * @requires Authentication
   * @requires Organization membership check (handled in controller)
   */
  fastify.get<{
    Params: { userId: string };
    Querystring: {
      startDate?: string;
      endDate?: string;
      page: number;
      limit: number;
    };
  }>(
    '/developer/:userId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Get metrics for a specific developer',
        tags: ['metrics'],
        params: userIdParamJsonSchema,
        querystring: developerMetricsQueryJsonSchema,
        response: {
          200: {
            description: 'Successful response',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: { type: 'object' },
                  },
                  pagination: {
                    type: 'object',
                    properties: {
                      page: { type: 'number' },
                      limit: { type: 'number' },
                      total: { type: 'number' },
                      totalPages: { type: 'number' },
                      hasMore: { type: 'boolean' },
                    },
                    required: ['page', 'limit', 'total', 'totalPages', 'hasMore'],
                  },
                },
                required: ['data', 'pagination'],
                additionalProperties: true,
              },
              cached: { type: 'boolean' },
            },
            required: ['success', 'data', 'cached'],
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          403: {
            description: 'Forbidden',
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    metricsController.getDeveloperMetrics.bind(metricsController)
  );

  /**
   * GET /api/metrics/team/:organizationId
   * Get team/organization metrics
   *
   * @requires Authentication
   * @requires Organization membership (via requireOrganization middleware)
   */
  fastify.get<{
    Params: { organizationId: string };
    Querystring: {
      startDate?: string;
      endDate?: string;
      page: number;
      limit: number;
    };
  }>(
    '/team/:organizationId',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requireOrganization(), // Uses organizationId from params
      ],
      schema: {
        description: 'Get aggregated metrics for a team/organization',
        tags: ['metrics'],
        params: organizationIdParamJsonSchema,
        querystring: teamMetricsQueryJsonSchema,
        response: {
          200: {
            description: 'Successful response',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: { type: 'object' },
                  },
                  pagination: {
                    type: 'object',
                    properties: {
                      page: { type: 'number' },
                      limit: { type: 'number' },
                      total: { type: 'number' },
                      totalPages: { type: 'number' },
                      hasMore: { type: 'boolean' },
                    },
                    required: ['page', 'limit', 'total', 'totalPages', 'hasMore'],
                  },
                  aggregates: {
                    type: 'object',
                    additionalProperties: true,
                  },
                },
                required: ['data', 'pagination'],
                additionalProperties: true,
              },
              cached: { type: 'boolean' },
            },
            required: ['success', 'data', 'cached'],
          },
        },
      },
    },
    metricsController.getTeamMetrics.bind(metricsController)
  );

  /**
   * GET /api/metrics/repository/:repositoryId
   * Get repository metrics
   *
   * @requires Authentication
   * @requires Repository access (checked via organization membership)
   */
  fastify.get<{
    Params: { repositoryId: string };
    Querystring: {
      startDate?: string;
      endDate?: string;
      page: number;
      limit: number;
    };
  }>(
    '/repository/:repositoryId',
    {
      preHandler: [
        fastify.authenticate,
        // Additional authorization: verify repository belongs to user's org
        async (request, reply) => {
          const { repositoryId } = request.params as { repositoryId: string };

          // Verify user has access to this repository through their organization
          const { prisma } = await import('../../database/prisma.client');
          const repository = await prisma.repository.findUnique({
            where: { id: repositoryId },
            select: { organizationId: true },
          });

          if (!repository) {
            throw new Error('Repository not found');
          }

          // Check if user belongs to the repository's organization
          const userOrgIds =
            request.user?.organizations.map((uo) => uo.organization.id) || [];
          if (!userOrgIds.includes(repository.organizationId)) {
            throw new Error('Access denied to this repository');
          }
        },
      ],
      schema: {
        description: 'Get metrics for a specific repository',
        tags: ['metrics'],
        params: repositoryIdParamJsonSchema,
        querystring: repositoryMetricsQueryJsonSchema,
        response: {
          200: {
            description: 'Successful response',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: { type: 'object' },
                  },
                  pagination: {
                    type: 'object',
                    properties: {
                      page: { type: 'number' },
                      limit: { type: 'number' },
                      total: { type: 'number' },
                      totalPages: { type: 'number' },
                      hasMore: { type: 'boolean' },
                    },
                    required: ['page', 'limit', 'total', 'totalPages', 'hasMore'],
                  },
                },
                required: ['data', 'pagination'],
                additionalProperties: true,
              },
              cached: { type: 'boolean' },
            },
            required: ['success', 'data', 'cached'],
          },
        },
      },
    },
    metricsController.getRepositoryMetrics.bind(metricsController)
  );

  /**
   * GET /api/metrics/trends
   * Get trend data over time
   *
   * @requires Authentication
   * @requires Organization membership (checked via query param)
   */
  fastify.get<{
    Querystring: {
      organizationId: string;
      startDate: string;
      endDate: string;
      granularity: 'day' | 'week' | 'month';
      metricTypes?: string[];
    };
  }>(
    '/trends',
    {
      preHandler: [
        fastify.authenticate,
        // Custom authorization for trends endpoint
        async (request, reply) => {
          const { organizationId } = request.query as { organizationId: string };

          // Verify user belongs to organization
          const userOrgIds =
            request.user?.organizations.map((uo) => uo.organization.id) || [];
          if (!userOrgIds.includes(organizationId)) {
            throw new Error('Access denied to this organization');
          }
        },
      ],
      schema: {
        description: 'Get trend data over time for an organization',
        tags: ['metrics'],
        querystring: trendsQueryJsonSchema,
        response: {
          200: {
            description: 'Successful response',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array' },
              cached: { type: 'boolean' },
            },
          },
        },
      },
    },
    metricsController.getTrends.bind(metricsController)
  );

  logger.info('Metrics routes registered');
}
