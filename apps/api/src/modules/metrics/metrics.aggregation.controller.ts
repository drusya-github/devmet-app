/**
 * DevMetrics - Metrics Aggregation Controller
 * Handles manual triggering of metrics aggregation
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { metricsJobsManager } from './metrics.jobs';
import { logger } from '../../utils/logger';
import { prisma } from '../../database/prisma.client';

/**
 * Request params for triggering aggregation by organization
 */
interface TriggerOrgAggregationParams {
  organizationId: string;
}

/**
 * Query params for date specification
 */
interface AggregationQueryParams {
  date?: string; // ISO date string (YYYY-MM-DD)
}

/**
 * Trigger metrics aggregation for a specific organization
 * POST /api/metrics/aggregate/:organizationId
 */
export async function triggerOrganizationAggregation(
  request: FastifyRequest<{
    Params: TriggerOrgAggregationParams;
    Querystring: AggregationQueryParams;
  }>,
  reply: FastifyReply
) {
  try {
    const { organizationId } = request.params;
    const { date: dateStr } = request.query;

    // Verify user has access to this organization
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    // Check if user belongs to the organization
    const userOrg = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!userOrg) {
      return reply.status(403).send({
        success: false,
        error: 'Forbidden',
        message: 'You do not have access to this organization',
      });
    }

    // Parse date if provided
    let targetDate: Date | undefined;
    if (dateStr) {
      targetDate = new Date(dateStr);
      if (isNaN(targetDate.getTime())) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid date format',
          message: 'Date must be in ISO format (YYYY-MM-DD)',
        });
      }
      // Set to start of day
      targetDate.setHours(0, 0, 0, 0);
    }

    logger.info('Manual aggregation triggered via API', {
      organizationId,
      userId,
      date: targetDate?.toISOString(),
    });

    // Trigger aggregation
    const stats = await metricsJobsManager.triggerManualAggregation(organizationId, targetDate);

    return reply.status(200).send({
      success: true,
      message: 'Metrics aggregation completed successfully',
      data: {
        jobId: stats.jobId,
        organizationId,
        date: targetDate?.toISOString() || stats.startTime.toISOString(),
        duration: `${(stats.duration / 1000).toFixed(2)}s`,
        stats: {
          developersProcessed: stats.developersProcessed,
          repositoriesProcessed: stats.repositoriesProcessed,
          anomaliesDetected: stats.anomaliesDetected,
        },
        success: stats.success,
        errors: stats.errors,
      },
    });
  } catch (error) {
    logger.error('Error in triggerOrganizationAggregation', {
      organizationId: request.params.organizationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to trigger aggregation',
    });
  }
}

/**
 * Trigger metrics aggregation for all organizations
 * POST /api/metrics/aggregate/all
 * Requires admin role
 */
export async function triggerAllAggregation(
  request: FastifyRequest<{
    Querystring: AggregationQueryParams;
  }>,
  reply: FastifyReply
) {
  try {
    const { date: dateStr } = request.query;

    // Verify user is authenticated
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    // TODO: Add admin role check here
    // For now, any authenticated user can trigger (adjust based on your requirements)
    logger.warn('triggerAllAggregation called - consider adding admin role check', {
      userId,
    });

    // Parse date if provided
    let targetDate: Date | undefined;
    if (dateStr) {
      targetDate = new Date(dateStr);
      if (isNaN(targetDate.getTime())) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid date format',
          message: 'Date must be in ISO format (YYYY-MM-DD)',
        });
      }
      targetDate.setHours(0, 0, 0, 0);
    }

    logger.info('Manual aggregation for all organizations triggered via API', {
      userId,
      date: targetDate?.toISOString(),
    });

    // Trigger aggregation
    const stats = await metricsJobsManager.triggerManualAggregationForAll(targetDate);

    return reply.status(200).send({
      success: true,
      message: 'Metrics aggregation completed for all organizations',
      data: {
        jobId: stats.jobId,
        date: targetDate?.toISOString() || stats.startTime.toISOString(),
        duration: `${(stats.duration / 1000).toFixed(2)}s`,
        durationMinutes: `${(stats.duration / 1000 / 60).toFixed(2)}m`,
        stats: {
          organizationsProcessed: stats.organizationsProcessed,
          developersProcessed: stats.developersProcessed,
          repositoriesProcessed: stats.repositoriesProcessed,
          anomaliesDetected: stats.anomaliesDetected,
        },
        success: stats.success,
        errors: stats.errors,
      },
    });
  } catch (error) {
    logger.error('Error in triggerAllAggregation', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to trigger aggregation',
    });
  }
}

/**
 * Get cron job status
 * GET /api/metrics/aggregate/status
 */
export async function getCronJobStatus(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const status = await metricsJobsManager.getCronJobStatus();

    return reply.status(200).send({
      success: true,
      data: {
        cron: {
          schedule: '0 0 * * * (midnight UTC)',
          isScheduled: status.isScheduled,
          nextRun: status.nextRun?.toISOString(),
          lastRun: status.lastRun?.toISOString(),
        },
        queue: {
          totalJobs: status.jobCount,
        },
      },
    });
  } catch (error) {
    logger.error('Error in getCronJobStatus', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to get status',
    });
  }
}
