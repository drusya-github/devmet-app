/**
 * DevMetrics - Metrics Aggregation Routes
 * API routes for manually triggering metrics aggregation
 */

import { FastifyInstance } from 'fastify';
import {
  triggerOrganizationAggregation,
  triggerAllAggregation,
  getCronJobStatus,
} from './metrics.aggregation.controller';

/**
 * Register metrics aggregation routes
 */
export async function metricsAggregationRoutes(fastify: FastifyInstance) {
  // Trigger aggregation for specific organization
  fastify.post(
    '/aggregate/:organizationId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Manually trigger metrics aggregation for a specific organization',
        tags: ['metrics', 'aggregation'],
        params: {
          type: 'object',
          properties: {
            organizationId: { type: 'string', format: 'uuid' },
          },
          required: ['organizationId'],
        },
        querystring: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              format: 'date',
              description: 'Date to calculate metrics for (YYYY-MM-DD). Defaults to yesterday.',
            },
          },
        },
        response: {
          200: {
            description: 'Aggregation completed successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  jobId: { type: 'string' },
                  organizationId: { type: 'string' },
                  date: { type: 'string' },
                  duration: { type: 'string' },
                  stats: {
                    type: 'object',
                    properties: {
                      developersProcessed: { type: 'number' },
                      repositoriesProcessed: { type: 'number' },
                      anomaliesDetected: { type: 'number' },
                    },
                  },
                  success: { type: 'boolean' },
                  errors: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          403: {
            description: 'Forbidden',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    triggerOrganizationAggregation as any
  );

  // Trigger aggregation for all organizations
  fastify.post(
    '/aggregate/all',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Manually trigger metrics aggregation for all organizations',
        tags: ['metrics', 'aggregation'],
        querystring: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              format: 'date',
              description: 'Date to calculate metrics for (YYYY-MM-DD). Defaults to yesterday.',
            },
          },
        },
        response: {
          200: {
            description: 'Aggregation completed successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  jobId: { type: 'string' },
                  date: { type: 'string' },
                  duration: { type: 'string' },
                  durationMinutes: { type: 'string' },
                  stats: {
                    type: 'object',
                    properties: {
                      organizationsProcessed: { type: 'number' },
                      developersProcessed: { type: 'number' },
                      repositoriesProcessed: { type: 'number' },
                      anomaliesDetected: { type: 'number' },
                    },
                  },
                  success: { type: 'boolean' },
                  errors: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    triggerAllAggregation as any
  );

  // Get cron job status
  fastify.get(
    '/aggregate/status',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Get status of the daily metrics aggregation cron job',
        tags: ['metrics', 'aggregation'],
        response: {
          200: {
            description: 'Cron job status',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  cron: {
                    type: 'object',
                    properties: {
                      schedule: { type: 'string' },
                      isScheduled: { type: 'boolean' },
                      nextRun: { type: 'string' },
                      lastRun: { type: 'string' },
                    },
                  },
                  queue: {
                    type: 'object',
                    properties: {
                      totalJobs: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    getCronJobStatus as any
  );
}
