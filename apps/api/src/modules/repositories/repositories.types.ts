/**
 * Type definitions for repositories module
 */

/**
 * Repository listing options
 */
export interface ListRepositoriesOptions {
  page?: number;
  perPage?: number;
  type?: 'all' | 'owner' | 'member';
  sort?: 'created' | 'updated' | 'pushed' | 'full_name';
}

/**
 * Transformed repository data returned to client
 */
export interface RepositoryListItem {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  isPrivate: boolean;
  defaultBranch: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  pushedAt: string | null;
}

/**
 * Pagination metadata
 */
export interface PaginationMetadata {
  page: number;
  perPage: number;
  total: number;
  hasMore: boolean;
}

/**
 * Repository listing response
 */
export interface RepositoryListResponse {
  data: RepositoryListItem[];
  pagination: PaginationMetadata;
}

/**
 * Connect repository request payload
 */
export interface ConnectRepositoryRequest {
  githubRepoId: number;
  orgId: string;
}

/**
 * Bulk connect repositories request payload
 */
export interface BulkConnectRepositoriesRequest {
  githubRepoIds: number[];
  orgId: string;
}

/**
 * Connected repository response (with stats)
 */
export interface ConnectedRepository {
  id: string;
  orgId: string;
  githubId: string;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  isPrivate: boolean;
  webhookId: string | null;
  syncStatus: 'PENDING' | 'SYNCING' | 'ACTIVE' | 'ERROR' | 'PAUSED';
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  stats: {
    commits: number;
    pullRequests: number;
    issues: number;
  };
}

/**
 * Bulk connect result
 */
export interface BulkConnectResult {
  success: ConnectedRepository[];
  failed: Array<{
    githubRepoId: number;
    error: string;
  }>;
}

