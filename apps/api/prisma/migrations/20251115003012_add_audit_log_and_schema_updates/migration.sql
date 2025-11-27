/*
  Warnings:

  - The values [MANAGER,DEVELOPER] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `estimatedReviewTime` on the `ai_reviews` table. All the data in the column will be lost.
  - You are about to drop the column `potentialBugs` on the `ai_reviews` table. All the data in the column will be lost.
  - You are about to drop the column `pullRequestId` on the `ai_reviews` table. All the data in the column will be lost.
  - The `securityIssues` column on the `ai_reviews` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `repositoryId` on the `commits` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `commits` table. All the data in the column will be lost.
  - You are about to drop the column `repositoryId` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `assigneeId` on the `issues` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `issues` table. All the data in the column will be lost.
  - You are about to drop the column `repositoryId` on the `issues` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `issues` table. All the data in the column will be lost.
  - You are about to drop the column `eventType` on the `notification_logs` table. All the data in the column will be lost.
  - You are about to drop the column `discordWebhook` on the `notification_rules` table. All the data in the column will be lost.
  - You are about to drop the column `enabled` on the `notification_rules` table. All the data in the column will be lost.
  - You are about to drop the column `slackChannel` on the `notification_rules` table. All the data in the column will be lost.
  - The `githubId` column on the `organizations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `planType` column on the `organizations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `description` on the `pull_requests` table. All the data in the column will be lost.
  - You are about to drop the column `repositoryId` on the `pull_requests` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `pull_requests` table. All the data in the column will be lost.
  - The `webhookId` column on the `repositories` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `repositoryId` on the `repository_stats` table. All the data in the column will be lost.
  - You are about to drop the column `prCycleTime` on the `team_metrics` table. All the data in the column will be lost.
  - You are about to alter the column `velocity` on the `team_metrics` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to drop the column `githubAccessToken` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `reviews` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[prId]` on the table `ai_reviews` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[githubId]` on the table `commits` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,organizationId,date]` on the table `developer_metrics` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[githubId,repoId]` on the table `events` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[repoId,number]` on the table `issues` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `organizations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[repoId,number]` on the table `pull_requests` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[repoId,date]` on the table `repository_stats` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `analysis` to the `ai_reviews` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prId` to the `ai_reviews` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ai_reviews` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `complexity` on the `ai_reviews` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `committedAt` to the `commits` table without a default value. This is not possible if the table is not empty.
  - Added the required column `githubId` to the `commits` table without a default value. This is not possible if the table is not empty.
  - Added the required column `repoId` to the `commits` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `developer_metrics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `developer_metrics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `repoId` to the `events` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `githubId` on the `events` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `repoId` to the `issues` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `githubId` on the `issues` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `channel` to the `notification_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `message` to the `notification_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recipientId` to the `notification_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `notification_logs` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `notification_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `createdBy` to the `notification_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `notification_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `notification_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `organizations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `repoId` to the `pull_requests` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `githubId` on the `pull_requests` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `githubId` on the `repositories` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `repoId` to the `repository_stats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `repository_stats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `team_metrics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accessToken` to the `users` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `githubId` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "PRState" AS ENUM ('OPEN', 'CLOSED', 'MERGED');

-- CreateEnum
CREATE TYPE "IssueState" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SYNCING', 'ACTIVE', 'ERROR', 'PAUSED');

-- CreateEnum
CREATE TYPE "SensitivityLevel" AS ENUM ('NORMAL', 'SENSITIVE', 'CONFIDENTIAL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('SENT', 'FAILED', 'BOUNCED', 'PENDING');

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'MEMBER', 'VIEWER');
ALTER TABLE "public"."user_organizations" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "user_organizations" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "user_organizations" ALTER COLUMN "role" SET DEFAULT 'MEMBER';
COMMIT;

-- DropForeignKey
ALTER TABLE "ai_reviews" DROP CONSTRAINT "ai_reviews_pullRequestId_fkey";

-- DropForeignKey
ALTER TABLE "commits" DROP CONSTRAINT "commits_authorId_fkey";

-- DropForeignKey
ALTER TABLE "commits" DROP CONSTRAINT "commits_repositoryId_fkey";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_repositoryId_fkey";

-- DropForeignKey
ALTER TABLE "issues" DROP CONSTRAINT "issues_repositoryId_fkey";

-- DropForeignKey
ALTER TABLE "pull_requests" DROP CONSTRAINT "pull_requests_authorId_fkey";

-- DropForeignKey
ALTER TABLE "pull_requests" DROP CONSTRAINT "pull_requests_repositoryId_fkey";

-- DropForeignKey
ALTER TABLE "repository_stats" DROP CONSTRAINT "repository_stats_repositoryId_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_pullRequestId_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_reviewerId_fkey";

-- DropIndex
DROP INDEX "ai_reviews_pullRequestId_idx";

-- DropIndex
DROP INDEX "commits_repositoryId_timestamp_idx";

-- DropIndex
DROP INDEX "commits_sha_key";

-- DropIndex
DROP INDEX "developer_metrics_userId_date_key";

-- DropIndex
DROP INDEX "events_repositoryId_type_createdAt_idx";

-- DropIndex
DROP INDEX "issues_repositoryId_number_key";

-- DropIndex
DROP INDEX "issues_repositoryId_status_idx";

-- DropIndex
DROP INDEX "pull_requests_repositoryId_number_key";

-- DropIndex
DROP INDEX "pull_requests_repositoryId_status_createdAt_idx";

-- DropIndex
DROP INDEX "repository_stats_repositoryId_date_idx";

-- DropIndex
DROP INDEX "repository_stats_repositoryId_date_key";

-- AlterTable
ALTER TABLE "ai_reviews" DROP COLUMN "estimatedReviewTime",
DROP COLUMN "potentialBugs",
DROP COLUMN "pullRequestId",
ADD COLUMN     "analysis" TEXT NOT NULL,
ADD COLUMN     "bugsPotential" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "githubCommentId" BIGINT,
ADD COLUMN     "isSharedToGithub" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "modelVersion" TEXT NOT NULL DEFAULT 'claude-3-sonnet',
ADD COLUMN     "performanceConcerns" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "prId" TEXT NOT NULL,
ADD COLUMN     "processingTime" INTEGER,
ADD COLUMN     "qualityIssues" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tokensUsed" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "visibility" TEXT NOT NULL DEFAULT 'team',
DROP COLUMN "complexity",
ADD COLUMN     "complexity" TEXT NOT NULL,
DROP COLUMN "securityIssues",
ADD COLUMN     "securityIssues" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "commits" DROP COLUMN "repositoryId",
DROP COLUMN "timestamp",
ADD COLUMN     "authorEmail" TEXT,
ADD COLUMN     "authorGithubId" BIGINT,
ADD COLUMN     "authorName" TEXT,
ADD COLUMN     "committedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "githubId" TEXT NOT NULL,
ADD COLUMN     "repoId" TEXT NOT NULL,
ALTER COLUMN "authorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "developer_metrics" ADD COLUMN     "avgCodeQuality" DOUBLE PRECISION,
ADD COLUMN     "avgCommitTime" TEXT,
ADD COLUMN     "avgIssueTime" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "avgPrSize" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "avgReviewTime" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bugFixed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bugIntroduced" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "commitsLateNight" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "commitsOnWeekend" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "filesChanged" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "issuesOpened" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "organizationId" TEXT NOT NULL,
ADD COLUMN     "prsClosed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "prsMerged" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reviewComments" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "events" DROP COLUMN "repositoryId",
ADD COLUMN     "action" TEXT,
ADD COLUMN     "authorGithubId" BIGINT,
ADD COLUMN     "processed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "repoId" TEXT NOT NULL,
DROP COLUMN "githubId",
ADD COLUMN     "githubId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "issues" DROP COLUMN "assigneeId",
DROP COLUMN "description",
DROP COLUMN "repositoryId",
DROP COLUMN "status",
ADD COLUMN     "authorGithubId" BIGINT,
ADD COLUMN     "repoId" TEXT NOT NULL,
ADD COLUMN     "state" "IssueState" NOT NULL DEFAULT 'OPEN',
DROP COLUMN "githubId",
ADD COLUMN     "githubId" BIGINT NOT NULL,
ALTER COLUMN "authorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "notification_logs" DROP COLUMN "eventType",
ADD COLUMN     "channel" TEXT NOT NULL,
ADD COLUMN     "failedReason" TEXT,
ADD COLUMN     "message" TEXT NOT NULL,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "recipientId" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ALTER COLUMN "triggeredAt" DROP DEFAULT,
DROP COLUMN "status",
ADD COLUMN     "status" "NotificationStatus" NOT NULL;

-- AlterTable
ALTER TABLE "notification_rules" DROP COLUMN "discordWebhook",
DROP COLUMN "enabled",
DROP COLUMN "slackChannel",
ADD COLUMN     "channelConfig" JSONB,
ADD COLUMN     "createdBy" TEXT NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "planLimits" JSONB,
ADD COLUMN     "settings" JSONB,
ADD COLUMN     "slug" TEXT NOT NULL,
DROP COLUMN "githubId",
ADD COLUMN     "githubId" BIGINT,
DROP COLUMN "planType",
ADD COLUMN     "planType" "PlanType" NOT NULL DEFAULT 'FREE';

-- AlterTable
ALTER TABLE "pull_requests" DROP COLUMN "description",
DROP COLUMN "repositoryId",
DROP COLUMN "status",
ADD COLUMN     "authorGithubId" BIGINT,
ADD COLUMN     "repoId" TEXT NOT NULL,
ADD COLUMN     "state" "PRState" NOT NULL DEFAULT 'OPEN',
DROP COLUMN "githubId",
ADD COLUMN     "githubId" BIGINT NOT NULL,
ALTER COLUMN "authorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "repositories" ADD COLUMN     "aiReviewEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "sensitivityLevel" "SensitivityLevel" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "syncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "webhookRateLimit" INTEGER NOT NULL DEFAULT 1000,
DROP COLUMN "githubId",
ADD COLUMN     "githubId" BIGINT NOT NULL,
ALTER COLUMN "isPrivate" SET DEFAULT false,
DROP COLUMN "webhookId",
ADD COLUMN     "webhookId" BIGINT;

-- AlterTable
ALTER TABLE "repository_stats" DROP COLUMN "repositoryId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "filesChanged" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "forks" INTEGER,
ADD COLUMN     "linesAdded" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "linesDeleted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "repoId" TEXT NOT NULL,
ADD COLUMN     "stars" INTEGER,
ADD COLUMN     "topContributor" TEXT,
ADD COLUMN     "uniqueContributors" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "watchers" INTEGER;

-- AlterTable
ALTER TABLE "team_metrics" DROP COLUMN "prCycleTime",
ADD COLUMN     "activeContributors" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "avgPrCycleTime" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "avgPrQueueTime" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "avgReviewTime" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "changeFailureRate" DOUBLE PRECISION,
ADD COLUMN     "codeQualityScore" DOUBLE PRECISION,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deploymentSuccessRate" DOUBLE PRECISION,
ADD COLUMN     "issueBacklog" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "knowledgeDistribution" DOUBLE PRECISION,
ADD COLUMN     "meanTimeToRecovery" INTEGER,
ADD COLUMN     "prQueueLength" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "prReviewCoverage" DOUBLE PRECISION,
ADD COLUMN     "testCoverage" DOUBLE PRECISION,
ADD COLUMN     "totalCommits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalIssuesClosed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalPrsMerged" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalPrsOpened" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "velocity" SET DEFAULT 0,
ALTER COLUMN "velocity" SET DATA TYPE INTEGER,
ALTER COLUMN "deploymentFrequency" SET DEFAULT 0,
ALTER COLUMN "buildSuccessRate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "user_organizations" ALTER COLUMN "role" SET DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "githubAccessToken",
ADD COLUMN     "accessToken" TEXT NOT NULL,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginIp" TEXT,
ADD COLUMN     "loginCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "notificationPreferences" JSONB DEFAULT '{}',
ADD COLUMN     "preferences" JSONB DEFAULT '{}',
ADD COLUMN     "refreshToken" TEXT,
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3),
DROP COLUMN "githubId",
ADD COLUMN     "githubId" BIGINT NOT NULL;

-- DropTable
DROP TABLE "reviews";

-- DropEnum
DROP TYPE "Complexity";

-- DropEnum
DROP TYPE "IssueStatus";

-- DropEnum
DROP TYPE "PRStatus";

-- DropEnum
DROP TYPE "ReviewState";

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "lastFour" TEXT NOT NULL,
    "scopes" TEXT[],
    "rateLimit" INTEGER NOT NULL DEFAULT 100,
    "lastUsedAt" TIMESTAMP(3),
    "totalRequests" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_keyHash_idx" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_userId_idx" ON "api_keys"("userId");

-- CreateIndex
CREATE INDEX "api_keys_organizationId_idx" ON "api_keys"("organizationId");

-- CreateIndex
CREATE INDEX "api_keys_organizationId_isActive_idx" ON "api_keys"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_createdAt_idx" ON "audit_logs"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ai_reviews_prId_key" ON "ai_reviews"("prId");

-- CreateIndex
CREATE INDEX "ai_reviews_prId_idx" ON "ai_reviews"("prId");

-- CreateIndex
CREATE INDEX "ai_reviews_riskScore_idx" ON "ai_reviews"("riskScore");

-- CreateIndex
CREATE INDEX "ai_reviews_createdAt_idx" ON "ai_reviews"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "commits_githubId_key" ON "commits"("githubId");

-- CreateIndex
CREATE INDEX "commits_repoId_committedAt_idx" ON "commits"("repoId", "committedAt");

-- CreateIndex
CREATE INDEX "commits_authorId_committedAt_idx" ON "commits"("authorId", "committedAt");

-- CreateIndex
CREATE INDEX "commits_committedAt_idx" ON "commits"("committedAt");

-- CreateIndex
CREATE INDEX "developer_metrics_organizationId_date_idx" ON "developer_metrics"("organizationId", "date");

-- CreateIndex
CREATE INDEX "developer_metrics_date_idx" ON "developer_metrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "developer_metrics_userId_organizationId_date_key" ON "developer_metrics"("userId", "organizationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "events_githubId_key" ON "events"("githubId");

-- CreateIndex
CREATE INDEX "events_repoId_createdAt_idx" ON "events"("repoId", "createdAt");

-- CreateIndex
CREATE INDEX "events_createdAt_idx" ON "events"("createdAt");

-- CreateIndex
CREATE INDEX "events_processed_createdAt_idx" ON "events"("processed", "createdAt");

-- CreateIndex
CREATE INDEX "events_repoId_type_createdAt_idx" ON "events"("repoId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "events_githubId_repoId_key" ON "events"("githubId", "repoId");

-- CreateIndex
CREATE UNIQUE INDEX "issues_githubId_key" ON "issues"("githubId");

-- CreateIndex
CREATE INDEX "issues_repoId_state_idx" ON "issues"("repoId", "state");

-- CreateIndex
CREATE INDEX "issues_authorId_createdAt_idx" ON "issues"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "issues_state_createdAt_idx" ON "issues"("state", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "issues_repoId_number_key" ON "issues"("repoId", "number");

-- CreateIndex
CREATE INDEX "notification_logs_recipientId_triggeredAt_idx" ON "notification_logs"("recipientId", "triggeredAt");

-- CreateIndex
CREATE INDEX "notification_logs_status_triggeredAt_idx" ON "notification_logs"("status", "triggeredAt");

-- CreateIndex
CREATE INDEX "notification_rules_organizationId_idx" ON "notification_rules"("organizationId");

-- CreateIndex
CREATE INDEX "notification_rules_organizationId_isActive_idx" ON "notification_rules"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "notification_rules_type_isActive_idx" ON "notification_rules"("type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_githubId_key" ON "organizations"("githubId");

-- CreateIndex
CREATE INDEX "organizations_slug_idx" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_githubId_idx" ON "organizations"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "pull_requests_githubId_key" ON "pull_requests"("githubId");

-- CreateIndex
CREATE INDEX "pull_requests_repoId_state_createdAt_idx" ON "pull_requests"("repoId", "state", "createdAt");

-- CreateIndex
CREATE INDEX "pull_requests_authorId_createdAt_idx" ON "pull_requests"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "pull_requests_state_createdAt_idx" ON "pull_requests"("state", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "pull_requests_repoId_number_key" ON "pull_requests"("repoId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "repositories_githubId_key" ON "repositories"("githubId");

-- CreateIndex
CREATE INDEX "repositories_organizationId_idx" ON "repositories"("organizationId");

-- CreateIndex
CREATE INDEX "repositories_githubId_idx" ON "repositories"("githubId");

-- CreateIndex
CREATE INDEX "repositories_organizationId_syncStatus_idx" ON "repositories"("organizationId", "syncStatus");

-- CreateIndex
CREATE INDEX "repositories_syncStatus_idx" ON "repositories"("syncStatus");

-- CreateIndex
CREATE INDEX "repository_stats_repoId_date_idx" ON "repository_stats"("repoId", "date");

-- CreateIndex
CREATE INDEX "repository_stats_date_idx" ON "repository_stats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "repository_stats_repoId_date_key" ON "repository_stats"("repoId", "date");

-- CreateIndex
CREATE INDEX "team_metrics_date_idx" ON "team_metrics"("date");

-- CreateIndex
CREATE INDEX "user_organizations_userId_idx" ON "user_organizations"("userId");

-- CreateIndex
CREATE INDEX "user_organizations_organizationId_idx" ON "user_organizations"("organizationId");

-- CreateIndex
CREATE INDEX "user_organizations_organizationId_role_idx" ON "user_organizations"("organizationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "users_githubId_key" ON "users"("githubId");

-- CreateIndex
CREATE INDEX "users_githubId_idx" ON "users"("githubId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- AddForeignKey
ALTER TABLE "repository_stats" ADD CONSTRAINT "repository_stats_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commits" ADD CONSTRAINT "commits_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commits" ADD CONSTRAINT "commits_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developer_metrics" ADD CONSTRAINT "developer_metrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developer_metrics" ADD CONSTRAINT "developer_metrics_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_metrics" ADD CONSTRAINT "team_metrics_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_reviews" ADD CONSTRAINT "ai_reviews_prId_fkey" FOREIGN KEY ("prId") REFERENCES "pull_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
