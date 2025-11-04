/**
 * DevMetrics MCP Server Type Definitions
 */

export interface DevMetricsConfig {
  apiUrl: string;
  apiKey?: string;
  authToken?: string;
}

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  isPrivate: boolean;
  language?: string;
  webhookStatus: 'active' | 'inactive' | 'error';
  metrics?: {
    commits: number;
    pullRequests: number;
    issues: number;
  };
}

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  description?: string;
  status: 'open' | 'closed' | 'merged';
  author: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  repository: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  mergedAt?: string;
  metrics?: {
    linesAdded: number;
    linesDeleted: number;
    filesChanged: number;
    commits: number;
    comments: number;
  };
  aiInsights?: AIInsights;
}

export interface AIInsights {
  riskScore: number;
  complexity: 'low' | 'medium' | 'high';
  suggestions: string[];
  potentialBugs: Array<{
    line?: number;
    file?: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  securityIssues: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  estimatedReviewTime: number;
}

export interface TeamMetrics {
  organizationId: string;
  date: string;
  velocity: number;
  prCycleTime: number;
  deploymentFrequency: number;
  buildSuccessRate: number;
}

export interface DeveloperMetrics {
  userId: string;
  userName: string;
  date: string;
  commits: number;
  prsOpened: number;
  prsReviewed: number;
  issuesResolved: number;
  linesAdded: number;
  linesDeleted: number;
}

export interface VelocityMetric {
  current: number;
  average: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
  sprints: Array<{
    id: string;
    points: number;
    startDate: string;
    endDate: string;
  }>;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface DateRange {
  start: string;
  end: string;
}

