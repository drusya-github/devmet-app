/**
 * DevMetrics API Client
 * Handles all HTTP requests to the DevMetrics backend API
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  DevMetricsConfig,
  Repository,
  PullRequest,
  TeamMetrics,
  DeveloperMetrics,
  VelocityMetric,
  Notification,
  DateRange,
} from './types.js';

export class DevMetricsClient {
  private client: AxiosInstance;

  constructor(config: DevMetricsConfig) {
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'X-API-Key': config.apiKey }),
        ...(config.authToken && { Authorization: `Bearer ${config.authToken}` }),
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          throw new Error(
            `API Error (${error.response.status}): ${
              (error.response.data as any)?.error || error.message
            }`
          );
        }
        throw new Error(`Network Error: ${error.message}`);
      }
    );
  }

  // Repositories
  async listRepositories(): Promise<Repository[]> {
    const { data } = await this.client.get<Repository[]>('/repositories');
    return data;
  }

  async getRepository(id: string): Promise<Repository> {
    const { data } = await this.client.get<Repository>(`/repositories/${id}`);
    return data;
  }

  async getRepositoryMetrics(id: string, range?: DateRange) {
    const { data } = await this.client.get(`/repositories/${id}/metrics`, {
      params: range,
    });
    return data;
  }

  // Pull Requests
  async listPullRequests(filters?: {
    repositoryId?: string;
    status?: string;
    author?: string;
  }): Promise<PullRequest[]> {
    const { data } = await this.client.get<PullRequest[]>('/pull-requests', {
      params: filters,
    });
    return data;
  }

  async getPullRequest(id: string): Promise<PullRequest> {
    const { data } = await this.client.get<PullRequest>(`/pull-requests/${id}`);
    return data;
  }

  async getPullRequestAIInsights(id: string) {
    const { data } = await this.client.get(`/pull-requests/${id}/ai-insights`);
    return data;
  }

  async triggerPRAnalysis(id: string) {
    const { data } = await this.client.post(`/pull-requests/${id}/reanalyze`);
    return data;
  }

  // Metrics
  async getTeamVelocity(
    organizationId: string,
    sprintCount: number = 4
  ): Promise<VelocityMetric> {
    const { data } = await this.client.get<VelocityMetric>('/metrics/velocity', {
      params: { organizationId, sprintCount },
    });
    return data;
  }

  async getTeamMetrics(
    organizationId: string,
    range?: DateRange
  ): Promise<TeamMetrics[]> {
    const { data } = await this.client.get<TeamMetrics[]>('/analytics/team', {
      params: { organizationId, ...range },
    });
    return data;
  }

  async getDeveloperMetrics(
    userId: string,
    range?: DateRange
  ): Promise<DeveloperMetrics[]> {
    const { data } = await this.client.get<DeveloperMetrics[]>(
      `/analytics/individual/${userId}`,
      { params: range }
    );
    return data;
  }

  async getPRCycleTime(repositoryId: string, range?: DateRange) {
    const { data } = await this.client.get('/metrics/cycle-time', {
      params: { repositoryId, ...range },
    });
    return data;
  }

  async getDeploymentMetrics(repositoryId: string, range?: DateRange) {
    const { data } = await this.client.get('/metrics/deployment', {
      params: { repositoryId, ...range },
    });
    return data;
  }

  async getBuildSuccessRate(repositoryId: string, range?: DateRange) {
    const { data } = await this.client.get('/metrics/build-success', {
      params: { repositoryId, ...range },
    });
    return data;
  }

  // Notifications
  async listNotifications(): Promise<Notification[]> {
    const { data } = await this.client.get<Notification[]>('/notifications');
    return data;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await this.client.patch(`/notifications/${id}/read`);
  }

  // Analytics
  async getRepositoryAnalytics(repositoryId: string, range?: DateRange) {
    const { data } = await this.client.get(`/analytics/repository/${repositoryId}`, {
      params: range,
    });
    return data;
  }

  async getTrends(organizationId: string, metric: string, range?: DateRange) {
    const { data } = await this.client.get('/analytics/trends', {
      params: { organizationId, metric, ...range },
    });
    return data;
  }

  // Health check
  async healthCheck(): Promise<{ status: string; version: string }> {
    const { data } = await this.client.get('/health');
    return data;
  }
}

