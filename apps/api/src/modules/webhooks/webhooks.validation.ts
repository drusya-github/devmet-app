/**
 * Webhook Validation Schemas
 * Zod schemas for validating GitHub webhook payloads
 */

import { z } from 'zod';

/**
 * Supported GitHub webhook event types
 */
export const webhookEventTypeSchema = z.enum([
  'push',
  'pull_request',
  'pull_request_review',
  'pull_request_review_comment',
  'issues',
  'issue_comment',
  'create',
  'delete',
]);

/**
 * Webhook headers schema
 * Validates required GitHub webhook headers
 */
export const webhookHeadersSchema = z.object({
  'x-github-event': z.string().min(1, 'GitHub event type is required'),
  'x-github-delivery': z.string().uuid('Delivery ID must be a valid UUID'),
  'x-hub-signature-256': z.string().min(1, 'Signature is required'),
  'x-github-hook-id': z.string().optional(),
});

/**
 * Base GitHub webhook payload schema
 * Common fields present in all webhook events
 */
export const baseWebhookPayloadSchema = z.object({
  repository: z.object({
    id: z.number().int().positive(),
    node_id: z.string(),
    name: z.string(),
    full_name: z.string(),
    private: z.boolean(),
    owner: z.object({
      login: z.string(),
      id: z.number().int().positive(),
      avatar_url: z.string().url(),
      type: z.string(),
    }),
    html_url: z.string().url(),
    description: z.string().nullable(),
    fork: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    pushed_at: z.string(),
    git_url: z.string(),
    ssh_url: z.string(),
    clone_url: z.string().url(),
    svn_url: z.string().url(),
    homepage: z.string().nullable(),
    size: z.number().int().nonnegative(),
    stargazers_count: z.number().int().nonnegative(),
    watchers_count: z.number().int().nonnegative(),
    language: z.string().nullable(),
    has_issues: z.boolean(),
    has_projects: z.boolean(),
    has_downloads: z.boolean(),
    has_wiki: z.boolean(),
    has_pages: z.boolean(),
    forks_count: z.number().int().nonnegative(),
    archived: z.boolean(),
    disabled: z.boolean(),
    open_issues_count: z.number().int().nonnegative(),
    license: z
      .object({
        key: z.string(),
        name: z.string(),
        spdx_id: z.string(),
        url: z.string().url(),
      })
      .nullable(),
    topics: z.array(z.string()),
    visibility: z.string(),
    default_branch: z.string(),
  }),
  sender: z.object({
    login: z.string(),
    id: z.number().int().positive(),
    avatar_url: z.string().url(),
    type: z.string(),
  }),
  installation: z
    .object({
      id: z.number().int().positive(),
    })
    .optional(),
}).passthrough(); // Allow additional properties for specific event types

/**
 * Push event payload schema
 */
export const pushEventPayloadSchema = baseWebhookPayloadSchema.extend({
  ref: z.string(),
  before: z.string(),
  after: z.string(),
  created: z.boolean(),
  deleted: z.boolean(),
  forced: z.boolean(),
  base_ref: z.string().nullable(),
  compare: z.string().url(),
  commits: z.array(
    z.object({
      id: z.string(),
      tree_id: z.string(),
      distinct: z.boolean(),
      message: z.string(),
      timestamp: z.string(),
      url: z.string().url(),
      author: z.object({
        name: z.string(),
        email: z.string().email(),
        username: z.string().optional(),
      }),
      committer: z.object({
        name: z.string(),
        email: z.string().email(),
        username: z.string().optional(),
      }),
      added: z.array(z.string()),
      removed: z.array(z.string()),
      modified: z.array(z.string()),
    })
  ),
  head_commit: z
    .object({
      id: z.string(),
      tree_id: z.string(),
      distinct: z.boolean(),
      message: z.string(),
      timestamp: z.string(),
      url: z.string().url(),
      author: z.object({
        name: z.string(),
        email: z.string().email(),
        username: z.string().optional(),
      }),
      committer: z.object({
        name: z.string(),
        email: z.string().email(),
        username: z.string().optional(),
      }),
      added: z.array(z.string()),
      removed: z.array(z.string()),
      modified: z.array(z.string()),
    })
    .nullable(),
  pusher: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
});

/**
 * Pull request event payload schema
 */
export const pullRequestEventPayloadSchema = baseWebhookPayloadSchema.extend({
  action: z.enum([
    'opened',
    'closed',
    'reopened',
    'synchronize',
    'edited',
    'assigned',
    'unassigned',
    'review_requested',
    'review_request_removed',
    'labeled',
    'unlabeled',
  ]),
  number: z.number().int().positive(),
  pull_request: z.object({
    id: z.number().int().positive(),
    node_id: z.string(),
    html_url: z.string().url(),
    number: z.number().int().positive(),
    state: z.enum(['open', 'closed']),
    locked: z.boolean(),
    title: z.string(),
    user: z.object({
      login: z.string(),
      id: z.number().int().positive(),
      avatar_url: z.string().url(),
    }),
    body: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    closed_at: z.string().nullable(),
    merged_at: z.string().nullable(),
    merge_commit_sha: z.string().nullable(),
    draft: z.boolean(),
    head: z.object({
      label: z.string(),
      ref: z.string(),
      sha: z.string(),
      user: z.object({
        login: z.string(),
        id: z.number().int().positive(),
      }),
    }),
    base: z.object({
      label: z.string(),
      ref: z.string(),
      sha: z.string(),
      user: z.object({
        login: z.string(),
        id: z.number().int().positive(),
      }),
    }),
    merged: z.boolean(),
    mergeable: z.boolean().nullable(),
    comments: z.number().int().nonnegative(),
    review_comments: z.number().int().nonnegative(),
    commits: z.number().int().nonnegative(),
    additions: z.number().int().nonnegative(),
    deletions: z.number().int().nonnegative(),
    changed_files: z.number().int().nonnegative(),
  }).passthrough(),
});

/**
 * Issue event payload schema
 */
export const issueEventPayloadSchema = baseWebhookPayloadSchema.extend({
  action: z.enum([
    'opened',
    'closed',
    'reopened',
    'edited',
    'assigned',
    'unassigned',
    'labeled',
    'unlabeled',
  ]),
  issue: z.object({
    id: z.number().int().positive(),
    node_id: z.string(),
    html_url: z.string().url(),
    number: z.number().int().positive(),
    title: z.string(),
    user: z.object({
      login: z.string(),
      id: z.number().int().positive(),
      avatar_url: z.string().url(),
    }),
    state: z.enum(['open', 'closed']),
    locked: z.boolean(),
    comments: z.number().int().nonnegative(),
    created_at: z.string(),
    updated_at: z.string(),
    closed_at: z.string().nullable(),
    body: z.string().nullable(),
  }).passthrough(),
});

/**
 * Pull request review event payload schema
 */
export const pullRequestReviewEventPayloadSchema = baseWebhookPayloadSchema.extend({
  action: z.enum(['submitted', 'edited', 'dismissed']),
  review: z.object({
    id: z.number().int().positive(),
    node_id: z.string(),
    user: z.object({
      login: z.string(),
      id: z.number().int().positive(),
      avatar_url: z.string().url(),
    }),
    body: z.string().nullable(),
    commit_id: z.string(),
    submitted_at: z.string(),
    state: z.enum(['commented', 'approved', 'changes_requested', 'dismissed']),
    html_url: z.string().url(),
    pull_request_url: z.string().url(),
  }).passthrough(),
  pull_request: z.object({
    id: z.number().int().positive(),
    number: z.number().int().positive(),
    html_url: z.string().url(),
    state: z.enum(['open', 'closed']),
    title: z.string(),
    user: z.object({
      login: z.string(),
      id: z.number().int().positive(),
    }),
    body: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    head: z.object({
      ref: z.string(),
      sha: z.string(),
    }),
    base: z.object({
      ref: z.string(),
      sha: z.string(),
    }),
  }).passthrough(),
});

/**
 * Validates webhook payload based on event type
 * Returns appropriate schema for the given event type
 */
export function getPayloadSchemaForEvent(eventType: string): z.ZodSchema {
  switch (eventType) {
    case 'push':
      return pushEventPayloadSchema;
    case 'pull_request':
      return pullRequestEventPayloadSchema;
    case 'issues':
      return issueEventPayloadSchema;
    case 'pull_request_review':
    case 'pull_request_review_comment':
      return pullRequestReviewEventPayloadSchema;
    case 'issue_comment':
    case 'create':
    case 'delete':
      // For these events, we only need base validation
      return baseWebhookPayloadSchema;
    default:
      return baseWebhookPayloadSchema;
  }
}

