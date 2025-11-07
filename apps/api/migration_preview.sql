-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."Complexity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "public"."IssueStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."PRStatus" AS ENUM ('OPEN', 'CLOSED', 'MERGED');

-- CreateEnum
CREATE TYPE "public"."ReviewState" AS ENUM ('APPROVED', 'CHANGES_REQUESTED', 'COMMENTED', 'DISMISSED');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."Role_new" AS ENUM ('ADMIN', 'MANAGER', 'DEVELOPER', 'VIEWER');
ALTER TABLE "user_organizations" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "public"."user_organizations" ALTER COLUMN "role" TYPE "public"."Role_new" USING ("role"::text::"public"."Role_new");
ALTER TYPE "public"."Role" RENAME TO "Role_old";
ALTER TYPE "public"."Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "public"."user_organizations" ALTER COLUMN "role" SET DEFAULT 'DEVELOPER';
COMMIT;

-- DropForeignKey
ALTER TABLE "user_organizations" DROP CONSTRAINT "user_organizations_orgId_fkey";

-- DropForeignKey
ALTER TABLE "repositories" DROP CONSTRAINT "repositories_orgId_fkey";

-- DropForeignKey
ALTER TABLE "repository_stats" DROP CONSTRAINT "repository_stats_repoId_fkey";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_repoId_fkey";

-- DropForeignKey
ALTER TABLE "commits" DROP CONSTRAINT "commits_repoId_fkey";

-- DropForeignKey
ALTER TABLE "commits" DROP CONSTRAINT "commits_authorId_fkey";

-- DropForeignKey
ALTER TABLE "pull_requests" DROP CONSTRAINT "pull_requests_repoId_fkey";

-- DropForeignKey
ALTER TABLE "pull_requests" DROP CONSTRAINT "pull_requests_authorId_fkey";

-- DropForeignKey
ALTER TABLE "issues" DROP CONSTRAINT "issues_repoId_fkey";

-- DropForeignKey
ALTER TABLE "issues" DROP CONSTRAINT "issues_authorId_fkey";

-- DropForeignKey
ALTER TABLE "developer_metrics" DROP CONSTRAINT "developer_metrics_userId_fkey";

-- DropForeignKey
ALTER TABLE "developer_metrics" DROP CONSTRAINT "developer_metrics_orgId_fkey";

-- DropForeignKey
ALTER TABLE "team_metrics" DROP CONSTRAINT "team_metrics_orgId_fkey";

-- DropForeignKey
ALTER TABLE "ai_reviews" DROP CONSTRAINT "ai_reviews_prId_fkey";

-- DropForeignKey
ALTER TABLE "notification_rules" DROP CONSTRAINT "notification_rules_orgId_fkey";

-- DropForeignKey
ALTER TABLE "api_keys" DROP CONSTRAINT "api_keys_userId_fkey";

-- DropForeignKey
ALTER TABLE "api_keys" DROP CONSTRAINT "api_keys_orgId_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_orgId_fkey";

-- DropIndex
DROP INDEX "users_githubId_idx";

-- DropIndex
DROP INDEX "users_email_idx";

-- DropIndex
DROP INDEX "organizations_slug_key";

-- DropIndex
DROP INDEX "organizations_slug_idx";

-- DropIndex
DROP INDEX "organizations_githubId_idx";

-- DropIndex
DROP INDEX "user_organizations_userId_idx";

-- DropIndex
DROP INDEX "user_organizations_orgId_idx";

-- DropIndex
DROP INDEX "user_organizations_orgId_role_idx";

-- DropIndex
DROP INDEX "repositories_orgId_idx";

-- DropIndex
DROP INDEX "repositories_githubId_idx";

-- DropIndex
DROP INDEX "repositories_orgId_syncStatus_idx";

-- DropIndex
DROP INDEX "repositories_syncStatus_idx";

-- DropIndex
DROP INDEX "repository_stats_repoId_date_idx";

-- DropIndex
DROP INDEX "repository_stats_date_idx";

-- DropIndex
DROP INDEX "repository_stats_repoId_date_key";

-- DropIndex
DROP INDEX "events_repoId_createdAt_idx";

-- DropIndex
DROP INDEX "events_createdAt_idx";

-- DropIndex
DROP INDEX "events_processed_createdAt_idx";

-- DropIndex
DROP INDEX "events_repoId_type_createdAt_idx";

-- DropIndex
DROP INDEX "events_githubId_repoId_key";

-- DropIndex
DROP INDEX "commits_githubId_key";

-- DropIndex
DROP INDEX "commits_repoId_committedAt_idx";

-- DropIndex
DROP INDEX "commits_authorId_committedAt_idx";

-- DropIndex
DROP INDEX "commits_committedAt_idx";

-- DropIndex
DROP INDEX "pull_requests_repoId_state_createdAt_idx";

-- DropIndex
DROP INDEX "pull_requests_authorId_createdAt_idx";

-- DropIndex
DROP INDEX "pull_requests_state_createdAt_idx";

-- DropIndex
DROP INDEX "pull_requests_repoId_number_key";

-- DropIndex
DROP INDEX "issues_repoId_state_idx";

-- DropIndex
DROP INDEX "issues_authorId_createdAt_idx";

-- DropIndex
DROP INDEX "issues_state_createdAt_idx";

-- DropIndex
DROP INDEX "issues_repoId_number_key";

-- DropIndex
DROP INDEX "developer_metrics_orgId_date_idx";

-- DropIndex
DROP INDEX "developer_metrics_date_idx";

-- DropIndex
DROP INDEX "developer_metrics_userId_orgId_date_key";

-- DropIndex
DROP INDEX "team_metrics_orgId_date_idx";

-- DropIndex
DROP INDEX "team_metrics_date_idx";

-- DropIndex
DROP INDEX "team_metrics_orgId_date_key";

-- DropIndex
DROP INDEX "ai_reviews_prId_key";

-- DropIndex
DROP INDEX "ai_reviews_prId_idx";

-- DropIndex
DROP INDEX "ai_reviews_riskScore_idx";

-- DropIndex
DROP INDEX "ai_reviews_createdAt_idx";

-- DropIndex
DROP INDEX "notification_rules_orgId_idx";

-- DropIndex
DROP INDEX "notification_rules_orgId_isActive_idx";

-- DropIndex
DROP INDEX "notification_rules_type_isActive_idx";

-- DropIndex
DROP INDEX "notification_logs_recipientId_triggeredAt_idx";

-- DropIndex
DROP INDEX "notification_logs_status_triggeredAt_idx";

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "accessToken",
DROP COLUMN "lastLoginAt",
DROP COLUMN "lastLoginIp",
DROP COLUMN "loginCount",
DROP COLUMN "notificationPreferences",
DROP COLUMN "preferences",
DROP COLUMN "refreshToken",
DROP COLUMN "tokenExpiresAt",
ADD COLUMN     "githubAccessToken" TEXT NOT NULL,
ALTER COLUMN "githubId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."organizations" DROP COLUMN "planLimits",
DROP COLUMN "settings",
DROP COLUMN "slug",
ALTER COLUMN "githubId" SET NOT NULL,
ALTER COLUMN "githubId" SET DATA TYPE TEXT,
DROP COLUMN "planType",
ADD COLUMN     "planType" TEXT NOT NULL DEFAULT 'free';

-- AlterTable
ALTER TABLE "public"."user_organizations" DROP CONSTRAINT "user_organizations_pkey",
DROP COLUMN "orgId",
ADD COLUMN     "organizationId" TEXT NOT NULL,
ALTER COLUMN "role" SET DEFAULT 'DEVELOPER',
ADD CONSTRAINT "user_organizations_pkey" PRIMARY KEY ("userId", "organizationId");

-- AlterTable
ALTER TABLE "public"."repositories" DROP COLUMN "aiReviewEnabled",
DROP COLUMN "description",
DROP COLUMN "lastSyncedAt",
DROP COLUMN "orgId",
DROP COLUMN "sensitivityLevel",
DROP COLUMN "syncStatus",
DROP COLUMN "webhookRateLimit",
ADD COLUMN     "organizationId" TEXT NOT NULL,
ALTER COLUMN "githubId" SET DATA TYPE TEXT,
ALTER COLUMN "isPrivate" DROP DEFAULT,
ALTER COLUMN "webhookId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."repository_stats" DROP COLUMN "createdAt",
DROP COLUMN "filesChanged",
DROP COLUMN "forks",
DROP COLUMN "linesAdded",
DROP COLUMN "linesDeleted",
DROP COLUMN "repoId",
DROP COLUMN "stars",
DROP COLUMN "topContributor",
DROP COLUMN "uniqueContributors",
DROP COLUMN "updatedAt",
DROP COLUMN "watchers",
ADD COLUMN     "repositoryId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."events" DROP COLUMN "action",
DROP COLUMN "authorGithubId",
DROP COLUMN "processed",
DROP COLUMN "processedAt",
DROP COLUMN "receivedAt",
DROP COLUMN "repoId",
ADD COLUMN     "repositoryId" TEXT NOT NULL,
ALTER COLUMN "githubId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."commits" DROP COLUMN "authorEmail",
DROP COLUMN "authorGithubId",
DROP COLUMN "authorName",
DROP COLUMN "committedAt",
DROP COLUMN "githubId",
DROP COLUMN "repoId",
ADD COLUMN     "repositoryId" TEXT NOT NULL,
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "authorId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."pull_requests" DROP COLUMN "authorGithubId",
DROP COLUMN "repoId",
DROP COLUMN "state",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "repositoryId" TEXT NOT NULL,
ADD COLUMN     "status" "public"."PRStatus" NOT NULL DEFAULT 'OPEN',
ALTER COLUMN "githubId" SET DATA TYPE TEXT,
ALTER COLUMN "authorId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."issues" DROP COLUMN "authorGithubId",
DROP COLUMN "repoId",
DROP COLUMN "state",
ADD COLUMN     "assigneeId" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "repositoryId" TEXT NOT NULL,
ADD COLUMN     "status" "public"."IssueStatus" NOT NULL DEFAULT 'OPEN',
ALTER COLUMN "githubId" SET DATA TYPE TEXT,
ALTER COLUMN "authorId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."developer_metrics" DROP COLUMN "avgCodeQuality",
DROP COLUMN "avgCommitTime",
DROP COLUMN "avgIssueTime",
DROP COLUMN "avgPrSize",
DROP COLUMN "avgReviewTime",
DROP COLUMN "bugFixed",
DROP COLUMN "bugIntroduced",
DROP COLUMN "commitsLateNight",
DROP COLUMN "commitsOnWeekend",
DROP COLUMN "createdAt",
DROP COLUMN "filesChanged",
DROP COLUMN "issuesOpened",
DROP COLUMN "orgId",
DROP COLUMN "prsClosed",
DROP COLUMN "prsMerged",
DROP COLUMN "reviewComments",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "public"."team_metrics" DROP COLUMN "activeContributors",
DROP COLUMN "avgPrCycleTime",
DROP COLUMN "avgPrQueueTime",
DROP COLUMN "avgReviewTime",
DROP COLUMN "changeFailureRate",
DROP COLUMN "codeQualityScore",
DROP COLUMN "createdAt",
DROP COLUMN "deploymentSuccessRate",
DROP COLUMN "issueBacklog",
DROP COLUMN "knowledgeDistribution",
DROP COLUMN "meanTimeToRecovery",
DROP COLUMN "orgId",
DROP COLUMN "prQueueLength",
DROP COLUMN "prReviewCoverage",
DROP COLUMN "testCoverage",
DROP COLUMN "totalCommits",
DROP COLUMN "totalIssuesClosed",
DROP COLUMN "totalPrsMerged",
DROP COLUMN "totalPrsOpened",
DROP COLUMN "updatedAt",
ADD COLUMN     "organizationId" TEXT NOT NULL,
ADD COLUMN     "prCycleTime" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "velocity" DROP DEFAULT,
ALTER COLUMN "velocity" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "buildSuccessRate" SET NOT NULL,
ALTER COLUMN "deploymentFrequency" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."ai_reviews" DROP COLUMN "analysis",
DROP COLUMN "bugsPotential",
DROP COLUMN "githubCommentId",
DROP COLUMN "isSharedToGithub",
DROP COLUMN "modelVersion",
DROP COLUMN "performanceConcerns",
DROP COLUMN "prId",
DROP COLUMN "processingTime",
DROP COLUMN "qualityIssues",
DROP COLUMN "tokensUsed",
DROP COLUMN "updatedAt",
DROP COLUMN "visibility",
ADD COLUMN     "estimatedReviewTime" INTEGER NOT NULL,
ADD COLUMN     "potentialBugs" JSONB NOT NULL,
ADD COLUMN     "pullRequestId" TEXT NOT NULL,
DROP COLUMN "complexity",
ADD COLUMN     "complexity" "public"."Complexity" NOT NULL,
DROP COLUMN "securityIssues",
ADD COLUMN     "securityIssues" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "public"."notification_rules" DROP COLUMN "channelConfig",
DROP COLUMN "createdBy",
DROP COLUMN "isActive",
DROP COLUMN "name",
DROP COLUMN "orgId",
DROP COLUMN "updatedAt",
ADD COLUMN     "discordWebhook" TEXT,
ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "organizationId" TEXT NOT NULL,
ADD COLUMN     "slackChannel" TEXT;

-- AlterTable
ALTER TABLE "public"."notification_logs" DROP COLUMN "channel",
DROP COLUMN "failedReason",
DROP COLUMN "message",
DROP COLUMN "metadata",
DROP COLUMN "recipientId",
DROP COLUMN "title",
ADD COLUMN     "eventType" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL,
ALTER COLUMN "triggeredAt" SET DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "api_keys";

-- DropTable
DROP TABLE "audit_logs";

-- DropEnum
DROP TYPE "PlanType";

-- DropEnum
DROP TYPE "PRState";

-- DropEnum
DROP TYPE "IssueState";

-- DropEnum
DROP TYPE "SyncStatus";

-- DropEnum
DROP TYPE "SensitivityLevel";

-- DropEnum
DROP TYPE "NotificationStatus";

-- CreateTable
CREATE TABLE "public"."reviews" (
    "id" TEXT NOT NULL,
    "pullRequestId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "state" "public"."ReviewState" NOT NULL,
    "comment" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reviews_pullRequestId_submittedAt_idx" ON "public"."reviews"("pullRequestId" ASC, "submittedAt" ASC);

-- CreateIndex
CREATE INDEX "repository_stats_repositoryId_date_idx" ON "public"."repository_stats"("repositoryId" ASC, "date" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "repository_stats_repositoryId_date_key" ON "public"."repository_stats"("repositoryId" ASC, "date" ASC);

-- CreateIndex
CREATE INDEX "events_repositoryId_type_createdAt_idx" ON "public"."events"("repositoryId" ASC, "type" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "commits_repositoryId_timestamp_idx" ON "public"."commits"("repositoryId" ASC, "timestamp" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "commits_sha_key" ON "public"."commits"("sha" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "pull_requests_repositoryId_number_key" ON "public"."pull_requests"("repositoryId" ASC, "number" ASC);

-- CreateIndex
CREATE INDEX "pull_requests_repositoryId_status_createdAt_idx" ON "public"."pull_requests"("repositoryId" ASC, "status" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "issues_repositoryId_number_key" ON "public"."issues"("repositoryId" ASC, "number" ASC);

-- CreateIndex
CREATE INDEX "issues_repositoryId_status_idx" ON "public"."issues"("repositoryId" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "developer_metrics_userId_date_key" ON "public"."developer_metrics"("userId" ASC, "date" ASC);

-- CreateIndex
CREATE INDEX "team_metrics_organizationId_date_idx" ON "public"."team_metrics"("organizationId" ASC, "date" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "team_metrics_organizationId_date_key" ON "public"."team_metrics"("organizationId" ASC, "date" ASC);

-- CreateIndex
CREATE INDEX "ai_reviews_pullRequestId_idx" ON "public"."ai_reviews"("pullRequestId" ASC);

-- AddForeignKey
ALTER TABLE "public"."ai_reviews" ADD CONSTRAINT "ai_reviews_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "public"."pull_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."commits" ADD CONSTRAINT "commits_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."commits" ADD CONSTRAINT "commits_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "public"."repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."events" ADD CONSTRAINT "events_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "public"."repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."issues" ADD CONSTRAINT "issues_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "public"."repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification_rules" ADD CONSTRAINT "notification_rules_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pull_requests" ADD CONSTRAINT "pull_requests_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pull_requests" ADD CONSTRAINT "pull_requests_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "public"."repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."repositories" ADD CONSTRAINT "repositories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."repository_stats" ADD CONSTRAINT "repository_stats_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "public"."repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "public"."pull_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_organizations" ADD CONSTRAINT "user_organizations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

