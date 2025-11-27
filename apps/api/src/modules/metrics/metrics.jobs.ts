/**
 * DevMetrics - Metrics Aggregation Jobs
 * Scheduled jobs to aggregate metrics daily and detect anomalies
 */

import Bull from 'bull';
import { metricsQueue, MetricsJobData } from './metrics.queue';
import { MetricsService } from './metrics.service';
import { AnomalyDetectionService } from './metrics.anomaly';
import { prisma } from '../../database/prisma.client';
import { logger } from '../../utils/logger';

/**
 * Job execution statistics
 */
interface JobExecutionStats {
  jobId: string;
  jobType: 'daily_aggregation' | 'manual_aggregation';
  organizationId?: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  success: boolean;
  organizationsProcessed: number;
  developersProcessed: number;
  repositoriesProcessed: number;
  anomaliesDetected: number;
  errors?: string[];
}

/**
 * Metrics Jobs Manager
 * Handles scheduled and manual metrics aggregation
 */
export class MetricsJobsManager {
  private metricsService: MetricsService;
  private anomalyService: AnomalyDetectionService;
  private cronJob: Bull.Job | null = null;

  constructor() {
    this.metricsService = new MetricsService(prisma);
    this.anomalyService = new AnomalyDetectionService(prisma);
  }

  /**
   * Initialize and start the daily cron job
   * Runs at midnight UTC every day
   */
  async startDailyCronJob(): Promise<void> {
    try {
      // Remove any existing repeatable job first
      const repeatableJobs = await metricsQueue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        if (job.name === 'daily-metrics-aggregation') {
          await metricsQueue.removeRepeatableByKey(job.key);
          logger.info('Removed existing daily aggregation job', { key: job.key });
        }
      }

      // Schedule new job to run daily at midnight UTC
      // Cron: "0 0 * * *" = At 00:00 (midnight) every day
      const job = await metricsQueue.add(
        'daily-metrics-aggregation',
        {
          organizationId: 'ALL', // Special marker to process all orgs
          calculationType: 'batch',
          source: 'scheduler',
          date: new Date(), // Will be adjusted to previous day in processor
        },
        {
          repeat: {
            cron: '0 0 * * *', // Midnight UTC
            tz: 'UTC',
          },
          priority: 5, // Medium priority
          jobId: 'daily-metrics-aggregation',
        }
      );

      this.cronJob = job;

      logger.info('Daily metrics aggregation cron job scheduled', {
        jobId: job.id,
        cron: '0 0 * * * (midnight UTC)',
        repeatConfig: job.opts.repeat,
      });
    } catch (error) {
      logger.error('Failed to start daily cron job', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Stop the daily cron job
   */
  async stopDailyCronJob(): Promise<void> {
    try {
      const repeatableJobs = await metricsQueue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        if (job.name === 'daily-metrics-aggregation') {
          await metricsQueue.removeRepeatableByKey(job.key);
          logger.info('Stopped daily aggregation job', { key: job.key });
        }
      }
    } catch (error) {
      logger.error('Failed to stop daily cron job', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Process daily aggregation job
   * This is called by the Bull worker when the cron job triggers
   */
  async processDailyAggregation(job: Bull.Job<MetricsJobData>): Promise<JobExecutionStats> {
    const startTime = new Date();
    const stats: JobExecutionStats = {
      jobId: String(job.id),
      jobType: 'daily_aggregation',
      startTime,
      endTime: startTime, // Will be updated
      duration: 0,
      success: false,
      organizationsProcessed: 0,
      developersProcessed: 0,
      repositoriesProcessed: 0,
      anomaliesDetected: 0,
      errors: [],
    };

    try {
      logger.info('Starting daily metrics aggregation', {
        jobId: job.id,
        triggeredAt: startTime.toISOString(),
      });

      // Calculate for previous day (since we run at midnight)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      // Get all active organizations
      const organizations = await prisma.organization.findMany({
        select: {
          id: true,
          name: true,
        },
      });

      logger.info('Processing metrics for organizations', {
        count: organizations.length,
        date: yesterday.toISOString(),
      });

      // Process each organization
      for (const org of organizations) {
        try {
          const orgStats = await this.aggregateOrganizationMetrics(org.id, yesterday);
          
          stats.organizationsProcessed++;
          stats.developersProcessed += orgStats.developersProcessed;
          stats.repositoriesProcessed += orgStats.repositoriesProcessed;
          stats.anomaliesDetected += orgStats.anomaliesDetected;

          logger.debug('Organization metrics aggregated', {
            organizationId: org.id,
            organizationName: org.name,
            ...orgStats,
          });
        } catch (error) {
          const errorMsg = `Failed to process org ${org.id}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`;
          stats.errors?.push(errorMsg);
          
          logger.error('Error processing organization metrics', {
            organizationId: org.id,
            organizationName: org.name,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          });
          // Continue with next organization
        }
      }

      stats.success = stats.errors?.length === 0 || stats.organizationsProcessed > 0;
      stats.endTime = new Date();
      stats.duration = stats.endTime.getTime() - stats.startTime.getTime();

      logger.info('Daily metrics aggregation completed', {
        ...stats,
        durationMs: stats.duration,
        durationMinutes: (stats.duration / 1000 / 60).toFixed(2),
      });

      return stats;
    } catch (error) {
      stats.success = false;
      stats.endTime = new Date();
      stats.duration = stats.endTime.getTime() - stats.startTime.getTime();
      
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      stats.errors?.push(errorMsg);

      logger.error('Daily metrics aggregation failed', {
        ...stats,
        error: errorMsg,
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  }

  /**
   * Aggregate metrics for a single organization
   */
  private async aggregateOrganizationMetrics(
    organizationId: string,
    date: Date
  ): Promise<{
    developersProcessed: number;
    repositoriesProcessed: number;
    anomaliesDetected: number;
  }> {
    const result = {
      developersProcessed: 0,
      repositoriesProcessed: 0,
      anomaliesDetected: 0,
    };

    // Get all users in this organization
    const users = await prisma.userOrganization.findMany({
      where: { organizationId },
      select: {
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Calculate developer metrics
    for (const userOrg of users) {
      try {
        const devMetrics = await this.metricsService.calculateDeveloperMetrics(
          userOrg.userId,
          organizationId,
          date
        );
        await this.metricsService.storeDeveloperMetrics(devMetrics);
        result.developersProcessed++;
      } catch (error) {
        logger.error('Failed to calculate developer metrics', {
          userId: userOrg.userId,
          organizationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Continue with next developer
      }
    }

    // Get all repositories in this organization
    const repositories = await prisma.repository.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
      },
    });

    // Calculate repository metrics
    for (const repo of repositories) {
      try {
        const repoMetrics = await this.metricsService.calculateRepositoryMetrics(repo.id, date);
        await this.metricsService.storeRepositoryMetrics(repoMetrics);
        result.repositoriesProcessed++;
      } catch (error) {
        logger.error('Failed to calculate repository metrics', {
          repositoryId: repo.id,
          organizationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Continue with next repository
      }
    }

    // Calculate team metrics
    try {
      const teamMetrics = await this.metricsService.calculateTeamMetrics(organizationId, date);
      await this.metricsService.storeTeamMetrics(teamMetrics);
    } catch (error) {
      logger.error('Failed to calculate team metrics', {
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Detect and log anomalies
    try {
      const anomalies = await this.anomalyService.detectAnomalies(organizationId, date);
      await this.anomalyService.logAnomalies(anomalies);
      result.anomaliesDetected = anomalies.length;
    } catch (error) {
      logger.error('Failed to detect anomalies', {
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return result;
  }

  /**
   * Manually trigger metrics aggregation for a specific organization
   * @param organizationId - Organization to process
   * @param date - Date to calculate metrics for (defaults to yesterday)
   */
  async triggerManualAggregation(
    organizationId: string,
    date?: Date
  ): Promise<JobExecutionStats> {
    const startTime = new Date();
    const targetDate = date || (() => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      return yesterday;
    })();

    const stats: JobExecutionStats = {
      jobId: `manual-${Date.now()}`,
      jobType: 'manual_aggregation',
      organizationId,
      startTime,
      endTime: startTime,
      duration: 0,
      success: false,
      organizationsProcessed: 0,
      developersProcessed: 0,
      repositoriesProcessed: 0,
      anomaliesDetected: 0,
      errors: [],
    };

    try {
      logger.info('Starting manual metrics aggregation', {
        organizationId,
        date: targetDate.toISOString(),
        triggeredAt: startTime.toISOString(),
      });

      // Verify organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true },
      });

      if (!organization) {
        throw new Error(`Organization not found: ${organizationId}`);
      }

      // Aggregate metrics
      const orgStats = await this.aggregateOrganizationMetrics(organizationId, targetDate);
      
      stats.organizationsProcessed = 1;
      stats.developersProcessed = orgStats.developersProcessed;
      stats.repositoriesProcessed = orgStats.repositoriesProcessed;
      stats.anomaliesDetected = orgStats.anomaliesDetected;
      stats.success = true;

      stats.endTime = new Date();
      stats.duration = stats.endTime.getTime() - stats.startTime.getTime();

      logger.info('Manual metrics aggregation completed', {
        ...stats,
        durationMs: stats.duration,
      });

      return stats;
    } catch (error) {
      stats.success = false;
      stats.endTime = new Date();
      stats.duration = stats.endTime.getTime() - stats.startTime.getTime();
      
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      stats.errors?.push(errorMsg);

      logger.error('Manual metrics aggregation failed', {
        ...stats,
        error: errorMsg,
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  }

  /**
   * Manually trigger aggregation for all organizations
   */
  async triggerManualAggregationForAll(date?: Date): Promise<JobExecutionStats> {
    const startTime = new Date();
    const targetDate = date || (() => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      return yesterday;
    })();

    const stats: JobExecutionStats = {
      jobId: `manual-all-${Date.now()}`,
      jobType: 'manual_aggregation',
      startTime,
      endTime: startTime,
      duration: 0,
      success: false,
      organizationsProcessed: 0,
      developersProcessed: 0,
      repositoriesProcessed: 0,
      anomaliesDetected: 0,
      errors: [],
    };

    try {
      logger.info('Starting manual metrics aggregation for all organizations', {
        date: targetDate.toISOString(),
        triggeredAt: startTime.toISOString(),
      });

      const organizations = await prisma.organization.findMany({
        select: { id: true, name: true },
      });

      logger.info('Processing metrics for organizations', {
        count: organizations.length,
        date: targetDate.toISOString(),
      });

      for (const org of organizations) {
        try {
          const orgStats = await this.aggregateOrganizationMetrics(org.id, targetDate);
          
          stats.organizationsProcessed++;
          stats.developersProcessed += orgStats.developersProcessed;
          stats.repositoriesProcessed += orgStats.repositoriesProcessed;
          stats.anomaliesDetected += orgStats.anomaliesDetected;
        } catch (error) {
          const errorMsg = `Failed to process org ${org.id}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`;
          stats.errors?.push(errorMsg);
          
          logger.error('Error processing organization metrics', {
            organizationId: org.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          // Continue with next organization
        }
      }

      stats.success = stats.errors?.length === 0 || stats.organizationsProcessed > 0;
      stats.endTime = new Date();
      stats.duration = stats.endTime.getTime() - stats.startTime.getTime();

      logger.info('Manual metrics aggregation for all organizations completed', {
        ...stats,
        durationMs: stats.duration,
        durationMinutes: (stats.duration / 1000 / 60).toFixed(2),
      });

      return stats;
    } catch (error) {
      stats.success = false;
      stats.endTime = new Date();
      stats.duration = stats.endTime.getTime() - stats.startTime.getTime();
      
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      stats.errors?.push(errorMsg);

      logger.error('Manual metrics aggregation for all failed', {
        ...stats,
        error: errorMsg,
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  }

  /**
   * Get status of the daily cron job
   */
  async getCronJobStatus(): Promise<{
    isScheduled: boolean;
    nextRun?: Date;
    lastRun?: Date;
    jobCount: number;
  }> {
    try {
      const repeatableJobs = await metricsQueue.getRepeatableJobs();
      const dailyJob = repeatableJobs.find(job => job.name === 'daily-metrics-aggregation');

      if (dailyJob) {
        return {
          isScheduled: true,
          nextRun: dailyJob.next ? new Date(dailyJob.next) : undefined,
          jobCount: repeatableJobs.length,
        };
      }

      return {
        isScheduled: false,
        jobCount: repeatableJobs.length,
      };
    } catch (error) {
      logger.error('Failed to get cron job status', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

// Create singleton instance
export const metricsJobsManager = new MetricsJobsManager();

/**
 * Initialize metrics jobs on server startup
 */
export async function initializeMetricsJobs(): Promise<void> {
  try {
    logger.info('Initializing metrics jobs...');
    await metricsJobsManager.startDailyCronJob();
    logger.info('Metrics jobs initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize metrics jobs', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Shutdown metrics jobs gracefully
 */
export async function shutdownMetricsJobs(): Promise<void> {
  try {
    logger.info('Shutting down metrics jobs...');
    await metricsJobsManager.stopDailyCronJob();
    logger.info('Metrics jobs shut down successfully');
  } catch (error) {
    logger.error('Failed to shutdown metrics jobs', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
