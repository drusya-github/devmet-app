/**
 * Zod validation schemas for repositories endpoints
 */

import { z } from 'zod';

/**
 * Query parameters for listing available repositories
 */
export const listAvailableRepositoriesQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().positive().max(100)),
  perPage: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 30))
    .pipe(z.number().int().positive().max(100)),
  type: z.enum(['all', 'owner', 'member']).optional().default('all'),
  sort: z.enum(['created', 'updated', 'pushed', 'full_name']).optional().default('updated'),
});

/**
 * Connect repository request body schema
 */
export const connectRepositorySchema = z.object({
  githubRepoId: z
    .number()
    .int()
    .positive()
    .describe('GitHub repository ID (numeric)'),
  orgId: z
    .string()
    .uuid('orgId must be a valid UUID')
    .describe('Organization ID to connect the repository to'),
});

/**
 * Bulk connect repositories request body schema
 */
export const bulkConnectRepositoriesSchema = z.object({
  githubRepoIds: z
    .array(z.number().int().positive())
    .min(1, 'At least one repository ID is required')
    .max(50, 'Cannot connect more than 50 repositories at once')
    .describe('Array of GitHub repository IDs'),
  orgId: z
    .string()
    .uuid('orgId must be a valid UUID')
    .describe('Organization ID to connect the repositories to'),
});

/**
 * Repository ID parameter schema
 */
export const repositoryIdParamSchema = z.object({
  id: z.string().uuid('Repository ID must be a valid UUID'),
});

/**
 * Type exports for validated data
 */
export type ListAvailableRepositoriesQueryInput = z.infer<
  typeof listAvailableRepositoriesQuerySchema
>;

export type ConnectRepositoryInput = z.infer<typeof connectRepositorySchema>;

export type BulkConnectRepositoriesInput = z.infer<typeof bulkConnectRepositoriesSchema>;

export type RepositoryIdParam = z.infer<typeof repositoryIdParamSchema>;

