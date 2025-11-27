/**
 * Event Processors Index
 * Central export point for all webhook event processors
 */

// Export all processor functions
export { processPushEvent } from './push.processor';
export { processPullRequestEvent } from './pullrequest.processor';
export { processIssueEvent } from './issue.processor';
export { processPullRequestReviewEvent } from './review.processor';

// Export shared types
export type {
  ProcessorResult,
  ProcessingContext,
  RepositoryLookup,
  AuthorLookup,
  MetricsCalculationJob,
  EnhancedCommitData,
  EnhancedPRData,
  EnhancedIssueData,
  PRReviewData,
} from './processors.types';

// Export shared helpers
export {
  findRepository,
  findOrCreateAuthor,
  calculateHoursDiff,
  calculateMinutesDiff,
  truncateString,
  sanitizeEmail,
  extractUsername,
  getTodayDate,
  isValidGithubId,
  retryWithBackoff,
} from './processors.helpers';
