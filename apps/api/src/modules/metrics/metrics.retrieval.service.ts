/**
 * Metrics Retrieval Service
 * Service layer for fetching and aggregating metrics data
 * Complements the existing MetricsService for calculation
 */

import { prisma } from '../../database/prisma.client';
import { logger } from '../../config/logger';
import type {
  DateRangeFilter,
  PaginationParams,
  PaginatedResponse,
  PaginationMeta,
  DeveloperMetricsResponse,
  TeamMetricsResponse,
  TeamMetricsAggregates,
  RepositoryMetricsResponse,
  TrendPoint,
} from './metrics.api.types';
import type { DeveloperMetric, TeamMetric, RepositoryStats } from '@prisma/client';

/**
 * Service for retrieving and aggregating metrics
 */
export class MetricsRetrievalService {
  /**
   * Build pagination metadata
   */
  private buildPaginationMeta(
    page: number,
    limit: number,
    total: number
  ): PaginationMeta {
    const totalPages = Math.ceil(total / limit);
    return {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  /**
   * Normalize/guard pagination (handles string/undefined safely)
   */
  private normalizePagination(pagination: PaginationParams) {
    const rawPage = (pagination && (pagination as any).page) ?? 1;
    const rawLimit = (pagination && (pagination as any).limit) ?? 20;

    let page = Number(rawPage);
    let limit = Number(rawLimit);

    if (!Number.isFinite(page) || page < 1) page = 1;
    if (!Number.isFinite(limit) || limit < 1) limit = 20;

    const skip = (page - 1) * limit;

    return { page, limit, skip };
  }

  /**
   * Build date filter for Prisma queries
   */
  private buildDateFilter(dateRange: DateRangeFilter): any {
    const filter: any = {};
    
    if (dateRange.startDate) {
      filter.gte = dateRange.startDate;
    }
    
    if (dateRange.endDate) {
      filter.lte = dateRange.endDate;
    }
    
    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  /**
   * Get metrics for a specific developer
   */
  async getDeveloperMetrics(
    userId: string,
    organizationId: string,
    dateRange: DateRangeFilter,
    pagination: PaginationParams
  ): Promise<DeveloperMetricsResponse> {
    const { page, limit, skip } = this.normalizePagination(pagination);
    const dateFilter = this.buildDateFilter(dateRange);

    try {
      // Build where clause
      const where = {
        userId,
        organizationId,
        ...(dateFilter && { date: dateFilter }),
      };

      // Get total count
      const total = await prisma.developerMetric.count({ where });

      // Get paginated metrics
      const metrics = await prisma.developerMetric.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,          // ✅ always an Int
        take: limit,   // ✅ always an Int
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });

      logger.debug('Retrieved developer metrics', {
        userId,
        organizationId,
        total,
        page,
      });

      return {
        data: metrics,
        pagination: this.buildPaginationMeta(page, limit, total),
      };
    } catch (error) {
      logger.error('Error retrieving developer metrics', {
        userId,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get aggregated metrics for a team/organization
   */
  async getTeamMetrics(
    organizationId: string,
    dateRange: DateRangeFilter,
    pagination: PaginationParams
  ): Promise<TeamMetricsResponse> {
    const { page, limit, skip } = this.normalizePagination(pagination);
    const dateFilter = this.buildDateFilter(dateRange);

    try {
      // Build where clause
      const where = {
        organizationId,
        ...(dateFilter && { date: dateFilter }),
      };

      // Get total count
      const total = await prisma.teamMetric.count({ where });

      // Get paginated metrics
      const metrics = await prisma.teamMetric.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,          // ✅ Int
        take: limit,   // ✅ Int
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      // Calculate aggregates
      const aggregates = await this.calculateTeamAggregates(organizationId, dateRange);

      logger.debug('Retrieved team metrics', {
        organizationId,
        total,
        page,
      });

      return {
        data: metrics,
        pagination: this.buildPaginationMeta(page, limit, total),
        aggregates,
      };
    } catch (error) {
      logger.error('Error retrieving team metrics', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get metrics for a specific repository
   */
  async getRepositoryMetrics(
    repositoryId: string,
    dateRange: DateRangeFilter,
    pagination: PaginationParams
  ): Promise<RepositoryMetricsResponse> {
    const { page, limit, skip } = this.normalizePagination(pagination);
    const dateFilter = this.buildDateFilter(dateRange);

    try {
      // Build where clause
      const where = {
        repoId: repositoryId,
        ...(dateFilter && { date: dateFilter }),
      };

      // Get total count
      const total = await prisma.repositoryStats.count({ where });

      // Get paginated metrics
      const metrics = await prisma.repositoryStats.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,          // ✅ Int
        take: limit,   // ✅ Int
        include: {
          repository: {
            select: {
              id: true,
              name: true,
              fullName: true,
              language: true,
            },
          },
        },
      });

      logger.debug('Retrieved repository metrics', {
        repositoryId,
        total,
        page,
      });

      return {
        data: metrics,
        pagination: this.buildPaginationMeta(page, limit, total),
      };
    } catch (error) {
      logger.error('Error retrieving repository metrics', {
        repositoryId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get trend data over time for an organization
   */
  async getMetricsTrends(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    granularity: 'day' | 'week' | 'month' = 'day'
  ): Promise<TrendPoint[]> {
    try {
      // Fetch developer metrics within date range for the organization
      const metrics = await prisma.developerMetric.findMany({
        where: {
          organizationId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { date: 'asc' },
        select: {
          date: true,
          commits: true,
          prsOpened: true,
          prsMerged: true,
          issuesOpened: true,
          issuesResolved: true,
          linesAdded: true,
          linesDeleted: true,
          userId: true,
        },
      });

      // Group metrics by time period
      const trendMap = new Map<string, TrendPoint>();

      metrics.forEach((metric) => {
        const dateKey = this.formatDateByGranularity(metric.date, granularity);
        
        if (!trendMap.has(dateKey)) {
          trendMap.set(dateKey, {
            date: dateKey,
            commits: 0,
            pullRequests: 0,
            issues: 0,
            linesAdded: 0,
            linesDeleted: 0,
            activeContributors: 0,
          });
        }

        const trend = trendMap.get(dateKey)!;
        trend.commits += metric.commits;
        trend.pullRequests += metric.prsOpened + metric.prsMerged;
        trend.issues += metric.issuesOpened + metric.issuesResolved;
        trend.linesAdded += metric.linesAdded;
        trend.linesDeleted += metric.linesDeleted;
      });

      // Count unique contributors per period
      const contributorsByPeriod = new Map<string, Set<string>>();
      metrics.forEach((metric) => {
        const dateKey = this.formatDateByGranularity(metric.date, granularity);
        if (!contributorsByPeriod.has(dateKey)) {
          contributorsByPeriod.set(dateKey, new Set());
        }
        contributorsByPeriod.get(dateKey)!.add(metric.userId);
      });

      // Update active contributors count
      trendMap.forEach((trend, dateKey) => {
        trend.activeContributors = contributorsByPeriod.get(dateKey)?.size || 0;
      });

      logger.debug('Retrieved metrics trends', {
        organizationId,
        granularity,
        dataPoints: trendMap.size,
      });

      return Array.from(trendMap.values());
    } catch (error) {
      logger.error('Error retrieving metrics trends', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Calculate team-wide aggregates
   */
  private async calculateTeamAggregates(
    organizationId: string,
    dateRange: DateRangeFilter
  ): Promise<TeamMetricsAggregates> {
    const dateFilter = this.buildDateFilter(dateRange);

    try {
      const where = {
        organizationId,
        ...(dateFilter && { date: dateFilter }),
      };

      // Aggregate team metrics
      const aggregates = await prisma.teamMetric.aggregate({
        where,
        _sum: {
          totalCommits: true,
          totalPrsOpened: true,
          totalPrsMerged: true,
          totalIssuesClosed: true,
          prQueueLength: true,
          issueBacklog: true,
        },
        _avg: {
          velocity: true,
          avgPrCycleTime: true,
          activeContributors: true,
        },
      });

      return {
        totalCommits: aggregates._sum.totalCommits || 0,
        totalPrsOpened: aggregates._sum.totalPrsOpened || 0,
        totalPrsMerged: aggregates._sum.totalPrsMerged || 0,
        totalIssuesClosed: aggregates._sum.totalIssuesClosed || 0,
        avgVelocity: Math.round(aggregates._avg.velocity || 0),
        avgPrCycleTime: Math.round(aggregates._avg.avgPrCycleTime || 0),
        activeContributors: Math.round(aggregates._avg.activeContributors || 0),
        prQueueLength: aggregates._sum.prQueueLength || 0,
        issueBacklog: aggregates._sum.issueBacklog || 0,
      };
    } catch (error) {
      logger.error('Error calculating team aggregates', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Format date based on granularity
   */
  private formatDateByGranularity(date: Date, granularity: string): string {
    const d = new Date(date);
    
    switch (granularity) {
      case 'day':
        return d.toISOString().split('T')[0]; // YYYY-MM-DD
      case 'week': {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return weekStart.toISOString().split('T')[0];
      }
      case 'month':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      default:
        return d.toISOString().split('T')[0];
    }
  }
}

// Export singleton instance
export const metricsRetrievalService = new MetricsRetrievalService();
