/**
 * Metrics API Validation Schemas
 * Zod schemas for request validation on metrics endpoints
 */

import { z } from 'zod';

// ============================================
// QUERY PARAMETER SCHEMAS
// ============================================

/**
 * Date range validation
 */
export const dateRangeQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  {
    message: 'startDate must be before or equal to endDate',
  }
);

/**
 * Pagination validation
 */
export const paginationQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().min(1))
    // ⬇️ was default('1')
    .default(1),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    // ⬇️ was default('20')
    .default(20),
});

/**
 * Developer metrics query parameters
 */
export const developerMetricsQuerySchema = dateRangeQuerySchema.merge(paginationQuerySchema);

/**
 * Team metrics query parameters
 */
export const teamMetricsQuerySchema = dateRangeQuerySchema.merge(paginationQuerySchema);

/**
 * Repository metrics query parameters
 */
export const repositoryMetricsQuerySchema = dateRangeQuerySchema.merge(paginationQuerySchema);

/**
 * Trends query parameters
 */
export const trendsQuerySchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
  granularity: z.enum(['day', 'week', 'month']).default('day'),
  metricTypes: z.string().transform((val) => val.split(',')).pipe(z.array(z.string())).optional(),
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  {
    message: 'startDate must be before or equal to endDate',
  }
);

// ============================================
// PATH PARAMETER SCHEMAS
// ============================================

/**
 * User ID parameter validation
 */
export const userIdParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

/**
 * Organization ID parameter validation
 */
export const organizationIdParamSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
});

/**
 * Repository ID parameter validation
 */
export const repositoryIdParamSchema = z.object({
  repositoryId: z.string().uuid('Invalid repository ID'),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type DeveloperMetricsQuery = z.infer<typeof developerMetricsQuerySchema>;
export type TeamMetricsQuery = z.infer<typeof teamMetricsQuerySchema>;
export type RepositoryMetricsQuery = z.infer<typeof repositoryMetricsQuerySchema>;
export type TrendsQuery = z.infer<typeof trendsQuerySchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;
export type OrganizationIdParam = z.infer<typeof organizationIdParamSchema>;
export type RepositoryIdParam = z.infer<typeof repositoryIdParamSchema>;

// ============================================
// JSON SCHEMAS FOR FASTIFY (NEW)
// ============================================

// Params JSON schemas
export const userIdParamJsonSchema = {
  type: 'object',
  properties: {
    userId: { type: 'string', format: 'uuid' },
  },
  required: ['userId'], // ✅ array
  additionalProperties: false,
} as const;

export const organizationIdParamJsonSchema = {
  type: 'object',
  properties: {
    organizationId: { type: 'string', format: 'uuid' },
  },
  required: ['organizationId'],
  additionalProperties: false,
} as const;

export const repositoryIdParamJsonSchema = {
  type: 'object',
  properties: {
    repositoryId: { type: 'string', format: 'uuid' },
  },
  required: ['repositoryId'],
  additionalProperties: false,
} as const;

// Query JSON schemas
export const developerMetricsQueryJsonSchema = {
  type: 'object',
  properties: {
    startDate: { type: 'string', format: 'date-time' },
    endDate: { type: 'string', format: 'date-time' },
    page: { type: 'string', pattern: '^[0-9]+$' },
    limit: { type: 'string', pattern: '^[0-9]+$' },
  },
  additionalProperties: false,
} as const;

export const teamMetricsQueryJsonSchema = {
  type: 'object',
  properties: {
    startDate: { type: 'string', format: 'date-time' },
    endDate: { type: 'string', format: 'date-time' },
    page: { type: 'string', pattern: '^[0-9]+$' },
    limit: { type: 'string', pattern: '^[0-9]+$' },
  },
  additionalProperties: false,
} as const;

export const repositoryMetricsQueryJsonSchema = {
  type: 'object',
  properties: {
    startDate: { type: 'string', format: 'date-time' },
    endDate: { type: 'string', format: 'date-time' },
    page: { type: 'string', pattern: '^[0-9]+$' },
    limit: { type: 'string', pattern: '^[0-9]+$' },
  },
  additionalProperties: false,
} as const;

export const trendsQueryJsonSchema = {
  type: 'object',
  properties: {
    organizationId: { type: 'string', format: 'uuid' },
    startDate: { type: 'string', format: 'date-time' },
    endDate: { type: 'string', format: 'date-time' },
    granularity: { type: 'string', enum: ['day', 'week', 'month'] },
    metricTypes: { type: 'string' },
  },
  required: ['organizationId', 'startDate', 'endDate'],
  additionalProperties: false,
} as const;
