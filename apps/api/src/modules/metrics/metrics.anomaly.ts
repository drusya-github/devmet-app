/**
 * DevMetrics - Metrics Anomaly Detection Service
 * Detects anomalies in developer, team, and repository metrics
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

/**
 * Anomaly types that can be detected
 */
export enum AnomalyType {
  COMMIT_DROP = 'commit_drop',
  ZERO_ACTIVITY = 'zero_activity',
  PR_CYCLE_TIME_SPIKE = 'pr_cycle_time_spike',
  ISSUE_BACKLOG_SPIKE = 'issue_backlog_spike',
  LOW_PR_MERGE_RATE = 'low_pr_merge_rate',
}

/**
 * Severity levels for anomalies
 */
export enum AnomalySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Anomaly detection result
 */
export interface Anomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  entityType: 'developer' | 'team' | 'repository';
  entityId: string;
  entityName?: string;
  organizationId: string;
  message: string;
  currentValue: number;
  expectedValue: number;
  threshold: number;
  detectedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Anomaly detection thresholds (can be configured)
 */
export interface AnomalyThresholds {
  commitDropPercentage: number;         // Default: 50% (detect if commits drop by 50%+)
  prCycleTimeMultiplier: number;        // Default: 2 (detect if cycle time is 2x average)
  zeroActivityDays: number;             // Default: 1 (detect if no activity for 1+ day)
  issueBacklogMultiplier: number;       // Default: 1.5 (detect if backlog is 1.5x average)
  lowPrMergeRatePercentage: number;     // Default: 30% (detect if merge rate < 30%)
}

/**
 * Default thresholds
 */
const DEFAULT_THRESHOLDS: AnomalyThresholds = {
  commitDropPercentage: 50,
  prCycleTimeMultiplier: 2,
  zeroActivityDays: 1,
  issueBacklogMultiplier: 1.5,
  lowPrMergeRatePercentage: 30,
};

/**
 * Anomaly Detection Service
 * Analyzes metrics to detect unusual patterns
 */
export class AnomalyDetectionService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly thresholds: AnomalyThresholds = DEFAULT_THRESHOLDS
  ) {}

  /**
   * Detect all anomalies for an organization
   */
  async detectAnomalies(organizationId: string, date: Date): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    try {
      // Detect developer anomalies
      const developerAnomalies = await this.detectDeveloperAnomalies(organizationId, date);
      anomalies.push(...developerAnomalies);

      // Detect team anomalies
      const teamAnomalies = await this.detectTeamAnomalies(organizationId, date);
      anomalies.push(...teamAnomalies);

      // Detect repository anomalies
      const repositoryAnomalies = await this.detectRepositoryAnomalies(organizationId, date);
      anomalies.push(...repositoryAnomalies);

      logger.info('Anomaly detection completed', {
        organizationId,
        date: date.toISOString(),
        totalAnomalies: anomalies.length,
        bySeverity: {
          critical: anomalies.filter(a => a.severity === AnomalySeverity.CRITICAL).length,
          high: anomalies.filter(a => a.severity === AnomalySeverity.HIGH).length,
          medium: anomalies.filter(a => a.severity === AnomalySeverity.MEDIUM).length,
          low: anomalies.filter(a => a.severity === AnomalySeverity.LOW).length,
        },
      });
    } catch (error) {
      logger.error('Error during anomaly detection', {
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return anomalies;
  }

  /**
   * Detect developer-level anomalies
   */
  private async detectDeveloperAnomalies(
    organizationId: string,
    date: Date
  ): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    try {
      // Get current day metrics
      const currentMetrics = await this.prisma.developerMetric.findMany({
        where: {
          organizationId,
          date,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Get previous 7 days average for comparison
      const sevenDaysAgo = new Date(date);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      for (const current of currentMetrics) {
        const historicalMetrics = await this.prisma.developerMetric.findMany({
          where: {
            userId: current.userId,
            organizationId,
            date: {
              gte: sevenDaysAgo,
              lt: date,
            },
          },
        });

        if (historicalMetrics.length === 0) {
          // New developer, skip anomaly detection
          continue;
        }

        // Calculate averages
        const avgCommits =
          historicalMetrics.reduce((sum, m) => sum + m.commits, 0) / historicalMetrics.length;

        // Check for commit drop
        if (avgCommits > 0) {
          const dropPercentage = ((avgCommits - current.commits) / avgCommits) * 100;
          
          if (dropPercentage >= this.thresholds.commitDropPercentage) {
            anomalies.push({
              type: AnomalyType.COMMIT_DROP,
              severity: this.getSeverityForCommitDrop(dropPercentage),
              entityType: 'developer',
              entityId: current.userId,
              entityName: current.user?.name || current.user?.email || 'Unknown',
              organizationId,
              message: `Commit activity dropped by ${dropPercentage.toFixed(1)}% (${current.commits} vs avg ${avgCommits.toFixed(1)})`,
              currentValue: current.commits,
              expectedValue: avgCommits,
              threshold: this.thresholds.commitDropPercentage,
              detectedAt: new Date(),
              metadata: {
                dropPercentage: dropPercentage.toFixed(1),
                historicalAverage: avgCommits.toFixed(1),
              },
            });
          }
        }

        // Check for zero activity (previously active developer)
        if (avgCommits > 0 && current.commits === 0 && current.prsOpened === 0) {
          anomalies.push({
            type: AnomalyType.ZERO_ACTIVITY,
            severity: AnomalySeverity.MEDIUM,
            entityType: 'developer',
            entityId: current.userId,
            entityName: current.user?.name || current.user?.email || 'Unknown',
            organizationId,
            message: `No activity detected (previously averaged ${avgCommits.toFixed(1)} commits/day)`,
            currentValue: 0,
            expectedValue: avgCommits,
            threshold: 0,
            detectedAt: new Date(),
          });
        }
      }
    } catch (error) {
      logger.error('Error detecting developer anomalies', {
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return anomalies;
  }

  /**
   * Detect team-level anomalies
   */
  private async detectTeamAnomalies(organizationId: string, date: Date): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    try {
      // Get current team metrics
      const currentMetric = await this.prisma.teamMetric.findUnique({
        where: {
          organizationId_date: {
            organizationId,
            date,
          },
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!currentMetric) {
        return anomalies;
      }

      // Get previous 30 days for comparison
      const thirtyDaysAgo = new Date(date);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const historicalMetrics = await this.prisma.teamMetric.findMany({
        where: {
          organizationId,
          date: {
            gte: thirtyDaysAgo,
            lt: date,
          },
        },
      });

      if (historicalMetrics.length === 0) {
        return anomalies;
      }

      // Calculate averages
      const avgPrCycleTime =
        historicalMetrics.reduce((sum, m) => sum + (m.avgPrCycleTime || 0), 0) /
        historicalMetrics.length;
      
      const avgIssueBacklog =
        historicalMetrics.reduce((sum, m) => sum + m.issueBacklog, 0) /
        historicalMetrics.length;

      // Check for PR cycle time spike
      if (currentMetric.avgPrCycleTime && avgPrCycleTime > 0) {
        const multiplier = currentMetric.avgPrCycleTime / avgPrCycleTime;
        
        if (multiplier >= this.thresholds.prCycleTimeMultiplier) {
          anomalies.push({
            type: AnomalyType.PR_CYCLE_TIME_SPIKE,
            severity: this.getSeverityForCycleTimeSpike(multiplier),
            entityType: 'team',
            entityId: organizationId,
            entityName: currentMetric.organization?.name || 'Unknown',
            organizationId,
            message: `PR cycle time increased ${multiplier.toFixed(1)}x (${currentMetric.avgPrCycleTime.toFixed(1)}h vs avg ${avgPrCycleTime.toFixed(1)}h)`,
            currentValue: currentMetric.avgPrCycleTime,
            expectedValue: avgPrCycleTime,
            threshold: this.thresholds.prCycleTimeMultiplier,
            detectedAt: new Date(),
            metadata: {
              multiplier: multiplier.toFixed(1),
              historicalAverage: avgPrCycleTime.toFixed(1),
            },
          });
        }
      }

      // Check for issue backlog spike
      if (avgIssueBacklog > 0) {
        const multiplier = currentMetric.issueBacklog / avgIssueBacklog;
        
        if (multiplier >= this.thresholds.issueBacklogMultiplier) {
          anomalies.push({
            type: AnomalyType.ISSUE_BACKLOG_SPIKE,
            severity: this.getSeverityForBacklogSpike(multiplier),
            entityType: 'team',
            entityId: organizationId,
            entityName: currentMetric.organization?.name || 'Unknown',
            organizationId,
            message: `Issue backlog increased ${multiplier.toFixed(1)}x (${currentMetric.issueBacklog} vs avg ${avgIssueBacklog.toFixed(0)})`,
            currentValue: currentMetric.issueBacklog,
            expectedValue: avgIssueBacklog,
            threshold: this.thresholds.issueBacklogMultiplier,
            detectedAt: new Date(),
            metadata: {
              multiplier: multiplier.toFixed(1),
              historicalAverage: avgIssueBacklog.toFixed(0),
            },
          });
        }
      }

      // Check for low PR merge rate
      if (currentMetric.totalPrsOpened > 0) {
        const mergeRate = (currentMetric.velocity / currentMetric.totalPrsOpened) * 100;
        
        if (mergeRate < this.thresholds.lowPrMergeRatePercentage) {
          anomalies.push({
            type: AnomalyType.LOW_PR_MERGE_RATE,
            severity: this.getSeverityForLowMergeRate(mergeRate),
            entityType: 'team',
            entityId: organizationId,
            entityName: currentMetric.organization?.name || 'Unknown',
            organizationId,
            message: `Low PR merge rate: ${mergeRate.toFixed(1)}% (${currentMetric.velocity}/${currentMetric.totalPrsOpened})`,
            currentValue: mergeRate,
            expectedValue: this.thresholds.lowPrMergeRatePercentage,
            threshold: this.thresholds.lowPrMergeRatePercentage,
            detectedAt: new Date(),
            metadata: {
              prsMerged: currentMetric.velocity,
              prsOpened: currentMetric.totalPrsOpened,
            },
          });
        }
      }
    } catch (error) {
      logger.error('Error detecting team anomalies', {
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return anomalies;
  }

  /**
   * Detect repository-level anomalies
   */
  private async detectRepositoryAnomalies(
    organizationId: string,
    date: Date
  ): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    try {
      // Get repositories for this organization
      const repositories = await this.prisma.repository.findMany({
        where: { organizationId },
        select: { id: true, name: true },
      });

      for (const repo of repositories) {
        // Get current repository stats
        const currentStats = await this.prisma.repositoryStats.findUnique({
          where: {
            repoId_date: {
              repoId: repo.id,
              date,
            },
          },
        });

        if (!currentStats) {
          continue;
        }

        // Get previous 7 days for comparison
        const sevenDaysAgo = new Date(date);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const historicalStats = await this.prisma.repositoryStats.findMany({
          where: {
            repoId: repo.id,
            date: {
              gte: sevenDaysAgo,
              lt: date,
            },
          },
        });

        if (historicalStats.length === 0) {
          continue;
        }

        // Calculate average commits
        const avgCommits =
          historicalStats.reduce((sum, s) => sum + s.commits, 0) / historicalStats.length;

        // Check for commit drop in repository
        if (avgCommits > 0) {
          const dropPercentage = ((avgCommits - currentStats.commits) / avgCommits) * 100;
          
          if (dropPercentage >= this.thresholds.commitDropPercentage) {
            anomalies.push({
              type: AnomalyType.COMMIT_DROP,
              severity: this.getSeverityForCommitDrop(dropPercentage),
              entityType: 'repository',
              entityId: repo.id,
              entityName: repo.name,
              organizationId,
              message: `Repository activity dropped by ${dropPercentage.toFixed(1)}% (${currentStats.commits} vs avg ${avgCommits.toFixed(1)})`,
              currentValue: currentStats.commits,
              expectedValue: avgCommits,
              threshold: this.thresholds.commitDropPercentage,
              detectedAt: new Date(),
              metadata: {
                dropPercentage: dropPercentage.toFixed(1),
                historicalAverage: avgCommits.toFixed(1),
              },
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error detecting repository anomalies', {
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return anomalies;
  }

  /**
   * Get severity for commit drop based on percentage
   */
  private getSeverityForCommitDrop(dropPercentage: number): AnomalySeverity {
    if (dropPercentage >= 90) return AnomalySeverity.CRITICAL;
    if (dropPercentage >= 75) return AnomalySeverity.HIGH;
    if (dropPercentage >= 60) return AnomalySeverity.MEDIUM;
    return AnomalySeverity.LOW;
  }

  /**
   * Get severity for cycle time spike based on multiplier
   */
  private getSeverityForCycleTimeSpike(multiplier: number): AnomalySeverity {
    if (multiplier >= 5) return AnomalySeverity.CRITICAL;
    if (multiplier >= 3) return AnomalySeverity.HIGH;
    if (multiplier >= 2) return AnomalySeverity.MEDIUM;
    return AnomalySeverity.LOW;
  }

  /**
   * Get severity for backlog spike based on multiplier
   */
  private getSeverityForBacklogSpike(multiplier: number): AnomalySeverity {
    if (multiplier >= 3) return AnomalySeverity.CRITICAL;
    if (multiplier >= 2) return AnomalySeverity.HIGH;
    if (multiplier >= 1.5) return AnomalySeverity.MEDIUM;
    return AnomalySeverity.LOW;
  }

  /**
   * Get severity for low merge rate
   */
  private getSeverityForLowMergeRate(mergeRate: number): AnomalySeverity {
    if (mergeRate < 10) return AnomalySeverity.CRITICAL;
    if (mergeRate < 20) return AnomalySeverity.HIGH;
    if (mergeRate < 30) return AnomalySeverity.MEDIUM;
    return AnomalySeverity.LOW;
  }

  /**
   * Log anomalies (placeholder for future notification integration)
   */
  async logAnomalies(anomalies: Anomaly[]): Promise<void> {
    if (anomalies.length === 0) {
      return;
    }

    // Group by severity
    const criticalAnomalies = anomalies.filter(a => a.severity === AnomalySeverity.CRITICAL);
    const highAnomalies = anomalies.filter(a => a.severity === AnomalySeverity.HIGH);
    const mediumAnomalies = anomalies.filter(a => a.severity === AnomalySeverity.MEDIUM);
    const lowAnomalies = anomalies.filter(a => a.severity === AnomalySeverity.LOW);

    // Log critical and high severity anomalies as warnings
    if (criticalAnomalies.length > 0) {
      logger.warn('CRITICAL anomalies detected', {
        count: criticalAnomalies.length,
        anomalies: criticalAnomalies.map(a => ({
          type: a.type,
          entity: `${a.entityType}:${a.entityName || a.entityId}`,
          message: a.message,
        })),
      });
    }

    if (highAnomalies.length > 0) {
      logger.warn('HIGH severity anomalies detected', {
        count: highAnomalies.length,
        anomalies: highAnomalies.map(a => ({
          type: a.type,
          entity: `${a.entityType}:${a.entityName || a.entityId}`,
          message: a.message,
        })),
      });
    }

    // Log medium and low as info
    if (mediumAnomalies.length > 0 || lowAnomalies.length > 0) {
      logger.info('Anomalies detected', {
        medium: mediumAnomalies.length,
        low: lowAnomalies.length,
        total: anomalies.length,
      });
    }

    // TODO: Future enhancement - store in NotificationLog table
    // TODO: Future enhancement - send notifications based on NotificationRule
    // For now, just log to console/file
  }
}
