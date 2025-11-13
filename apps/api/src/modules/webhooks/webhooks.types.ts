/**
 * Webhook Type Definitions
 * Types for GitHub webhook events and processing
 */

/**
 * Supported GitHub webhook event types
 */
export type GitHubWebhookEventType =
  | 'push'
  | 'pull_request'
  | 'pull_request_review'
  | 'pull_request_review_comment'
  | 'issues'
  | 'issue_comment'
  | 'create'
  | 'delete';

/**
 * Webhook processing status
 */
export type WebhookStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * GitHub webhook signature verification result
 */
export interface SignatureVerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Webhook event metadata extracted from headers
 */
export interface WebhookHeaders {
  /** GitHub event type (e.g., 'push', 'pull_request') */
  event: string;
  /** GitHub webhook delivery GUID */
  deliveryId: string;
  /** HMAC signature for verification */
  signature: string;
  /** Hook ID */
  hookId?: string;
}

/**
 * Generic GitHub webhook payload structure
 * Each event type has its own specific structure
 */
export interface GitHubWebhookPayload {
  action?: string;
  repository: {
    id: number;
    node_id: string;
    name: string;
    full_name: string;
    private: boolean;
    owner: {
      login: string;
      id: number;
      avatar_url: string;
      type: string;
    };
    html_url: string;
    description: string | null;
    fork: boolean;
    created_at: string;
    updated_at: string;
    pushed_at: string;
    git_url: string;
    ssh_url: string;
    clone_url: string;
    svn_url: string;
    homepage: string | null;
    size: number;
    stargazers_count: number;
    watchers_count: number;
    language: string | null;
    has_issues: boolean;
    has_projects: boolean;
    has_downloads: boolean;
    has_wiki: boolean;
    has_pages: boolean;
    forks_count: number;
    archived: boolean;
    disabled: boolean;
    open_issues_count: number;
    license: {
      key: string;
      name: string;
      spdx_id: string;
      url: string;
    } | null;
    topics: string[];
    visibility: string;
    default_branch: string;
  };
  sender: {
    login: string;
    id: number;
    avatar_url: string;
    type: string;
  };
  installation?: {
    id: number;
  };
  [key: string]: unknown; // Allow additional properties for specific event types
}

/**
 * Push event specific payload
 */
export interface PushEventPayload extends GitHubWebhookPayload {
  ref: string;
  before: string;
  after: string;
  created: boolean;
  deleted: boolean;
  forced: boolean;
  base_ref: string | null;
  compare: string;
  commits: Array<{
    id: string;
    tree_id: string;
    distinct: boolean;
    message: string;
    timestamp: string;
    url: string;
    author: {
      name: string;
      email: string;
      username?: string;
    };
    committer: {
      name: string;
      email: string;
      username?: string;
    };
    added: string[];
    removed: string[];
    modified: string[];
  }>;
  head_commit: {
    id: string;
    tree_id: string;
    distinct: boolean;
    message: string;
    timestamp: string;
    url: string;
    author: {
      name: string;
      email: string;
      username?: string;
    };
    committer: {
      name: string;
      email: string;
      username?: string;
    };
    added: string[];
    removed: string[];
    modified: string[];
  } | null;
  pusher: {
    name: string;
    email: string;
  };
}

/**
 * Pull request event specific payload
 */
export interface PullRequestEventPayload extends GitHubWebhookPayload {
  action: 'opened' | 'closed' | 'reopened' | 'synchronize' | 'edited' | 'assigned' | 'unassigned' | 'review_requested' | 'review_request_removed' | 'labeled' | 'unlabeled';
  number: number;
  pull_request: {
    id: number;
    node_id: string;
    html_url: string;
    number: number;
    state: 'open' | 'closed';
    locked: boolean;
    title: string;
    user: {
      login: string;
      id: number;
      avatar_url: string;
    };
    body: string | null;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    merged_at: string | null;
    merge_commit_sha: string | null;
    assignee: unknown;
    assignees: unknown[];
    requested_reviewers: unknown[];
    requested_teams: unknown[];
    labels: unknown[];
    milestone: unknown;
    draft: boolean;
    commits_url: string;
    review_comments_url: string;
    review_comment_url: string;
    comments_url: string;
    statuses_url: string;
    head: {
      label: string;
      ref: string;
      sha: string;
      user: {
        login: string;
        id: number;
      };
      repo: unknown;
    };
    base: {
      label: string;
      ref: string;
      sha: string;
      user: {
        login: string;
        id: number;
      };
      repo: unknown;
    };
    _links: unknown;
    author_association: string;
    auto_merge: unknown;
    active_lock_reason: string | null;
    merged: boolean;
    mergeable: boolean | null;
    rebaseable: boolean | null;
    mergeable_state: string;
    merged_by: unknown;
    comments: number;
    review_comments: number;
    maintainer_can_modify: boolean;
    commits: number;
    additions: number;
    deletions: number;
    changed_files: number;
  };
}

/**
 * Issue event specific payload
 */
export interface IssueEventPayload extends GitHubWebhookPayload {
  action: 'opened' | 'closed' | 'reopened' | 'edited' | 'assigned' | 'unassigned' | 'labeled' | 'unlabeled';
  issue: {
    id: number;
    node_id: string;
    html_url: string;
    number: number;
    title: string;
    user: {
      login: string;
      id: number;
      avatar_url: string;
    };
    labels: unknown[];
    state: 'open' | 'closed';
    locked: boolean;
    assignee: unknown;
    assignees: unknown[];
    milestone: unknown;
    comments: number;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    author_association: string;
    active_lock_reason: string | null;
    body: string | null;
    reactions: unknown;
    timeline_url: string;
    performed_via_github_app: unknown;
  };
}

/**
 * Pull request review event specific payload
 */
export interface PullRequestReviewEventPayload extends GitHubWebhookPayload {
  action: 'submitted' | 'edited' | 'dismissed';
  review: {
    id: number;
    node_id: string;
    user: {
      login: string;
      id: number;
      avatar_url: string;
    };
    body: string | null;
    commit_id: string;
    submitted_at: string;
    state: 'commented' | 'approved' | 'changes_requested' | 'dismissed';
    html_url: string;
    pull_request_url: string;
    author_association: string;
    _links: unknown;
  };
  pull_request: {
    id: number;
    number: number;
    html_url: string;
    state: 'open' | 'closed';
    title: string;
    user: {
      login: string;
      id: number;
    };
    body: string | null;
    created_at: string;
    updated_at: string;
    head: {
      ref: string;
      sha: string;
    };
    base: {
      ref: string;
      sha: string;
    };
  };
}

/**
 * Webhook queue job data
 */
export interface WebhookJobData {
  /** Event type */
  event: GitHubWebhookEventType;
  /** Delivery ID from GitHub */
  deliveryId: string;
  /** Repository GitHub ID */
  repositoryId: number;
  /** Repository full name (owner/repo) */
  repositoryFullName: string;
  /** Webhook payload */
  payload: GitHubWebhookPayload;
  /** Timestamp when webhook was received */
  receivedAt: Date;
}

/**
 * Webhook processing result
 */
export interface WebhookProcessingResult {
  /** Whether the webhook was processed successfully */
  success: boolean;
  /** Event type */
  event: GitHubWebhookEventType;
  /** Delivery ID */
  deliveryId: string;
  /** Processing timestamp */
  processedAt: Date;
  /** Error message if failed */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Webhook validation result
 */
export interface WebhookValidationResult {
  /** Whether the webhook is valid */
  valid: boolean;
  /** Repository found in database */
  repository?: {
    id: string;
    githubId: bigint;
    name: string;
    fullName: string;
    orgId: string;
    webhookSecret: string | null;
  };
  /** Error message if invalid */
  error?: string;
}
