/**
 * Mock Data Factories for Testing
 * Provides factory functions to generate realistic test data for all models
 */

import type {
  User,
  Organization,
  Repository,
  Commit,
  PullRequest,
  Issue,
  DeveloperMetric,
  TeamMetric,
  AIReview,
} from '@prisma/client';

/**
 * Helper to generate random IDs
 */
export const generateId = (): string => {
  return `${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
};

/**
 * Helper to generate sequential numbers
 */
let sequenceCounter = 0;
export const nextSequence = (): number => ++sequenceCounter;
export const resetSequence = (): void => {
  sequenceCounter = 0;
};

/**
 * User Factory
 */
export const createMockUser = (overrides?: Partial<User>): User => {
  const id = generateId();
  const num = nextSequence();

  return {
    id,
    githubId: BigInt(100000 + num),
    email: `user${num}@example.com`,
    name: `Test User ${num}`,
    avatarUrl: `https://avatars.githubusercontent.com/u/${100000 + num}`,
    accessToken: `gho_mock_access_token_${id}`,
    refreshToken: `ghr_mock_refresh_token_${id}`,
    tokenExpiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    preferences: {},
    notificationPreferences: {},
    lastLoginAt: new Date(),
    lastLoginIp: '127.0.0.1',
    loginCount: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

/**
 * Organization Factory
 */
export const createMockOrganization = (overrides?: Partial<Organization>): Organization => {
  const id = generateId();
  const num = nextSequence();

  return {
    id,
    githubId: BigInt(200000 + num),
    name: `Test Organization ${num}`,
    slug: `test-org-${num}`,
    planType: 'FREE',
    planLimits: null,
    settings: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

/**
 * Repository Factory
 */
export const createMockRepository = (overrides?: Partial<Repository>): Repository => {
  const id = generateId();
  const num = nextSequence();
  const name = `test-repo-${num}`;

  return {
    id,
    orgId: generateId(),
    githubId: BigInt(300000 + num),
    name,
    fullName: `test-org/${name}`,
    description: `Test repository ${num} for development metrics`,
    isPrivate: false,
    language: 'TypeScript',
    webhookId: BigInt(400000 + num),
    webhookSecret: null,
    lastSyncedAt: new Date(),
    syncStatus: 'ACTIVE',
    aiReviewEnabled: true,
    sensitivityLevel: 'NORMAL',
    webhookRateLimit: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

/**
 * Commit Factory
 */
export const createMockCommit = (overrides?: Partial<Commit>): Commit => {
  const id = generateId();
  const num = nextSequence();
  const sha = Math.random().toString(36).substring(2, 42).padEnd(40, '0');

  return {
    id,
    repoId: generateId(),
    githubId: sha, // githubId is the SHA (string in schema)
    sha,
    message: `Test commit ${num}: Implement feature`,
    authorId: null,
    authorGithubId: BigInt(500000 + num),
    authorName: `Test Author ${num}`,
    authorEmail: `author${num}@example.com`,
    additions: Math.floor(Math.random() * 100) + 10,
    deletions: Math.floor(Math.random() * 50),
    committedAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
};

/**
 * Pull Request Factory
 */
export const createMockPullRequest = (overrides?: Partial<PullRequest>): PullRequest => {
  const id = generateId();
  const num = nextSequence();

  return {
    id,
    repoId: generateId(),
    githubId: BigInt(600000 + num),
    number: num,
    title: `Test PR ${num}: Add new feature`,
    state: 'OPEN',
    authorId: null,
    authorGithubId: BigInt(700000 + num),
    additions: Math.floor(Math.random() * 200) + 20,
    deletions: Math.floor(Math.random() * 100),
    filesChanged: Math.floor(Math.random() * 15) + 1,
    mergedAt: null,
    closedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

/**
 * Issue Factory
 */
export const createMockIssue = (overrides?: Partial<Issue>): Issue => {
  const id = generateId();
  const num = nextSequence();

  return {
    id,
    repoId: generateId(),
    githubId: BigInt(800000 + num),
    number: num,
    title: `Test Issue ${num}: Bug report`,
    state: 'OPEN',
    authorId: null,
    authorGithubId: BigInt(900000 + num),
    closedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
};

/**
 * Developer Metric Factory
 */
export const createMockDeveloperMetric = (
  overrides?: Partial<DeveloperMetric>
): DeveloperMetric => {
  const id = generateId();

  return {
    id,
    userId: generateId(),
    orgId: generateId(),
    date: new Date(),
    commits: Math.floor(Math.random() * 20) + 1,
    linesAdded: Math.floor(Math.random() * 500) + 50,
    linesDeleted: Math.floor(Math.random() * 200) + 20,
    filesChanged: Math.floor(Math.random() * 50) + 5,
    prsOpened: Math.floor(Math.random() * 5) + 1,
    prsMerged: Math.floor(Math.random() * 4),
    prsClosed: Math.floor(Math.random() * 2),
    avgPrSize: Math.floor(Math.random() * 100) + 20,
    prsReviewed: Math.floor(Math.random() * 8) + 2,
    reviewComments: Math.floor(Math.random() * 20) + 5,
    avgReviewTime: Math.floor(Math.random() * 120) + 30, // minutes
    issuesOpened: Math.floor(Math.random() * 3),
    issuesResolved: Math.floor(Math.random() * 5),
    avgIssueTime: Math.floor(Math.random() * 48) + 4, // hours
    commitsOnWeekend: Math.floor(Math.random() * 5),
    commitsLateNight: Math.floor(Math.random() * 3),
    avgCommitTime: '14:30',
    avgCodeQuality: Math.random() * 100,
    bugIntroduced: Math.floor(Math.random() * 2),
    bugFixed: Math.floor(Math.random() * 3),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

/**
 * Team Metric Factory
 */
export const createMockTeamMetric = (overrides?: Partial<TeamMetric>): TeamMetric => {
  const id = generateId();

  return {
    id,
    orgId: generateId(),
    date: new Date(),
    velocity: Math.floor(Math.random() * 50) + 10,
    avgPrCycleTime: Math.floor(Math.random() * 72) + 12, // hours
    avgReviewTime: Math.floor(Math.random() * 24) + 2, // hours
    totalCommits: Math.floor(Math.random() * 100) + 20,
    totalPrsOpened: Math.floor(Math.random() * 30) + 5,
    totalPrsMerged: Math.floor(Math.random() * 25) + 3,
    totalIssuesClosed: Math.floor(Math.random() * 15) + 3,
    buildSuccessRate: Math.random() * 100,
    testCoverage: Math.random() * 100,
    codeQualityScore: Math.random() * 100,
    deploymentFrequency: Math.floor(Math.random() * 5) + 1,
    deploymentSuccessRate: Math.random() * 100,
    meanTimeToRecovery: Math.floor(Math.random() * 120) + 30, // minutes
    changeFailureRate: Math.random() * 20, // 0-20%
    activeContributors: Math.floor(Math.random() * 10) + 3,
    prReviewCoverage: Math.random() * 100,
    knowledgeDistribution: Math.random() * 100,
    prQueueLength: Math.floor(Math.random() * 20) + 5,
    avgPrQueueTime: Math.floor(Math.random() * 48) + 12, // hours
    issueBacklog: Math.floor(Math.random() * 50) + 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

/**
 * AI Review Factory
 */
export const createMockAIReview = (overrides?: Partial<AIReview>): AIReview => {
  const id = generateId();
  const riskScore = Math.floor(Math.random() * 100);

  return {
    id,
    prId: generateId(),
    analysis: 'This pull request looks good overall. The code follows best practices.',
    suggestions: [
      'Consider adding more error handling',
      'Add unit tests for the new functionality',
      'Update the documentation',
    ],
    riskScore,
    complexity: 'medium',
    bugsPotential: Math.floor(Math.random() * 5),
    securityIssues: Math.floor(Math.random() * 3),
    qualityIssues: Math.floor(Math.random() * 4),
    performanceConcerns: Math.floor(Math.random() * 2),
    modelVersion: 'claude-3-sonnet',
    tokensUsed: Math.floor(Math.random() * 2000) + 500,
    processingTime: Math.floor(Math.random() * 5000) + 1000, // milliseconds
    visibility: 'team',
    isSharedToGithub: false,
    githubCommentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

/**
 * Batch factory - creates multiple instances
 */
export const createMockBatch = <T>(
  factory: (overrides?: any) => T,
  count: number,
  overrides?: Partial<T>
): T[] => {
  return Array.from({ length: count }, () => factory(overrides));
};

/**
 * Reset all factories (useful between tests)
 */
export const resetFactories = (): void => {
  resetSequence();
};
