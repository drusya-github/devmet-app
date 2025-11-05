-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'DEVELOPER', 'VIEWER');

-- CreateEnum
CREATE TYPE "PRStatus" AS ENUM ('OPEN', 'CLOSED', 'MERGED');

-- CreateEnum
CREATE TYPE "ReviewState" AS ENUM ('APPROVED', 'CHANGES_REQUESTED', 'COMMENTED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "Complexity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "githubId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "githubAccessToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "githubId" TEXT NOT NULL,
    "planType" TEXT NOT NULL DEFAULT 'free',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_organizations" (
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'DEVELOPER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_organizations_pkey" PRIMARY KEY ("userId","organizationId")
);

-- CreateTable
CREATE TABLE "repositories" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "githubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL,
    "language" TEXT,
    "webhookId" TEXT,
    "webhookSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repository_stats" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "commits" INTEGER NOT NULL DEFAULT 0,
    "prsOpened" INTEGER NOT NULL DEFAULT 0,
    "prsMerged" INTEGER NOT NULL DEFAULT 0,
    "prsClosed" INTEGER NOT NULL DEFAULT 0,
    "issuesOpened" INTEGER NOT NULL DEFAULT 0,
    "issuesClosed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "repository_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "githubId" TEXT NOT NULL,
    "authorId" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commits" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "sha" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "additions" INTEGER NOT NULL DEFAULT 0,
    "deletions" INTEGER NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pull_requests" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "githubId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "authorId" TEXT NOT NULL,
    "status" "PRStatus" NOT NULL DEFAULT 'OPEN',
    "additions" INTEGER NOT NULL DEFAULT 0,
    "deletions" INTEGER NOT NULL DEFAULT 0,
    "filesChanged" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "mergedAt" TIMESTAMP(3),

    CONSTRAINT "pull_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "pullRequestId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "state" "ReviewState" NOT NULL,
    "comment" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_reviews" (
    "id" TEXT NOT NULL,
    "pullRequestId" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "complexity" "Complexity" NOT NULL,
    "potentialBugs" JSONB NOT NULL,
    "securityIssues" JSONB NOT NULL,
    "suggestions" JSONB NOT NULL,
    "estimatedReviewTime" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issues" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "githubId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "authorId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "developer_metrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "commits" INTEGER NOT NULL DEFAULT 0,
    "prsOpened" INTEGER NOT NULL DEFAULT 0,
    "prsReviewed" INTEGER NOT NULL DEFAULT 0,
    "issuesResolved" INTEGER NOT NULL DEFAULT 0,
    "linesAdded" INTEGER NOT NULL DEFAULT 0,
    "linesDeleted" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "developer_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_metrics" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "velocity" DOUBLE PRECISION NOT NULL,
    "prCycleTime" DOUBLE PRECISION NOT NULL,
    "deploymentFrequency" INTEGER NOT NULL,
    "buildSuccessRate" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "team_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_rules" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "channels" TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "slackChannel" TEXT,
    "discordWebhook" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_githubId_key" ON "users"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_githubId_key" ON "organizations"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "repositories_githubId_key" ON "repositories"("githubId");

-- CreateIndex
CREATE INDEX "repository_stats_repositoryId_date_idx" ON "repository_stats"("repositoryId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "repository_stats_repositoryId_date_key" ON "repository_stats"("repositoryId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "events_githubId_key" ON "events"("githubId");

-- CreateIndex
CREATE INDEX "events_repositoryId_type_createdAt_idx" ON "events"("repositoryId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "commits_sha_key" ON "commits"("sha");

-- CreateIndex
CREATE INDEX "commits_repositoryId_timestamp_idx" ON "commits"("repositoryId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "pull_requests_githubId_key" ON "pull_requests"("githubId");

-- CreateIndex
CREATE INDEX "pull_requests_repositoryId_status_createdAt_idx" ON "pull_requests"("repositoryId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "pull_requests_repositoryId_number_key" ON "pull_requests"("repositoryId", "number");

-- CreateIndex
CREATE INDEX "reviews_pullRequestId_submittedAt_idx" ON "reviews"("pullRequestId", "submittedAt");

-- CreateIndex
CREATE INDEX "ai_reviews_pullRequestId_idx" ON "ai_reviews"("pullRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "issues_githubId_key" ON "issues"("githubId");

-- CreateIndex
CREATE INDEX "issues_repositoryId_status_idx" ON "issues"("repositoryId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "issues_repositoryId_number_key" ON "issues"("repositoryId", "number");

-- CreateIndex
CREATE INDEX "developer_metrics_userId_date_idx" ON "developer_metrics"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "developer_metrics_userId_date_key" ON "developer_metrics"("userId", "date");

-- CreateIndex
CREATE INDEX "team_metrics_organizationId_date_idx" ON "team_metrics"("organizationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "team_metrics_organizationId_date_key" ON "team_metrics"("organizationId", "date");

-- CreateIndex
CREATE INDEX "notification_logs_ruleId_triggeredAt_idx" ON "notification_logs"("ruleId", "triggeredAt");

-- AddForeignKey
ALTER TABLE "user_organizations" ADD CONSTRAINT "user_organizations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_organizations" ADD CONSTRAINT "user_organizations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository_stats" ADD CONSTRAINT "repository_stats_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commits" ADD CONSTRAINT "commits_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commits" ADD CONSTRAINT "commits_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "pull_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_reviews" ADD CONSTRAINT "ai_reviews_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "pull_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_rules" ADD CONSTRAINT "notification_rules_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "notification_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
