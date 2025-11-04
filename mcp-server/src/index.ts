#!/usr/bin/env node

/**
 * DevMetrics MCP Server
 * 
 * Provides Model Context Protocol tools and resources for interacting with DevMetrics
 * Real-time Development Analytics Platform.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import { DevMetricsClient } from './client.js';
import { z } from 'zod';

// Load environment variables
config();

// Validation schemas
const DateRangeSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
});

const PullRequestFiltersSchema = z.object({
  repositoryId: z.string().optional(),
  status: z.enum(['open', 'closed', 'merged']).optional(),
  author: z.string().optional(),
});

/**
 * Initialize DevMetrics API Client
 */
const apiClient = new DevMetricsClient({
  apiUrl: process.env.DEVMETRICS_API_URL || 'http://localhost:3001/api',
  apiKey: process.env.DEVMETRICS_API_KEY,
  authToken: process.env.DEVMETRICS_AUTH_TOKEN,
});

/**
 * Create MCP Server instance
 */
const server = new Server(
  {
    name: process.env.MCP_SERVER_NAME || 'devmetrics',
    version: process.env.MCP_SERVER_VERSION || '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

/**
 * List available resources
 * Resources provide read-only access to DevMetrics data
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'devmetrics://repositories',
        name: 'All Repositories',
        description: 'List of all connected repositories',
        mimeType: 'application/json',
      },
      {
        uri: 'devmetrics://pull-requests',
        name: 'Pull Requests',
        description: 'List of all pull requests across repositories',
        mimeType: 'application/json',
      },
      {
        uri: 'devmetrics://notifications',
        name: 'Notifications',
        description: 'List of all notifications',
        mimeType: 'application/json',
      },
    ],
  };
});

/**
 * Read resource content
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri.toString();

  if (uri === 'devmetrics://repositories') {
    const repositories = await apiClient.listRepositories();
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(repositories, null, 2),
        },
      ],
    };
  }

  if (uri === 'devmetrics://pull-requests') {
    const pullRequests = await apiClient.listPullRequests();
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(pullRequests, null, 2),
        },
      ],
    };
  }

  if (uri === 'devmetrics://notifications') {
    const notifications = await apiClient.listNotifications();
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(notifications, null, 2),
        },
      ],
    };
  }

  if (uri.startsWith('devmetrics://repository/')) {
    const id = uri.replace('devmetrics://repository/', '');
    const repository = await apiClient.getRepository(id);
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(repository, null, 2),
        },
      ],
    };
  }

  if (uri.startsWith('devmetrics://pull-request/')) {
    const id = uri.replace('devmetrics://pull-request/', '');
    const pr = await apiClient.getPullRequest(id);
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(pr, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown resource URI: ${uri}`);
});

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_repositories',
        description: 'Get all connected repositories with their metrics and status',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_repository',
        description: 'Get detailed information about a specific repository',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Repository ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_repository_metrics',
        description: 'Get metrics for a repository within a date range',
        inputSchema: {
          type: 'object',
          properties: {
            repositoryId: {
              type: 'string',
              description: 'Repository ID',
            },
            start: {
              type: 'string',
              description: 'Start date (ISO 8601 format)',
            },
            end: {
              type: 'string',
              description: 'End date (ISO 8601 format)',
            },
          },
          required: ['repositoryId'],
        },
      },
      {
        name: 'get_pull_requests',
        description: 'Get pull requests with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            repositoryId: {
              type: 'string',
              description: 'Filter by repository ID',
            },
            status: {
              type: 'string',
              enum: ['open', 'closed', 'merged'],
              description: 'Filter by PR status',
            },
            author: {
              type: 'string',
              description: 'Filter by author username',
            },
          },
        },
      },
      {
        name: 'get_pull_request',
        description: 'Get detailed information about a specific pull request',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Pull request ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_pr_ai_insights',
        description: 'Get AI-powered insights for a pull request (risk score, suggestions, potential bugs)',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Pull request ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'trigger_pr_analysis',
        description: 'Trigger AI analysis for a pull request',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Pull request ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_team_velocity',
        description: 'Get team velocity metrics over recent sprints',
        inputSchema: {
          type: 'object',
          properties: {
            organizationId: {
              type: 'string',
              description: 'Organization ID',
            },
            sprintCount: {
              type: 'number',
              description: 'Number of recent sprints to analyze (default: 4)',
              default: 4,
            },
          },
          required: ['organizationId'],
        },
      },
      {
        name: 'get_team_metrics',
        description: 'Get comprehensive team metrics including velocity, PR cycle time, and deployment frequency',
        inputSchema: {
          type: 'object',
          properties: {
            organizationId: {
              type: 'string',
              description: 'Organization ID',
            },
            start: {
              type: 'string',
              description: 'Start date (ISO 8601 format)',
            },
            end: {
              type: 'string',
              description: 'End date (ISO 8601 format)',
            },
          },
          required: ['organizationId'],
        },
      },
      {
        name: 'get_developer_metrics',
        description: 'Get individual developer metrics and contributions',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User/Developer ID',
            },
            start: {
              type: 'string',
              description: 'Start date (ISO 8601 format)',
            },
            end: {
              type: 'string',
              description: 'End date (ISO 8601 format)',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'get_pr_cycle_time',
        description: 'Get average PR cycle time (time from open to merge)',
        inputSchema: {
          type: 'object',
          properties: {
            repositoryId: {
              type: 'string',
              description: 'Repository ID',
            },
            start: {
              type: 'string',
              description: 'Start date (ISO 8601 format)',
            },
            end: {
              type: 'string',
              description: 'End date (ISO 8601 format)',
            },
          },
          required: ['repositoryId'],
        },
      },
      {
        name: 'get_deployment_metrics',
        description: 'Get deployment frequency and related metrics',
        inputSchema: {
          type: 'object',
          properties: {
            repositoryId: {
              type: 'string',
              description: 'Repository ID',
            },
            start: {
              type: 'string',
              description: 'Start date (ISO 8601 format)',
            },
            end: {
              type: 'string',
              description: 'End date (ISO 8601 format)',
            },
          },
          required: ['repositoryId'],
        },
      },
      {
        name: 'get_build_success_rate',
        description: 'Get CI/CD build success rate',
        inputSchema: {
          type: 'object',
          properties: {
            repositoryId: {
              type: 'string',
              description: 'Repository ID',
            },
            start: {
              type: 'string',
              description: 'Start date (ISO 8601 format)',
            },
            end: {
              type: 'string',
              description: 'End date (ISO 8601 format)',
            },
          },
          required: ['repositoryId'],
        },
      },
      {
        name: 'get_repository_analytics',
        description: 'Get comprehensive analytics for a repository',
        inputSchema: {
          type: 'object',
          properties: {
            repositoryId: {
              type: 'string',
              description: 'Repository ID',
            },
            start: {
              type: 'string',
              description: 'Start date (ISO 8601 format)',
            },
            end: {
              type: 'string',
              description: 'End date (ISO 8601 format)',
            },
          },
          required: ['repositoryId'],
        },
      },
      {
        name: 'get_trends',
        description: 'Get historical trends for a specific metric',
        inputSchema: {
          type: 'object',
          properties: {
            organizationId: {
              type: 'string',
              description: 'Organization ID',
            },
            metric: {
              type: 'string',
              description: 'Metric name (e.g., velocity, cycle-time, deployment-frequency)',
            },
            start: {
              type: 'string',
              description: 'Start date (ISO 8601 format)',
            },
            end: {
              type: 'string',
              description: 'End date (ISO 8601 format)',
            },
          },
          required: ['organizationId', 'metric'],
        },
      },
      {
        name: 'health_check',
        description: 'Check the health status of the DevMetrics API',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

/**
 * Handle tool execution
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_repositories': {
        const repositories = await apiClient.listRepositories();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(repositories, null, 2),
            },
          ],
        };
      }

      case 'get_repository': {
        const { id } = args as { id: string };
        const repository = await apiClient.getRepository(id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(repository, null, 2),
            },
          ],
        };
      }

      case 'get_repository_metrics': {
        const { repositoryId, start, end } = args as {
          repositoryId: string;
          start?: string;
          end?: string;
        };
        const range = start && end ? { start, end } : undefined;
        const metrics = await apiClient.getRepositoryMetrics(repositoryId, range);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(metrics, null, 2),
            },
          ],
        };
      }

      case 'get_pull_requests': {
        const filters = PullRequestFiltersSchema.parse(args);
        const pullRequests = await apiClient.listPullRequests(filters);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(pullRequests, null, 2),
            },
          ],
        };
      }

      case 'get_pull_request': {
        const { id } = args as { id: string };
        const pr = await apiClient.getPullRequest(id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(pr, null, 2),
            },
          ],
        };
      }

      case 'get_pr_ai_insights': {
        const { id } = args as { id: string };
        const insights = await apiClient.getPullRequestAIInsights(id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(insights, null, 2),
            },
          ],
        };
      }

      case 'trigger_pr_analysis': {
        const { id } = args as { id: string };
        const result = await apiClient.triggerPRAnalysis(id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_team_velocity': {
        const { organizationId, sprintCount = 4 } = args as {
          organizationId: string;
          sprintCount?: number;
        };
        const velocity = await apiClient.getTeamVelocity(organizationId, sprintCount);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(velocity, null, 2),
            },
          ],
        };
      }

      case 'get_team_metrics': {
        const { organizationId, start, end } = args as {
          organizationId: string;
          start?: string;
          end?: string;
        };
        const range = start && end ? { start, end } : undefined;
        const metrics = await apiClient.getTeamMetrics(organizationId, range);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(metrics, null, 2),
            },
          ],
        };
      }

      case 'get_developer_metrics': {
        const { userId, start, end } = args as {
          userId: string;
          start?: string;
          end?: string;
        };
        const range = start && end ? { start, end } : undefined;
        const metrics = await apiClient.getDeveloperMetrics(userId, range);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(metrics, null, 2),
            },
          ],
        };
      }

      case 'get_pr_cycle_time': {
        const { repositoryId, start, end } = args as {
          repositoryId: string;
          start?: string;
          end?: string;
        };
        const range = start && end ? { start, end } : undefined;
        const cycleTime = await apiClient.getPRCycleTime(repositoryId, range);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(cycleTime, null, 2),
            },
          ],
        };
      }

      case 'get_deployment_metrics': {
        const { repositoryId, start, end } = args as {
          repositoryId: string;
          start?: string;
          end?: string;
        };
        const range = start && end ? { start, end } : undefined;
        const metrics = await apiClient.getDeploymentMetrics(repositoryId, range);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(metrics, null, 2),
            },
          ],
        };
      }

      case 'get_build_success_rate': {
        const { repositoryId, start, end } = args as {
          repositoryId: string;
          start?: string;
          end?: string;
        };
        const range = start && end ? { start, end } : undefined;
        const successRate = await apiClient.getBuildSuccessRate(repositoryId, range);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(successRate, null, 2),
            },
          ],
        };
      }

      case 'get_repository_analytics': {
        const { repositoryId, start, end } = args as {
          repositoryId: string;
          start?: string;
          end?: string;
        };
        const range = start && end ? { start, end } : undefined;
        const analytics = await apiClient.getRepositoryAnalytics(repositoryId, range);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(analytics, null, 2),
            },
          ],
        };
      }

      case 'get_trends': {
        const { organizationId, metric, start, end } = args as {
          organizationId: string;
          metric: string;
          start?: string;
          end?: string;
        };
        const range = start && end ? { start, end } : undefined;
        const trends = await apiClient.getTrends(organizationId, metric, range);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(trends, null, 2),
            },
          ],
        };
      }

      case 'health_check': {
        const health = await apiClient.healthCheck();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(health, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [
        {
          type: 'text',
          text: `Error executing tool ${name}: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('DevMetrics MCP Server running on stdio');
  console.error(`API URL: ${process.env.DEVMETRICS_API_URL || 'http://localhost:3001/api'}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

