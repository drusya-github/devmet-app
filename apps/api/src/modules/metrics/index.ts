/**
 * Metrics API Module
 * Exports for metrics retrieval endpoints
 */

export { metricsRoutes } from './metrics.api.routes';
export { metricsController } from './metrics.routes.controller';
export { metricsRetrievalService } from './metrics.retrieval.service';
export { default as MetricsCacheUtil } from './metrics.cache';

// Export types
export type {
  DateRangeFilter,
  PaginationParams,
  MetricsQueryParams,
  PaginationMeta,
  PaginatedResponse,
  DeveloperMetricsResponse,
  TeamMetricsResponse,
  RepositoryMetricsResponse,
  TrendPoint,
  TrendsResponse,
} from './metrics.api.types';

// Export validation schemas
export * from './metrics.validation';

// Queue and worker
export { metricsQueue } from './metrics.queue';
export * from './metrics.worker';

// Service layer
export * from './metrics.service';
export * from './metrics.types';

// Aggregation and jobs (Task 25)
export * from './metrics.jobs';
export * from './metrics.anomaly';
export * from './metrics.aggregation.controller';
export { metricsAggregationRoutes } from './metrics.aggregation.routes';