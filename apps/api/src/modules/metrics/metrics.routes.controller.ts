/**
 * Metrics API Controller
 * Request handlers for metrics endpoints
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { metricsRetrievalService } from './metrics.retrieval.service';
import MetricsCacheUtil from './metrics.cache';
import { logger } from '../../config/logger';
import { AppError } from '../../middleware/error-handler';
import type {
  DeveloperMetricsQuery,
  TeamMetricsQuery,
  RepositoryMetricsQuery,
  TrendsQuery,
  UserIdParam,
  OrganizationIdParam,
  RepositoryIdParam,
} from './metrics.validation';
import type {
  DeveloperMetricsResponse,
  TeamMetricsResponse,
  RepositoryMetricsResponse,
} from './metrics.api.types';

/**
 * Metrics Controller Class
 */
export class MetricsController {
  /**
   * GET /api/metrics/developer/:userId
   * Get individual developer metrics
   */
  async getDeveloperMetrics(
    request: FastifyRequest<{
      Params: UserIdParam;
      Querystring: DeveloperMetricsQuery;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { userId } = request.params;
      const { startDate, endDate, page, limit } = request.query;

      // Verify user is authenticated
      if (!request.user) {
        throw new AppError(401, 'Not authenticated');
      }

      // Get user's organization from their membership
      const userOrg = request.user.organizations[0]?.organization.id;
      if (!userOrg) {
        throw new AppError(403, 'User does not belong to any organization');
      }

      // Generate cache key
      const cacheKey = MetricsCacheUtil.generateCacheKey('developer', {
        userId,
        organizationId: userOrg,
        startDate: startDate || 'all',
        endDate: endDate || 'all',
        page,
        limit,
      });

      // Check cache (already in payload shape)
      const cached = (await MetricsCacheUtil.get(cacheKey)) as
        | {
            data: DeveloperMetricsResponse['data'];
            pagination: DeveloperMetricsResponse['pagination'];
          }
        | null;

      if (cached) {
        logger.debug('Serving cached developer metrics', {
          userId,
          organizationId: userOrg,
        });

        return reply.status(200).send({
          success: true,
          data: cached,
          cached: true,
        });
      }

      // Parse dates
      const dateRange = {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      };

      // Fetch metrics from service
      const metrics = await metricsRetrievalService.getDeveloperMetrics(
        userId,
        userOrg,
        dateRange,
        { page, limit }
      );

      // Explicit payload shape
      const payload: {
        data: DeveloperMetricsResponse['data'];
        pagination: DeveloperMetricsResponse['pagination'];
      } = {
        data: metrics.data,
        pagination: metrics.pagination,
      };

      // Cache the result in the same shape tests expect
      await MetricsCacheUtil.set(cacheKey, payload);

      logger.info('Developer metrics retrieved', {
        userId,
        organizationId: userOrg,
        total: payload.pagination.total,
      });

      return reply.status(200).send({
        success: true,
        data: payload,
        cached: false,
      });
    } catch (error) {
      logger.error('Error fetching developer metrics', {
        error: error instanceof Error ? error.message : String(error),
        userId: request.params.userId,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(500, 'Failed to fetch developer metrics');
    }
  }

  /**
   * GET /api/metrics/team/:organizationId
   * Get team/organization metrics
   */
  async getTeamMetrics(
    request: FastifyRequest<{
      Params: OrganizationIdParam;
      Querystring: TeamMetricsQuery;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { organizationId } = request.params;
      const { startDate, endDate, page, limit } = request.query;

      // Verify user is authenticated
      if (!request.user) {
        throw new AppError(401, 'Not authenticated');
      }

      // Generate cache key
      const cacheKey = MetricsCacheUtil.generateCacheKey('team', {
        organizationId,
        startDate: startDate || 'all',
        endDate: endDate || 'all',
        page,
        limit,
      });

      // Check cache (payload shape)
      const cached = (await MetricsCacheUtil.get(cacheKey)) as
        | {
            data: TeamMetricsResponse['data'];
            pagination: TeamMetricsResponse['pagination'];
            aggregates?: TeamMetricsResponse['aggregates'];
          }
        | null;

      if (cached) {
        logger.debug('Serving cached team metrics', { organizationId });

        return reply.status(200).send({
          success: true,
          data: cached,
          cached: true,
        });
      }

      // Parse dates
      const dateRange = {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      };

      // Fetch metrics
      const metrics = await metricsRetrievalService.getTeamMetrics(
        organizationId,
        dateRange,
        { page, limit }
      );

      // Explicit payload shape, including aggregates
      const payload: {
        data: TeamMetricsResponse['data'];
        pagination: TeamMetricsResponse['pagination'];
        aggregates?: TeamMetricsResponse['aggregates'];
      } = {
        data: metrics.data,
        pagination: metrics.pagination,
        aggregates: metrics.aggregates,
      };

      // Cache the result
      await MetricsCacheUtil.set(cacheKey, payload);

      logger.info('Team metrics retrieved', {
        organizationId,
        total: payload.pagination.total,
      });

      return reply.status(200).send({
        success: true,
        data: payload,
        cached: false,
      });
    } catch (error) {
      logger.error('Error fetching team metrics', {
        error: error instanceof Error ? error.message : String(error),
        organizationId: request.params.organizationId,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(500, 'Failed to fetch team metrics');
    }
  }

  /**
   * GET /api/metrics/repository/:repositoryId
   * Get repository metrics
   */
  async getRepositoryMetrics(
    request: FastifyRequest<{
      Params: RepositoryIdParam;
      Querystring: RepositoryMetricsQuery;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { repositoryId } = request.params;
      const { startDate, endDate, page, limit } = request.query;

      // Verify user is authenticated
      if (!request.user) {
        throw new AppError(401, 'Not authenticated');
      }

      // Generate cache key
      const cacheKey = MetricsCacheUtil.generateCacheKey('repository', {
        repositoryId,
        startDate: startDate || 'all',
        endDate: endDate || 'all',
        page,
        limit,
      });

      // Check cache (payload shape)
      const cached = (await MetricsCacheUtil.get(cacheKey)) as
        | {
            data: RepositoryMetricsResponse['data'];
            pagination: RepositoryMetricsResponse['pagination'];
          }
        | null;

      if (cached) {
        logger.debug('Serving cached repository metrics', { repositoryId });

        return reply.status(200).send({
          success: true,
          data: cached,
          cached: true,
        });
      }

      // Parse dates
      const dateRange = {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      };

      // Fetch metrics
      const metrics = await metricsRetrievalService.getRepositoryMetrics(
        repositoryId,
        dateRange,
        { page, limit }
      );

      // Explicit payload shape
      const payload: {
        data: RepositoryMetricsResponse['data'];
        pagination: RepositoryMetricsResponse['pagination'];
      } = {
        data: metrics.data,
        pagination: metrics.pagination,
      };

      // Cache the result
      await MetricsCacheUtil.set(cacheKey, payload);

      logger.info('Repository metrics retrieved', {
        repositoryId,
        total: payload.pagination.total,
      });

      return reply.status(200).send({
        success: true,
        data: payload,
        cached: false,
      });
    } catch (error) {
      logger.error('Error fetching repository metrics', {
        error: error instanceof Error ? error.message : String(error),
        repositoryId: request.params.repositoryId,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(500, 'Failed to fetch repository metrics');
    }
  }

  /**
   * GET /api/metrics/trends
   * Get trend data over time
   */
  async getTrends(
    request: FastifyRequest<{
      Querystring: TrendsQuery;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { organizationId, startDate, endDate, granularity, metricTypes } =
        request.query;

      // Verify user is authenticated
      if (!request.user) {
        throw new AppError(401, 'Not authenticated');
      }

      // Generate cache key
      const cacheKey = MetricsCacheUtil.generateCacheKey('trends', {
        organizationId,
        startDate,
        endDate,
        granularity,
        metricTypes: metricTypes?.join(',') || 'all',
      });

      // Check cache
      const cached = await MetricsCacheUtil.get(cacheKey);
      if (cached) {
        logger.debug('Serving cached trends', { organizationId });
        return reply.status(200).send({
          success: true,
          data: cached,
          cached: true,
        });
      }

      // Fetch trends
      const trends = await metricsRetrievalService.getMetricsTrends(
        organizationId,
        new Date(startDate),
        new Date(endDate),
        granularity
      );

      // Filter by metric types if specified
      let filteredTrends = trends;
      if (metricTypes && metricTypes.length > 0) {
        filteredTrends = trends.map((trend) => {
          const filtered: any = { date: trend.date };
          metricTypes.forEach((type) => {
            if (type in trend) {
              filtered[type] = (trend as any)[type];
            }
          });
          return filtered;
        });
      }

      // Cache the result
      await MetricsCacheUtil.set(cacheKey, filteredTrends);

      logger.info('Trends retrieved', {
        organizationId,
        granularity,
        dataPoints: filteredTrends.length,
      });

      return reply.status(200).send({
        success: true,
        data: filteredTrends,
        cached: false,
      });
    } catch (error) {
      logger.error('Error fetching trends', {
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(500, 'Failed to fetch trends');
    }
  }
}

// Export singleton instance
export const metricsController = new MetricsController();
