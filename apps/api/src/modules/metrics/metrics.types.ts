/**
 * DevMetrics - Metrics Module Types
 * Defines interfaces and types for metrics calculation
 */

/**
 * Time windows for metrics aggregation
 */
export type TimeWindow = 'daily' | 'weekly' | 'monthly';

/**
 * Metrics calculation job data
 */
export interface MetricsJobData {
  organizationId: string;
  userId?: string; // Optional - if calculating for specific user
  repositoryId?: string; // Optional - if calculating for specific repo
  startDate?: Date;
  endDate?: Date;
  timeWindow?: TimeWindow;
  calculationType: 'incremental' | 'batch' | 'historical';
}

/**
 * Developer metrics calculation result
 */
export interface DeveloperMetricsResult {
  userId: string;
  organizationId: string;
  date: Date;
  
  // Commit metrics
  commits: number;
  linesAdded: number;
  linesDeleted: number;
  filesChanged: number;
  
  // PR metrics
  prsOpened: number;
  prsMerged: number;
  prsClosed: number;
  avgPrSize: number;
  
  // Review metrics
  prsReviewed: number;
  reviewComments: number;
  avgReviewTime: number; // in minutes
  
  // Issue metrics
  issuesOpened: number;
  issuesResolved: number;
  avgIssueTime: number; // in hours
  
  // Activity patterns
  commitsOnWeekend: number;
  commitsLateNight: number;
  avgCommitTime?: string;
  
  // Quality indicators
  avgCodeQuality?: number;
  bugIntroduced: number;
  bugFixed: number;
}

/**
 * Team metrics calculation result
 */
export interface TeamMetricsResult {
  organizationId: string;
  date: Date;
  
  // Velocity metrics
  velocity: number;
  avgPrCycleTime: number; // in hours
  avgReviewTime: number; // in hours
  
  // Throughput
  totalCommits: number;
  totalPrsOpened: number;
  totalPrsMerged: number;
  totalIssuesClosed: number;
  
  // Quality metrics
  buildSuccessRate?: number;
  testCoverage?: number;
  codeQualityScore?: number;
  
  // Deployment metrics
  deploymentFrequency: number;
  deploymentSuccessRate?: number;
  meanTimeToRecovery?: number;
  changeFailureRate?: number;
  
  // Team health
  activeContributors: number;
  prReviewCoverage?: number;
  knowledgeDistribution?: number;
  
  // Bottlenecks
  prQueueLength: number;
  avgPrQueueTime: number;
  issueBacklog: number;
}

/**
 * Repository metrics calculation result
 */
export interface RepositoryMetricsResult {
  repositoryId: string;
  date: Date;
  
  // Activity
  commits: number;
  prsOpened: number;
  prsMerged: number;
  prsClosed: number;
  issuesOpened: number;
  issuesClosed: number;
  
  // Contributors
  uniqueContributors: number;
  topContributor?: string;
  
  // Code changes
  linesAdded: number;
  linesDeleted: number;
  filesChanged: number;
  
  // Engagement
  stars?: number;
  forks?: number;
  watchers?: number;
}

/**
 * Metrics calculation context
 */
export interface MetricsCalculationContext {
  organizationId: string;
  startDate: Date;
  endDate: Date;
  timeWindow: TimeWindow;
}

/**
 * Batch calculation options
 */
export interface BatchCalculationOptions {
  organizationId: string;
  startDate: Date;
  endDate: Date;
  includeRepositories?: string[]; // Specific repos to process
  excludeRepositories?: string[]; // Repos to skip
  recalculate?: boolean; // Overwrite existing metrics
}

/**
 * Incremental calculation options
 */
export interface IncrementalCalculationOptions {
  organizationId: string;
  date: Date; // Specific date to calculate
  entities?: {
    userIds?: string[];
    repositoryIds?: string[];
  };
}
