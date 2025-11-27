/**
 * Metrics API Types
 * TypeScript type definitions for metrics endpoints
 */

import type { DeveloperMetric, TeamMetric, RepositoryStats } from '@prisma/client';

// ============================================
// REQUEST TYPES
// ============================================

export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface MetricsQueryParams extends DateRangeFilter, PaginationParams {}

// ============================================
// RESPONSE TYPES
// ============================================

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// ============================================
// DEVELOPER METRICS
// ============================================

export interface DeveloperMetricsResponse extends PaginatedResponse<DeveloperMetric> {
  summary?: DeveloperMetricsSummary;
}

export interface DeveloperMetricsSummary {
  totalCommits: number;
  totalLinesAdded: number;
  totalLinesDeleted: number;
  totalPRs: number;
  avgProductivity: number;
}

// ============================================
// TEAM METRICS
// ============================================

export interface TeamMetricsResponse extends PaginatedResponse<TeamMetric> {
  aggregates: TeamMetricsAggregates;
}

export interface TeamMetricsAggregates {
  totalCommits: number;
  totalPrsOpened: number;
  totalPrsMerged: number;
  totalIssuesClosed: number;
  avgVelocity: number;
  avgPrCycleTime: number;
  activeContributors: number;
  prQueueLength: number;
  issueBacklog: number;
}

// ============================================
// REPOSITORY METRICS
// ============================================

export interface RepositoryMetricsResponse extends PaginatedResponse<RepositoryStats> {
  summary?: RepositoryMetricsSummary;
}

export interface RepositoryMetricsSummary {
  totalCommits: number;
  totalPRs: number;
  totalIssues: number;
  uniqueContributors: number;
  topContributor?: string;
}

// ============================================
// TRENDS
// ============================================

export interface TrendPoint {
  date: string;
  commits: number;
  pullRequests: number;
  issues: number;
  linesAdded: number;
  linesDeleted: number;
  activeContributors?: number;
}

export interface TrendsResponse {
  data: TrendPoint[];
  granularity: 'day' | 'week' | 'month';
  dateRange: {
    start: string;
    end: string;
  };
}

// ============================================
// CACHE TYPES
// ============================================

export interface CachedMetricsResponse<T> {
  success: true;
  data: T;
  cached: boolean;
  cachedAt?: string;
}

// ============================================
// ERROR TYPES
// ============================================

export interface MetricsErrorResponse {
  success: false;
  error: string;
  message: string;
  statusCode: number;
}
