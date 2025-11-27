/**
 * Shared types for webhook event processors
 * Used across all processor modules
 */

/**
 * Result of processing a single event
 */
export interface ProcessorResult {
  success: boolean;
  recordsCreated: number;
  recordsUpdated: number;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Repository lookup result
 */
export interface RepositoryLookup {
  id: string;
  githubId: bigint;
  name: string;
  fullName: string;
  organizationId: string;
}

/**
 * Author lookup result
 */
export interface AuthorLookup {
  id: string;
  githubId: bigint;
  email?: string;
  name?: string;
}

/**
 * Processing context passed to processors
 */
export interface ProcessingContext {
  deliveryId: string;
  eventType: string;
  receivedAt: Date;
}

/**
 * Metrics tracking data for queue
 */
export interface MetricsCalculationJob {
  repositoryId: string;
  organizationId: string;
  userId?: string;
  date: string;
  source: 'webhook' | 'import' | 'manual';
  metadata?: Record<string, any>;
}

/**
 * Enhanced commit data for processing
 */
export interface EnhancedCommitData {
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  authorUsername?: string;
  additions: number;
  deletions: number;
  committedAt: Date;
  repositoryId: string;
  authorId?: string;
}

/**
 * Enhanced PR data with cycle time tracking
 */
export interface EnhancedPRData {
  number: number;
  title: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  additions: number;
  deletions: number;
  filesChanged: number;
  repositoryId: string;
  authorId?: string;
  authorGithubId?: bigint;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  mergedAt?: Date;
  cycleTime?: number; // Hours from creation to merge/close
}

/**
 * Enhanced issue data with resolution time tracking
 */
export interface EnhancedIssueData {
  number: number;
  title: string;
  state: 'OPEN' | 'CLOSED';
  repositoryId: string;
  authorId?: string;
  authorGithubId?: bigint;
  createdAt: Date;
  closedAt?: Date;
  resolutionTime?: number; // Hours from creation to close
}

/**
 * PR Review data
 */
export interface PRReviewData {
  prNumber: number;
  reviewerGithubId: bigint;
  reviewState: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED';
  reviewedAt: Date;
  repositoryId: string;
}
