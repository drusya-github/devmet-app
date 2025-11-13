# DevMetrics Database Schema - Research & Design Specification

**Document Type**: Technical Design Specification  
**Created**: November 6, 2025  
**Status**: Approved for Implementation  
**Related Tasks**: TASK-005 (Configure Prisma and Database Schema)

---

## Executive Summary

This document captures the comprehensive research, analysis, and design decisions for the DevMetrics database schema. It serves as the authoritative reference for implementation and future development decisions.

**Key Decisions:**
- Organization-centric architecture with mandatory org membership
- 3-tier role model (Admin/Member/Viewer)
- Organization-level repository ownership
- 90-day raw event retention with permanent aggregated metrics
- Application-level token encryption with audit trail
- 16 database models supporting MVP feature set

---

## Table of Contents

1. [User & Role Architecture](#1-user--role-architecture)
2. [Organization Model](#2-organization-model)
3. [Repository & Ownership](#3-repository--ownership)
4. [Notification System](#4-notification-system)
5. [AI Review System](#5-ai-review-system)
6. [Metrics & Aggregation](#6-metrics--aggregation)
7. [Event Processing](#7-event-processing)
8. [Security & Privacy](#8-security--privacy)
9. [Additional Entities](#9-additional-entities)
10. [Performance & Scale](#10-performance--scale)
11. [Complete Entity List](#11-complete-entity-list)
12. [Field Specifications](#12-field-specifications)
13. [Relationships Map](#13-relationships-map)
14. [Migration Strategy](#14-migration-strategy)
15. [Future Enhancements](#15-future-enhancements)

---

## 1. User & Role Architecture

### 1.1 Target User Types

Based on project specification analysis:

**Primary Users (70%):** Engineering Managers & Team Leads
- Manage 5-50 person development teams
- Need team-level metrics and insights
- Configure notifications and alerts
- Make data-driven decisions about team performance

**Secondary Users (25%):** Individual Developers
- Want personal productivity tracking
- Need AI-powered code review feedback
- Compare performance with team (anonymously)
- Track personal growth over time

**Tertiary Users (5%):** CTOs / VPs of Engineering
- High-level engineering metrics
- Cross-team comparisons
- Strategic resource allocation
- ROI on engineering investments

### 1.2 Role Model Design

**Decision: 3-Tier Simple Role Model**

```
┌─────────────────────────────────────────────┐
│ ADMIN (Organization Owner/Manager)          │
├─────────────────────────────────────────────┤
│ Permissions:                                │
│ ✅ Full organization control                │
│ ✅ Manage billing and plan                  │
│ ✅ Add/remove users                         │
│ ✅ Connect/disconnect repositories          │
│ ✅ Configure organization settings          │
│ ✅ View all metrics (team and individual)   │
│ ✅ Configure notification rules             │
│ ✅ Manage integrations (Slack, API keys)    │
│ ✅ Access audit logs                        │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ MEMBER (Regular Developer)                  │
├─────────────────────────────────────────────┤
│ Permissions:                                │
│ ✅ View own detailed metrics                │
│ ✅ View team aggregated metrics             │
│ ✅ View AI review suggestions               │
│ ✅ Configure personal notifications         │
│ ✅ Access connected repositories            │
│ ✅ Export own data                          │
│ ❌ Cannot see other individuals' details    │
│ ❌ Cannot configure org settings            │
│ ❌ Cannot manage billing                    │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ VIEWER (Read-Only Guest)                    │
├─────────────────────────────────────────────┤
│ Permissions:                                │
│ ✅ View team aggregated metrics             │
│ ✅ View dashboards (read-only)              │
│ ❌ Cannot see individual metrics            │
│ ❌ Cannot configure anything                │
│ ❌ Cannot connect repositories              │
│ ❌ Cannot export data                       │
└─────────────────────────────────────────────┘
```

**Rationale:**
- Target audience (5-50 teams) doesn't need complex hierarchies
- "Engineering Manager" maps to ADMIN role with focus on metrics
- Simple enough for solo developers
- Extensible (can add MANAGER role later if needed)
- Clear permission boundaries

**Implementation:**
```prisma
enum Role {
  ADMIN    // Full control
  MEMBER   // Standard developer access
  VIEWER   // Read-only
}
```

### 1.3 Multi-Organization Support

**Decision: Users can belong to multiple organizations with different roles**

**Example Scenarios:**

**Scenario 1: Freelance Developer**
```
User: John Doe
├─ PersonalDev Org (ADMIN) - Personal projects
├─ ClientA Corp (MEMBER) - Freelance contract
└─ ClientB Inc (MEMBER) - Part-time consulting
```

**Scenario 2: Engineering Manager**
```
User: Jane Smith
├─ TechCorp (ADMIN) - Full-time employer
└─ OpenSourceProject (MEMBER) - OSS contribution tracking
```

**Scenario 3: CTO with Multiple Teams**
```
User: Bob Wilson
├─ ParentCorp (ADMIN) - Main organization
├─ SubsidiaryA (ADMIN) - Subsidiary company
└─ SubsidiaryB (ADMIN) - Another subsidiary
```

**Implementation:**
- Junction table `UserOrganization` with role per organization
- UI provides organization switcher dropdown
- All queries scoped to currently selected organization
- Metrics and permissions calculated per organization context

---

## 2. Organization Model

### 2.1 Organization Architecture

**Decision: Organization Mandatory for All Users**

**Model:**
```
Every user MUST belong to at least ONE organization
├─ Solo developers → Auto-create personal org on signup
├─ Team members → Invited to company organization
├─ Organization = billing unit, permission boundary
└─ All resources (repos, metrics) scoped to organization
```

**Signup Flow:**
```
1. User signs up via GitHub OAuth
2. System auto-creates personal organization
   - Name: "{username}'s Organization" or "PersonalDev"
   - User is assigned ADMIN role
   - Single-user organization
3. User can be invited to other organizations
4. User switches between orgs via UI
```

**Benefits:**
- Simplifies permission model (everything scoped to org)
- Matches GitHub's organizational model
- Clean billing boundaries (per-org subscriptions)
- Easier to reason about data ownership
- No special cases for "personal" vs "team" users

### 2.2 Organization Properties

```prisma
model Organization {
  id          String   @id @default(uuid())
  name        String   // "TechCorp", "John's Personal Dev"
  slug        String   @unique  // URL-friendly: "techcorp"
  githubId    Int?     @unique  // GitHub org ID (null for personal)
  
  // Subscription & Billing
  planType    String   @default("free")  // "free", "pro", "enterprise"
  planLimits  Json?    // { maxRepos: 10, maxMembers: 5 }
  
  // Settings
  settings    Json?    // Org preferences, feature flags
  
  // Metadata
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  members         UserOrganization[]
  repositories    Repository[]
  teamMetrics     TeamMetric[]
  notificationRules NotificationRule[]
  apiKeys         ApiKey[]
  auditLogs       AuditLog[]
}
```

### 2.3 Multi-Org User Experience

**Context Switching:**
```typescript
// User context includes current organization
interface UserContext {
  userId: string;
  currentOrgId: string;
  currentRole: Role;
  availableOrgs: Array<{
    orgId: string;
    orgName: string;
    role: Role;
  }>;
}

// All API requests include org context
GET /api/metrics/team
Headers: { "X-Organization-Id": "org-uuid" }
```

**Org Switcher UI:**
```
┌────────────────────────────┐
│ Current: TechCorp      ▼   │
├────────────────────────────┤
│ ✓ TechCorp (Admin)         │
│   ClientA (Member)         │
│   Personal Dev (Admin)     │
└────────────────────────────┘
```

### 2.4 Organization Lifecycle

**Member Leaves Organization:**
- User removed from `UserOrganization` table
- User loses access to org's data immediately
- User's historical metrics remain (attributed to org)
- User's commits/PRs still counted in org metrics
- Audit log records departure

**Organization Deletion:**
- Admin-only action
- Soft delete (mark as deleted, retain data 30 days)
- All webhooks unregistered
- All members notified
- Data export offered before deletion
- Hard delete after 30 days (GDPR compliance)

---

## 3. Repository & Ownership

### 3.1 Repository Ownership Model

**Decision: Organization-Level Repository Ownership**

**Architecture:**
```
Repositories belong to Organizations
├─ Only ORG ADMINs can connect repositories
├─ All ORG MEMBERs can view metrics for org's repos
├─ Personal repos = repos in personal organization
├─ One repository can only be connected once (globally)
└─ Webhook registered to organization's account
```

**Comparison of Options:**

| Aspect | Org-Level | User-Level | Hybrid |
|--------|-----------|------------|--------|
| Complexity | ⭐ Low | ⭐⭐⭐ High | ⭐⭐ Medium |
| Permission Model | Simple | Complex | Medium |
| Webhook Management | Clean | Messy | Mixed |
| Solo Dev Experience | Good | Better | Good |
| Team Experience | Excellent | Poor | Good |
| **CHOSEN** | ✅ YES | ❌ NO | ❌ NO |

**Rationale:**
- Simpler permission model
- Prevents duplicate webhook registrations
- Clear ownership (1 repo = 1 org = 1 webhook)
- Matches enterprise mental model
- Easier to prevent conflicts and race conditions

### 3.2 Repository Connection Flow

**For Team Organizations:**
```
1. Admin navigates to "Connect Repository"
2. Lists repositories from GitHub (via Octokit)
3. Admin selects repositories to connect
4. System:
   - Checks if repo already connected (globally unique)
   - Registers webhook with GitHub
   - Stores webhook ID and secret
   - Begins historical data import (90 days)
5. All org members can now see metrics
```

**For Solo Developers:**
```
1. Personal org created automatically on signup
2. User (as ADMIN of personal org) connects repos
3. Same flow as above, but single-user context
```

**For Freelancers/Consultants:**
```
Developer works for multiple clients:
├─ Personal Org: Personal projects tracked
├─ ClientA Org: ClientA projects tracked separately  
└─ ClientB Org: ClientB projects tracked separately

Each org sees only their repos' metrics
Developer switches orgs to see different dashboards
```

### 3.3 Duplicate Prevention

**Global Uniqueness Constraint:**
```prisma
model Repository {
  id       String @id @default(uuid())
  githubId BigInt @unique  // ⚠️ Prevents duplicate connections
  
  // If user tries to connect already-connected repo:
  // Error: "This repository is already connected to another organization"
}
```

**Conflict Resolution:**
- If repo is connected, show which org owns it (if user has access)
- Allow transfer between user's own organizations
- Require disconnect + reconnect for different org

### 3.4 Repository Properties

```prisma
model Repository {
  id          String   @id @default(uuid())
  orgId       String   // Owner organization
  
  // GitHub Info
  githubId    BigInt   @unique
  name        String   // "devmetrics-api"
  fullName    String   // "techcorp/devmetrics-api"
  description String?
  language    String?  // Primary language
  isPrivate   Boolean  @default(false)
  
  // Webhook
  webhookId   BigInt?  // GitHub webhook ID
  webhookSecret String? // For signature verification
  
  // Sync Status
  lastSyncedAt DateTime?
  syncStatus   String   @default("pending") // "pending", "syncing", "active", "error"
  
  // Settings
  aiReviewEnabled      Boolean @default(true)
  sensitivityLevel     String  @default("normal") // "normal", "sensitive", "confidential"
  webhookRateLimit     Int     @default(1000) // Events per hour
  
  // Metadata
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  stats       RepositoryStats[]
  events      Event[]
  commits     Commit[]
  pullRequests PullRequest[]
  issues      Issue[]
}
```

### 3.5 Repository Sensitivity Levels

**Purpose:** Control data exposure for sensitive codebases

| Level | AI Review | Commit Messages | Code Diffs | Use Case |
|-------|-----------|----------------|------------|----------|
| **normal** | ✅ Enabled | ✅ Stored | ✅ Analyzed | Standard repos |
| **sensitive** | ⚠️ Optional | ✅ Stored | ❌ Not analyzed | Internal tools |
| **confidential** | ❌ Disabled | ⚠️ Hashed only | ❌ Not stored | Crypto, finance |

Admin can configure per repository.

---

## 4. Notification System

### 4.1 Notification Architecture

**Decision: 2-Level Configurable Rules (Org + User)**

**Architecture:**
```
Organization-Level Rules (Created by ADMINs)
├─ Apply to all members by default
├─ Examples:
│  ├─ "PR waiting > 24 hours" → #dev-channel Slack
│  ├─ "Build fails on main" → #alerts Slack + Email
│  └─ "AI detects security issue" → Immediate alert
└─ Broadcast notifications

User-Level Preferences (Per MEMBER)
├─ Override org rules with personal preferences
├─ Examples:
│  ├─ "MY PR gets approved" → Email me
│  ├─ "Mute: Build failures on staging" → Don't notify
│  └─ "Someone reviews MY code" → In-app notification
└─ Personal control
```

### 4.2 Notification Types

**Supported Event Types:**
```typescript
enum NotificationType {
  // Pull Request Events
  PR_OPENED             = "pr_opened"
  PR_WAITING_REVIEW     = "pr_waiting_review"    // >X hours
  PR_APPROVED           = "pr_approved"
  PR_MERGED             = "pr_merged"
  PR_CHANGES_REQUESTED  = "pr_changes_requested"
  
  // Build & Deployment
  BUILD_FAILED          = "build_failed"
  BUILD_SUCCEEDED       = "build_succeeded"
  DEPLOYMENT_COMPLETED  = "deployment_completed"
  
  // AI & Quality
  AI_REVIEW_COMPLETE    = "ai_review_complete"
  AI_HIGH_RISK_PR       = "ai_high_risk_pr"       // Risk score > 80
  CODE_QUALITY_ISSUE    = "code_quality_issue"
  
  // Team & Sprint
  SPRINT_HEALTH_WARNING = "sprint_health_warning"  // Velocity drop
  BURNOUT_RISK_DETECTED = "burnout_risk_detected"
  TEAM_GOAL_ACHIEVED    = "team_goal_achieved"
  
  // System
  REPO_SYNC_FAILED      = "repo_sync_failed"
  WEBHOOK_ERROR         = "webhook_error"
}
```

### 4.3 Notification Channels

**Supported Delivery Channels:**
```typescript
enum NotificationChannel {
  IN_APP    = "in_app"    // Dashboard bell icon
  EMAIL     = "email"      // Email notification
  SLACK     = "slack"      // Slack webhook
  DISCORD   = "discord"    // Discord webhook (Phase 2)
  WEBHOOK   = "webhook"    // Custom webhook (Phase 2)
}
```

### 4.4 Notification Rule Schema

```prisma
model NotificationRule {
  id          String   @id @default(uuid())
  orgId       String
  createdBy   String   // User ID who created the rule
  
  // Rule Definition
  name        String   // "PR Review Reminder"
  type        String   // NotificationType enum value
  conditions  Json     // { "hours": 24, "repos": ["all"], "branch": "main" }
  channels    String[] // ["slack", "email"]
  
  // Target Configuration
  channelConfig Json?  // { "slackWebhook": "https://...", "emailRecipients": [...] }
  
  // Status
  isActive    Boolean  @default(true)
  
  // Metadata
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  logs        NotificationLog[]
}
```

**Example Conditions:**
```json
{
  "hours": 24,
  "repos": ["repo-uuid-1", "repo-uuid-2"],
  "branch": "main",
  "severity": "high",
  "excludeUsers": ["bot-user-id"]
}
```

### 4.5 User Notification Preferences

**User-Level Muting:**
```prisma
model User {
  // ... other fields
  
  notificationPreferences Json? @default("{}")
  // Example:
  // {
  //   "mutedTypes": ["build_failed", "pr_merged"],
  //   "mutedRepos": ["repo-uuid-1"],
  //   "quietHours": { "start": "22:00", "end": "08:00" },
  //   "preferredChannel": "email"
  // }
}
```

**Precedence:**
1. User mute overrides org rule
2. User quiet hours respected
3. Critical alerts (security) cannot be muted
4. User can enable notifications org didn't configure

### 4.6 Notification Delivery Log

```prisma
model NotificationLog {
  id           String   @id @default(uuid())
  ruleId       String
  
  // Delivery Info
  recipientId  String   // User ID
  channel      String   // Which channel used
  status       String   // "sent", "failed", "bounced"
  
  // Content
  title        String
  message      String   @db.Text
  metadata     Json?    // Event data, links, etc.
  
  // Timing
  triggeredAt  DateTime
  deliveredAt  DateTime?
  failedReason String?
  
  // Relations
  rule         NotificationRule @relation(fields: [ruleId], references: [id], onDelete: Cascade)
  
  @@index([recipientId, triggeredAt])
  @@index([ruleId, triggeredAt])
}
```

**Purpose:**
- Audit trail of all notifications
- Debug notification issues
- Track delivery rates
- Prevent notification spam (deduplicate)

---

## 5. AI Review System

### 5.1 AI Review Architecture

**Decision: Team-Visible with Privacy Controls**

**Visibility Model:**
```
Default: AI reviews visible to all org members in dashboard
├─ NOT automatically posted as GitHub comments
├─ Visible in DevMetrics dashboard only
├─ PR author can manually share review to GitHub
├─ Organization can disable per repository
└─ Sensitive repos can opt-out completely
```

**Rationale:**
- Transparency builds team trust in AI
- Not posting automatically avoids GitHub noise
- Respects sensitive codebases
- Team learns from each other's reviews
- Author controls public visibility

### 5.2 AI Review Process Flow

```
1. Pull Request Opened (GitHub webhook)
   ↓
2. Event queued for AI processing
   ↓
3. Worker fetches PR diff from GitHub API
   ↓
4. Send to Claude API for analysis
   ↓
5. Claude returns:
   - Potential bugs
   - Security issues
   - Code quality suggestions
   - Complexity score
   - Risk assessment
   ↓
6. Store in AIReview table
   ↓
7. Notify PR author (if configured)
   ↓
8. Display in dashboard (team-visible)
```

### 5.3 AI Review Schema

```prisma
model AIReview {
  id        String   @id @default(uuid())
  prId      String   @unique  // One review per PR
  
  // Analysis Results
  analysis     String   @db.Text  // Markdown formatted analysis
  suggestions  Json     // Array of specific suggestions
  riskScore    Int      // 0-100 (higher = riskier)
  complexity   String   // "low", "medium", "high", "very_high"
  
  // Categories
  bugsPotential       Int  @default(0)  // Count of potential bugs
  securityIssues      Int  @default(0)  // Count of security issues
  qualityIssues       Int  @default(0)  // Code quality problems
  performanceConcerns Int  @default(0)  // Performance issues
  
  // Metadata
  modelVersion String  @default("claude-3-sonnet")  // AI model used
  tokensUsed   Int?    // For cost tracking
  processingTime Int?  // Milliseconds
  
  // Visibility
  visibility         String  @default("team")  // "private", "team", "public"
  isSharedToGithub   Boolean @default(false)   // Author shared to GH?
  githubCommentId    BigInt? // If shared, comment ID
  
  // Timestamps
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  // Relations
  pullRequest  PullRequest @relation(fields: [prId], references: [id], onDelete: Cascade)
}
```

**Example Suggestions JSON:**
```json
[
  {
    "type": "bug",
    "severity": "high",
    "file": "src/auth/service.ts",
    "line": 42,
    "issue": "Potential null pointer exception",
    "suggestion": "Add null check before accessing user.email",
    "code": "if (user && user.email) { ... }"
  },
  {
    "type": "security",
    "severity": "critical",
    "file": "src/api/routes.ts",
    "line": 15,
    "issue": "SQL injection vulnerability",
    "suggestion": "Use parameterized queries",
    "code": "db.query('SELECT * FROM users WHERE id = $1', [userId])"
  }
]
```

### 5.4 AI Review Privacy Settings

**Repository-Level Control:**
```prisma
model Repository {
  aiReviewEnabled Boolean @default(true)  // Can disable entirely
  sensitivityLevel String @default("normal")
  
  // If sensitivityLevel = "confidential"
  // → AI review automatically disabled
  // → Code diffs not sent to external APIs
}
```

**User Preferences:**
```prisma
model User {
  notificationPreferences Json?
  // {
  //   "aiReviewNotifications": true,
  //   "aiReviewAutoShare": false  // Auto-post to GitHub?
  // }
}
```

### 5.5 AI Review Cost Management

**Token Usage Tracking:**
```typescript
// Track AI API costs
interface AIUsageStats {
  orgId: string;
  month: string;  // "2025-11"
  totalTokens: number;
  totalCost: number;  // USD
  reviewCount: number;
}

// Rate limiting per organization
interface OrgAILimits {
  planType: "free" | "pro" | "enterprise";
  monthlyTokenLimit: number;
  currentUsage: number;
}
```

**Cost Controls:**
- Free plan: 100 AI reviews/month
- Pro plan: 1,000 AI reviews/month
- Enterprise: Unlimited
- Large PRs (>500 lines) = 2x tokens
- Can disable AI for specific repos

---

## 6. Metrics & Aggregation

### 6.1 Metrics Architecture

**Decision: Organization-Scoped Metrics with Daily Aggregation**

**Principles:**
```
1. All metrics scoped to organization
2. Daily aggregation (calculated at midnight UTC)
3. Three metric levels:
   - Developer (per user, per org, per day)
   - Team (per org, per day)
   - Repository (per repo, per day)
4. Store aggregates, not raw calculations
5. Time-series optimized
```

**Why Organization-Scoped:**
- Clear boundaries (metrics = what org tracks)
- Privacy (employer doesn't see external work)
- Simpler queries (always filter by orgId)
- Matches permission model
- Cleaner for multi-org users

### 6.2 Developer Metrics Schema

```prisma
model DeveloperMetric {
  id        String   @id @default(uuid())
  userId    String
  orgId     String   // Scoped to organization!
  date      DateTime @db.Date
  
  // Commit Metrics
  commits        Int @default(0)
  linesAdded     Int @default(0)
  linesDeleted   Int @default(0)
  filesChanged   Int @default(0)
  
  // Pull Request Metrics
  prsOpened      Int @default(0)
  prsMerged      Int @default(0)
  prsClosed      Int @default(0)
  avgPrSize      Int @default(0)  // Lines changed
  
  // Review Metrics
  prsReviewed    Int @default(0)
  reviewComments Int @default(0)
  avgReviewTime  Int @default(0)  // Minutes
  
  // Issue Metrics
  issuesOpened   Int @default(0)
  issuesResolved Int @default(0)
  avgIssueTime   Int @default(0)  // Hours to resolve
  
  // Activity Patterns
  commitsOnWeekend Int @default(0)
  commitsLateNight Int @default(0)  // After 10 PM
  avgCommitTime    String?          // "14:30" (local time)
  
  // Quality Indicators
  avgCodeQuality   Float? // 0-100 from AI reviews
  bugIntroduced    Int @default(0)
  bugFixed         Int @default(0)
  
  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  user        User @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  
  @@unique([userId, orgId, date])
  @@index([orgId, date])
  @@index([userId, date])
}
```

**Multi-Org Example:**
```
Developer John on 2025-11-06:

Entry 1: (userId: john, orgId: orgA, date: 2025-11-06)
  - commits: 10 (to OrgA's repos)
  - prsOpened: 2 (in OrgA's repos)
  
Entry 2: (userId: john, orgId: orgB, date: 2025-11-06)
  - commits: 5 (to OrgB's repos)
  - prsOpened: 1 (in OrgB's repos)

John sees separate dashboards per org
External OSS contributions NOT tracked
```

### 6.3 Team Metrics Schema

```prisma
model TeamMetric {
  id       String   @id @default(uuid())
  orgId    String
  date     DateTime @db.Date
  
  // Velocity Metrics
  velocity           Int     @default(0)  // PRs merged or story points
  avgPrCycleTime     Int     @default(0)  // Hours from open to merge
  avgReviewTime      Int     @default(0)  // Hours from open to first review
  
  // Throughput
  totalCommits       Int     @default(0)
  totalPrsOpened     Int     @default(0)
  totalPrsMerged     Int     @default(0)
  totalIssuesClosed  Int     @default(0)
  
  // Quality Metrics
  buildSuccessRate   Float?  // 0-100%
  testCoverage       Float?  // 0-100%
  codeQualityScore   Float?  // 0-100 from AI
  
  // Deployment Metrics
  deploymentFrequency Int    @default(0)  // Deploys per day
  deploymentSuccessRate Float? // 0-100%
  meanTimeToRecovery Int?   // Minutes (MTTR)
  changeFailureRate  Float? // 0-100%
  
  // Team Health
  activeContributors Int    @default(0)  // Unique committers
  prReviewCoverage   Float? // % PRs with >=2 reviews
  knowledgeDistribution Float? // Inverse of bus factor
  
  // Bottlenecks
  prQueueLength      Int    @default(0)  // Open PRs
  avgPrQueueTime     Int    @default(0)  // Hours waiting
  issueBacklog       Int    @default(0)  // Open issues
  
  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  
  @@unique([orgId, date])
  @@index([orgId, date])
}
```

### 6.4 Repository Stats Schema

```prisma
model RepositoryStats {
  id       String   @id @default(uuid())
  repoId   String
  date     DateTime @db.Date
  
  // Activity
  commits        Int @default(0)
  prsOpened      Int @default(0)
  prsMerged      Int @default(0)
  prsClosed      Int @default(0)
  issuesOpened   Int @default(0)
  issuesClosed   Int @default(0)
  
  // Contributors
  uniqueContributors Int @default(0)
  topContributor     String? // User ID
  
  // Code Changes
  linesAdded     Int @default(0)
  linesDeleted   Int @default(0)
  filesChanged   Int @default(0)
  
  // Stars & Engagement (if public)
  stars          Int?
  forks          Int?
  watchers       Int?
  
  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  repository  Repository @relation(fields: [repoId], references: [id], onDelete: Cascade)
  
  @@unique([repoId, date])
  @@index([repoId, date])
}
```

### 6.5 Aggregation Strategy

**Daily Aggregation Job:**
```typescript
// Runs at midnight UTC
async function aggregateDailyMetrics(date: Date) {
  const orgs = await getActiveOrganizations();
  
  for (const org of orgs) {
    // 1. Aggregate developer metrics
    await aggregateDeveloperMetrics(org.id, date);
    
    // 2. Aggregate team metrics
    await aggregateTeamMetrics(org.id, date);
    
    // 3. Aggregate repository stats
    await aggregateRepositoryStats(org.id, date);
  }
}

// Example: Developer metrics
async function aggregateDeveloperMetrics(orgId: string, date: Date) {
  const users = await getUsersInOrg(orgId);
  
  for (const user of users) {
    const commits = await countCommits(user.id, orgId, date);
    const prs = await countPRs(user.id, orgId, date);
    const reviews = await countReviews(user.id, orgId, date);
    
    await prisma.developerMetric.upsert({
      where: { userId_orgId_date: { userId: user.id, orgId, date } },
      create: { userId: user.id, orgId, date, commits, ... },
      update: { commits, ... }
    });
  }
}
```

**Real-Time vs Batch:**
- Real-time: Activity counts (commits, PRs)
- Batch: Calculated metrics (avg review time, velocity)
- Cache: 15-minute TTL for dashboard queries

---

## 7. Event Processing

### 7.1 Event Architecture

**Decision: 90-Day Raw Retention + Permanent Aggregates**

**Event Lifecycle:**
```
Day 0: Event received from GitHub webhook
  ↓
  Store in Event table (full payload)
  ↓
Day 0-90: Available for debugging, re-processing
  ↓
Day 90: Event aggregated into metrics
  ↓
  Delete raw event (keep only aggregates)
  ↓
Forever: Aggregated metrics retained
```

**What's Kept Forever:**
- ✅ Aggregated metrics (DeveloperMetric, TeamMetric)
- ✅ Pull Request records (metadata, not diffs)
- ✅ Issue records
- ✅ Commit records (metadata, not full diffs)
- ✅ AI Review results
- ❌ Raw event payloads (deleted after 90 days)

### 7.2 Event Schema

```prisma
model Event {
  id        String   @id @default(uuid())
  repoId    String
  
  // Event Classification
  type      String   // "push", "pull_request", "issues", "pull_request_review"
  action    String?  // "opened", "closed", "synchronize"
  githubId  BigInt   // GitHub event ID (for deduplication)
  
  // Actor
  authorId  String?  // User ID (if known)
  authorGithubId Int? // GitHub user ID
  
  // Payload
  payload   Json     // Full GitHub webhook payload
  
  // Processing Status
  processed Boolean  @default(false)
  processedAt DateTime?
  
  // Timestamps
  createdAt DateTime @default(now())
  receivedAt DateTime @default(now())  // When webhook received
  
  // Relations
  repository Repository @relation(fields: [repoId], references: [id], onDelete: Cascade)
  
  @@unique([githubId, repoId])  // Prevent duplicate events
  @@index([repoId, createdAt])
  @@index([createdAt])  // For cleanup job
  @@index([processed, createdAt])  // For processing queue
}
```

### 7.3 Event Processing Queue

**Architecture:**
```
GitHub → Webhook Endpoint → Redis Queue → Worker
                ↓
           Return 200 OK immediately
                
Worker Process:
1. Dequeue event
2. Parse and validate
3. Update relevant records (Commit, PR, Issue)
4. Trigger metric calculation
5. Send notifications if needed
6. Mark as processed
7. Retry on failure (3 attempts)
```

**Queue Configuration:**
```typescript
// Using Bull queue
const eventQueue = new Queue('webhook-events', {
  redis: REDIS_URL,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000  // 2s, 4s, 8s
    },
    removeOnComplete: 100,  // Keep last 100 completed
    removeOnFail: 500       // Keep last 500 failed
  }
});
```

### 7.4 Event Cleanup Strategy

**Daily Cleanup Job:**
```typescript
// Runs daily at 2 AM UTC
async function cleanupOldEvents() {
  const ninetyDaysAgo = subDays(new Date(), 90);
  
  // Count events to be deleted
  const count = await prisma.event.count({
    where: { createdAt: { lt: ninetyDaysAgo } }
  });
  
  console.log(`Cleaning up ${count} events older than 90 days`);
  
  // Delete in batches (prevent long-running transaction)
  const batchSize = 1000;
  let deleted = 0;
  
  while (deleted < count) {
    await prisma.event.deleteMany({
      where: { 
        createdAt: { lt: ninetyDaysAgo }
      },
      take: batchSize
    });
    deleted += batchSize;
  }
  
  console.log(`Cleanup complete: ${count} events deleted`);
}
```

### 7.5 Critical Event Retention

**Never Delete:**
```prisma
// These have their own tables, kept forever
model Commit {
  // Kept for 1 year minimum
  // Can extend based on org plan
}

model PullRequest {
  // Kept forever (metadata only, not diffs)
}

model Issue {
  // Kept forever
}

model AIReview {
  // Kept forever (for learning/improvement)
}
```

---

## 8. Security & Privacy

### 8.1 Token Encryption

**Decision: Application-Level AES-256-GCM Encryption**

**Architecture:**
```
User's GitHub Token → Encrypt → Store in DB
DB → Retrieve → Decrypt → Use for GitHub API
```

**Implementation:**
```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

function encryptToken(token: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decryptToken(encryptedToken: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedToken.split(':');
  
  const decipher = createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(ivHex, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

**Schema:**
```prisma
model User {
  // Tokens stored encrypted
  accessToken     String   // Encrypted GitHub OAuth token
  refreshToken    String?  // Encrypted refresh token
  tokenExpiresAt  DateTime?
  
  // Never log these fields
  // Never return in API responses
}
```

**Security Considerations:**
- Encryption key stored in environment variable (not in code)
- Rotation: Can re-encrypt all tokens with new key
- Key stored in secure secret management (AWS Secrets Manager, etc.)
- Tokens never logged, never in API responses
- Automatic token refresh before expiry

### 8.2 Audit Logging

**Decision: Comprehensive Audit Trail for Security & Compliance**

**Schema:**
```prisma
model AuditLog {
  id        String   @id @default(uuid())
  
  // Actor
  userId    String
  orgId     String?  // If action scoped to org
  
  // Action
  action    String   // "view_metrics", "connect_repo", "delete_data", "export_data"
  resource  String?  // "repository:uuid", "user:uuid", "metrics:team"
  
  // Details
  metadata  Json?    // Additional context
  // Example:
  // {
  //   "repoName": "devmetrics-api",
  //   "filters": { "startDate": "2025-01-01" },
  //   "recordsAffected": 150
  // }
  
  // Request Info
  ipAddress   String?
  userAgent   String?
  requestId   String?  // Correlate with logs
  
  // Outcome
  status      String   // "success", "failed", "unauthorized"
  errorMessage String?
  
  // Timestamp
  createdAt   DateTime @default(now())
  
  // Relations
  user        User @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization? @relation(fields: [orgId], references: [id], onDelete: Cascade)
  
  @@index([userId, createdAt])
  @@index([orgId, createdAt])
  @@index([action, createdAt])
  @@index([createdAt])  // For retention/cleanup
}
```

**Actions to Audit:**
```typescript
enum AuditAction {
  // Authentication
  USER_LOGIN = "user_login",
  USER_LOGOUT = "user_logout",
  USER_SIGNUP = "user_signup",
  TOKEN_REFRESH = "token_refresh",
  
  // Repository
  REPO_CONNECTED = "repo_connected",
  REPO_DISCONNECTED = "repo_disconnected",
  REPO_SETTINGS_CHANGED = "repo_settings_changed",
  
  // Data Access
  VIEW_TEAM_METRICS = "view_team_metrics",
  VIEW_USER_METRICS = "view_user_metrics",
  EXPORT_DATA = "export_data",
  
  // Organization
  ORG_CREATED = "org_created",
  ORG_DELETED = "org_deleted",
  USER_INVITED = "user_invited",
  USER_REMOVED = "user_removed",
  ROLE_CHANGED = "role_changed",
  
  // Sensitive Actions
  API_KEY_CREATED = "api_key_created",
  API_KEY_DELETED = "api_key_deleted",
  WEBHOOK_CONFIGURED = "webhook_configured",
  
  // GDPR
  DATA_EXPORT_REQUESTED = "data_export_requested",
  DATA_DELETION_REQUESTED = "data_deletion_requested",
  DATA_DELETED = "data_deleted",
}
```

**Audit Log Retention:**
- Standard: 1 year
- Compliance: 7 years (configurable per org)
- Critical security events: Never delete

### 8.3 GDPR Compliance

**Right to Access:**
```typescript
async function exportUserData(userId: string): Promise<UserDataExport> {
  return {
    personalInfo: await getUser(userId),
    organizations: await getUserOrganizations(userId),
    metrics: await getUserMetrics(userId),
    contributions: await getUserContributions(userId),
    notifications: await getUserNotifications(userId),
    auditLogs: await getUserAuditLogs(userId),
  };
}
```

**Right to be Forgotten:**
```typescript
async function deleteUserData(userId: string) {
  await prisma.$transaction(async (tx) => {
    // 1. Anonymize contributions (keep metrics, remove identity)
    await tx.commit.updateMany({
      where: { authorId: userId },
      data: { authorId: 'anonymous', authorName: 'Anonymous User' }
    });
    
    // 2. Delete personal data
    await tx.user.delete({ where: { id: userId } });
    
    // 3. Audit log the deletion
    await tx.auditLog.create({
      data: {
        userId: 'system',
        action: 'data_deleted',
        resource: `user:${userId}`,
        metadata: { reason: 'gdpr_deletion' }
      }
    });
  });
}
```

### 8.4 Repository Sensitivity Controls

**Schema:**
```prisma
model Repository {
  sensitivityLevel String @default("normal")  // "normal", "sensitive", "confidential"
  
  // Based on sensitivity:
  aiReviewEnabled      Boolean  // Auto-disabled for "confidential"
  storeCommitMessages  Boolean  // Optionally hash only
  allowExternalExport  Boolean  // Block API exports
}
```

**Sensitivity Implications:**

| Level | AI Review | Full Diffs | Commit Msgs | External API |
|-------|-----------|------------|-------------|--------------|
| normal | ✅ | ✅ | ✅ Stored | ✅ Allowed |
| sensitive | ⚠️ Optional | ❌ | ✅ Stored | ⚠️ Admin only |
| confidential | ❌ Disabled | ❌ | ⚠️ Hashed | ❌ Blocked |

---

## 9. Additional Entities

### 9.1 API Keys (External Integration)

**Purpose:** Allow external systems to access DevMetrics API

**Schema:**
```prisma
model ApiKey {
  id          String   @id @default(uuid())
  userId      String
  orgId       String   // Scoped to organization
  
  // Key Management
  name        String   // "Jenkins CI", "Mobile App", "Analytics Dashboard"
  keyHash     String   @unique  // bcrypt hash of actual key
  lastFour    String   // Last 4 chars for identification ("...x7Qa")
  
  // Permissions
  scopes      String[] // ["read:metrics", "write:webhooks", "read:repos"]
  
  // Rate Limiting
  rateLimit   Int      @default(100)  // Requests per minute
  
  // Usage Tracking
  lastUsedAt  DateTime?
  totalRequests Int    @default(0)
  
  // Lifecycle
  expiresAt   DateTime? // Optional expiration
  isActive    Boolean   @default(true)
  
  // Metadata
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  user        User @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  
  @@index([keyHash])
  @@index([userId])
  @@index([orgId])
}
```

**API Key Generation:**
```typescript
import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';

async function createApiKey(
  userId: string,
  orgId: string,
  name: string,
  scopes: string[]
): Promise<{ key: string; record: ApiKey }> {
  // Generate secure random key
  const key = `dm_${randomBytes(32).toString('base64url')}`;
  // Format: "dm_a7X9kL2mN4pQ..."
  
  // Hash for storage
  const keyHash = await bcrypt.hash(key, 10);
  const lastFour = key.slice(-4);
  
  // Store record
  const record = await prisma.apiKey.create({
    data: {
      userId,
      orgId,
      name,
      keyHash,
      lastFour,
      scopes
    }
  });
  
  // Return plain key ONCE (never stored again)
  return { key, record };
}
```

**Scopes:**
```typescript
enum ApiScope {
  // Read Operations
  READ_METRICS = "read:metrics",
  READ_REPOS = "read:repos",
  READ_TEAM = "read:team",
  
  // Write Operations
  WRITE_WEBHOOKS = "write:webhooks",
  WRITE_NOTIFICATIONS = "write:notifications",
  
  // Admin
  ADMIN_ORG = "admin:org",
}
```

### 9.2 Webhook Signatures (Security)

**Purpose:** Verify webhook authenticity

**Schema:**
```prisma
model Repository {
  webhookId     BigInt?  // GitHub webhook ID
  webhookSecret String?  // HMAC secret for verification
}
```

**Verification:**
```typescript
import { createHmac } from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const expected = `sha256=${hmac.digest('hex')}`;
  
  // Timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}
```

### 9.3 User Preferences

**Schema:**
```prisma
model User {
  // ... other fields
  
  preferences Json? @default("{}")
  // Structure:
  // {
  //   "theme": "dark" | "light" | "system",
  //   "timezone": "America/Los_Angeles",
  //   "language": "en",
  //   "emailNotifications": true,
  //   "dashboardLayout": ["velocity", "pr_times", "commits"],
  //   "defaultOrg": "org-uuid",
  //   "quietHours": {
  //     "enabled": true,
  //     "start": "22:00",
  //     "end": "08:00"
  //   },
  //   "privacyMode": false  // Hide from team leaderboards
  // }
}
```

### 9.4 Session Management

**Schema:**
```prisma
model User {
  // ... other fields
  
  lastLoginAt   DateTime?
  lastLoginIp   String?
  loginCount    Int       @default(0)
}

// Sessions stored in Redis, not DB (for performance)
// Format: session:{userId}:{sessionId}
// TTL: 7 days (configurable)
```

---

## 10. Performance & Scale

### 10.1 Indexing Strategy

**High-Traffic Query Patterns:**

1. **Org's Repositories**
   ```sql
   SELECT * FROM repositories WHERE org_id = ?
   ```
   Index: `@@index([orgId])`

2. **Recent Commits by Repository**
   ```sql
   SELECT * FROM commits WHERE repo_id = ? ORDER BY created_at DESC
   ```
   Index: `@@index([repoId, createdAt])`

3. **User's Metrics for Date Range**
   ```sql
   SELECT * FROM developer_metrics 
   WHERE user_id = ? AND org_id = ? AND date BETWEEN ? AND ?
   ```
   Index: `@@unique([userId, orgId, date])`

4. **Open Pull Requests**
   ```sql
   SELECT * FROM pull_requests WHERE repo_id = ? AND state = 'open'
   ```
   Index: `@@index([repoId, state, createdAt])`

5. **Unprocessed Events**
   ```sql
   SELECT * FROM events WHERE processed = false ORDER BY created_at
   ```
   Index: `@@index([processed, createdAt])`

**Composite Indexes:**
```prisma
// Most models include these
@@index([orgId])                    // Filter by org
@@index([createdAt])                // Time-series queries
@@index([orgId, createdAt])         // Org's time-series
@@index([userId, orgId, date])      // User metrics lookup
```

### 10.2 Partitioning Strategy (Future)

**When to Partition:**
- Events table > 10 million records
- Metrics tables > 5 million records per org
- Query performance degrades despite indexes

**Partition by Date (PostgreSQL):**
```sql
-- Partition Events table by month
CREATE TABLE events (
  id UUID PRIMARY KEY,
  created_at TIMESTAMP NOT NULL,
  -- ... other fields
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE events_2025_11 PARTITION OF events
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE TABLE events_2025_12 PARTITION OF events
  FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
```

**Partition by Org (Very Large Scale):**
```sql
-- For organizations with >1M events
-- Separate table per large org
CREATE TABLE events_org_{orgId} AS TABLE events;
```

### 10.3 Caching Strategy

**Redis Cache Layers:**

1. **User Sessions** (7 days TTL)
   ```
   session:{userId}:{sessionId} → JWT payload
   ```

2. **API Responses** (15 min TTL)
   ```
   api:metrics:team:{orgId}:{date} → Team metrics JSON
   api:metrics:user:{userId}:{orgId}:{date} → User metrics JSON
   ```

3. **GitHub Data** (30 min TTL)
   ```
   github:repos:{userId} → Available repositories list
   github:user:{githubId} → GitHub user profile
   ```

4. **Aggregated Counts** (1 hour TTL)
   ```
   count:repos:{orgId} → Repository count
   count:members:{orgId} → Member count
   ```

**Cache Invalidation:**
```typescript
// Invalidate on write operations
await prisma.repository.create({ ... });
await redis.del(`count:repos:${orgId}`);

// Invalidate related caches
await redis.del(`api:metrics:team:${orgId}:*`);
```

### 10.4 Query Optimization

**N+1 Prevention:**
```typescript
// BAD: N+1 query
const repos = await prisma.repository.findMany({ where: { orgId } });
for (const repo of repos) {
  const stats = await prisma.repositoryStats.findMany({ 
    where: { repoId: repo.id } 
  });
}

// GOOD: Single query with include
const repos = await prisma.repository.findMany({
  where: { orgId },
  include: {
    stats: {
      orderBy: { date: 'desc' },
      take: 30  // Last 30 days
    }
  }
});
```

**Pagination:**
```typescript
// Cursor-based (efficient for large datasets)
const commits = await prisma.commit.findMany({
  where: { repoId },
  take: 50,
  skip: cursor ? 1 : 0,
  cursor: cursor ? { id: cursor } : undefined,
  orderBy: { createdAt: 'desc' }
});
```

**Aggregation Queries:**
```typescript
// Use database aggregation
const stats = await prisma.commit.aggregate({
  where: { repoId, createdAt: { gte: startDate } },
  _sum: { linesAdded: true, linesDeleted: true },
  _count: { id: true }
});
```

### 10.5 Rate Limiting

**Application-Level:**
```typescript
// Using @fastify/rate-limit
fastify.register(rateLimit, {
  max: 100,          // 100 requests
  timeWindow: 60000  // per minute
});
```

**Per-User Rate Limits:**
```typescript
// Different limits per plan
const limits = {
  free: 100,
  pro: 1000,
  enterprise: 10000
};

// Stored in Redis
ratelimit:{userId}:{minute} → count
```

**Webhook Rate Limiting:**
```prisma
model Repository {
  webhookRateLimit Int @default(1000)  // Events per hour
  lastWebhookAt DateTime?
}
```

---

## 11. Complete Entity List

### 11.1 All Database Models (16 Total)

**Core User & Organization (3 models):**
1. ✅ **User** - User accounts and authentication
2. ✅ **Organization** - Companies/teams
3. ✅ **UserOrganization** - Many-to-many membership with roles

**Repository & Integration (1 model):**
4. ✅ **Repository** - Connected GitHub repositories

**Events & Activity (4 models):**
5. ✅ **Event** - Raw webhook events (90-day retention)
6. ✅ **Commit** - Git commit records
7. ✅ **PullRequest** - Pull request tracking
8. ✅ **Issue** - GitHub issue tracking

**Metrics & Analytics (3 models):**
9. ✅ **DeveloperMetric** - Per-user daily metrics
10. ✅ **TeamMetric** - Per-org daily metrics
11. ✅ **RepositoryStats** - Per-repo daily stats

**AI & Automation (1 model):**
12. ✅ **AIReview** - AI code review results

**Notifications (2 models):**
13. ✅ **NotificationRule** - Alert configuration
14. ✅ **NotificationLog** - Notification delivery log

**Security & Integration (2 models):**
15. ✅ **ApiKey** - External API access
16. ✅ **AuditLog** - Security and compliance audit trail

### 11.2 Model Relationships Diagram

```
User ─────┬───── UserOrganization ───── Organization
│         │                                  │
│         │                                  ├─── Repository
│         │                                  ├─── TeamMetric
│         │                                  ├─── NotificationRule
│         │                                  ├─── ApiKey
│         │                                  └─── AuditLog
│         │
│         ├───── DeveloperMetric
│         ├───── Commit (as author)
│         ├───── PullRequest (as author)
│         ├───── Issue (as author)
│         ├───── ApiKey
│         └───── AuditLog

Repository ─┬─── RepositoryStats
            ├─── Event
            ├─── Commit
            ├─── PullRequest
            └─── Issue

PullRequest ──── AIReview

NotificationRule ──── NotificationLog
```

---

## 12. Field Specifications

### 12.1 Common Patterns

**All models include:**
```prisma
id        String   @id @default(uuid())
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt  // Auto-updates on change
```

**GitHub ID Fields:**
```prisma
githubId  BigInt   @unique  // GitHub's numeric ID
// Note: BigInt because GitHub IDs can exceed JavaScript Number.MAX_SAFE_INTEGER
```

**Timestamp Fields:**
```prisma
// Use DateTime for most timestamps
createdAt DateTime @default(now())

// Use @db.Date for daily metrics (no time component)
date DateTime @db.Date

// Store all timestamps in UTC, convert for display
```

**JSON Fields:**
```prisma
// For flexible, schema-less data
settings Json?
metadata Json?

// Example contents:
// { "key": "value", "nested": { "data": [1, 2, 3] } }
```

### 12.2 Enum Definitions

```prisma
enum Role {
  ADMIN
  MEMBER
  VIEWER
}

enum PlanType {
  FREE
  PRO
  ENTERPRISE
}

enum PRState {
  OPEN
  CLOSED
  MERGED
}

enum IssueState {
  OPEN
  CLOSED
}

enum SyncStatus {
  PENDING    // Waiting to start
  SYNCING    // In progress
  ACTIVE     // Sync complete, receiving webhooks
  ERROR      // Sync failed
  PAUSED     // Manually paused
}

enum SensitivityLevel {
  NORMAL
  SENSITIVE
  CONFIDENTIAL
}

enum NotificationStatus {
  SENT
  FAILED
  BOUNCED
  PENDING
}
```

### 12.3 Unique Constraints

**Prevent Duplicates:**
```prisma
// User email (GitHub email)
email String @unique

// Organization slug (URL-friendly name)
slug String @unique

// Repository GitHub ID (prevent connecting same repo twice)
githubId BigInt @unique

// API key hash (each key unique)
keyHash String @unique

// Composite unique constraints:
@@unique([userId, orgId, date])  // One metric entry per day
@@unique([githubId, repoId])     // One event per GitHub ID per repo
```

### 12.4 Cascade Delete Rules

```prisma
// When organization deleted → Delete all related records
organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

// When user deleted → Anonymize contributions, delete personal data
// (Custom logic in application, not DB cascade)

// When repository disconnected → Delete all related data
repository Repository @relation(fields: [repoId], references: [id], onDelete: Cascade)
```

---

## 13. Relationships Map

### 13.1 One-to-Many Relationships

```
Organization → Users (via UserOrganization)
Organization → Repositories
Organization → TeamMetrics
Organization → NotificationRules
Organization → ApiKeys
Organization → AuditLogs

Repository → Commits
Repository → PullRequests
Repository → Issues
Repository → Events
Repository → RepositoryStats

User → DeveloperMetrics (scoped by org)
User → AuditLogs
User → ApiKeys

PullRequest → AIReview (one-to-one)

NotificationRule → NotificationLogs
```

### 13.2 Many-to-Many Relationships

```
User ↔ Organization
  via UserOrganization junction table
  with additional field: role
```

### 13.3 Optional vs Required Relations

**Required (not nullable):**
```prisma
orgId String  // Every repository MUST belong to an org
userId String  // Every metric MUST have a user
```

**Optional (nullable):**
```prisma
authorId String?  // Events might be from unknown users (webhooks)
githubId Int?     // Personal orgs don't have GitHub org ID
refreshToken String?  // Not all OAuth flows provide refresh tokens
```

---

## 14. Migration Strategy

### 14.1 Initial Migration (TASK-005)

**Steps:**
```bash
1. npx prisma init
   → Creates prisma/schema.prisma
   → Creates .env with DATABASE_URL

2. Define all 16 models in schema.prisma

3. npx prisma migrate dev --name init
   → Generates SQL migration
   → Applies to database
   → Creates prisma/migrations/YYYYMMDD_init/

4. npx prisma generate
   → Generates TypeScript Prisma Client
   → Type-safe database access

5. npx prisma studio
   → Opens GUI to view/edit data
```

### 14.2 Future Migrations

**Adding a Field:**
```prisma
// Add field to model
model User {
  phoneNumber String?  // New optional field
}
```
```bash
npx prisma migrate dev --name add_user_phone
```

**Adding a Table:**
```prisma
// Add new model
model Sprint {
  id String @id @default(uuid())
  name String
  // ...
}
```
```bash
npx prisma migrate dev --name add_sprint_table
```

**Changing Field Type:**
```prisma
// Change type (requires data migration if non-empty)
model User {
  age String  // was Int, now String
}
```
```bash
npx prisma migrate dev --name change_age_to_string
# May require manual SQL to convert existing data
```

### 14.3 Data Seeding

**Create seed script:**
```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create test organization
  const org = await prisma.organization.create({
    data: {
      name: 'Test Organization',
      slug: 'test-org',
      planType: 'PRO'
    }
  });
  
  // Create test user
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      githubId: 12345,
      // ...
    }
  });
  
  // Add user to org
  await prisma.userOrganization.create({
    data: {
      userId: user.id,
      orgId: org.id,
      role: 'ADMIN'
    }
  });
  
  console.log('✅ Seed data created');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Run seeding:**
```bash
npm run db:seed
```

---

## 15. Future Enhancements

### 15.1 Phase 2 Features (Not in MVP)

**Teams/Groups:**
```prisma
model Team {
  id     String @id @default(uuid())
  orgId  String
  name   String
  members String[]  // User IDs
  // ...
}
```

**Sprints:**
```prisma
model Sprint {
  id          String   @id @default(uuid())
  orgId       String
  name        String
  startDate   DateTime
  endDate     DateTime
  velocityGoal Int
  status      String  // "planning", "active", "completed"
  // ...
}
```

**Custom Dashboards:**
```prisma
model Dashboard {
  id       String @id @default(uuid())
  userId   String
  name     String
  layout   Json  // Widget configuration
  isPublic Boolean
  // ...
}
```

### 15.2 Scalability Enhancements

**Read Replicas:**
- Master: Write operations
- Replicas: Read-only queries (metrics, dashboards)
- Prisma supports replica configuration

**TimescaleDB Extension:**
```sql
-- Convert metrics tables to hypertables (time-series optimization)
SELECT create_hypertable('developer_metrics', 'date');
SELECT create_hypertable('team_metrics', 'date');
SELECT create_hypertable('repository_stats', 'date');
```

**Table Partitioning:**
- Partition large tables by date or organization
- Improves query performance and maintenance

**Elasticsearch Integration:**
```prisma
// For full-text search of commits, PRs, issues
// Sync data from Postgres to Elasticsearch
```

### 15.3 Advanced Features

**Machine Learning Models:**
```prisma
model MLPrediction {
  id          String @id @default(uuid())
  type        String  // "sprint_completion", "burnout_risk"
  targetId    String  // User or org ID
  prediction  Json    // Model output
  confidence  Float
  createdAt   DateTime
}
```

**Custom Metrics:**
```prisma
model CustomMetric {
  id          String @id @default(uuid())
  orgId       String
  name        String
  formula     String  // "commits + prs * 2"
  aggregation String  // "sum", "avg", "count"
}
```

**Integrations:**
```prisma
model Integration {
  id          String @id @default(uuid())
  orgId       String
  type        String  // "jira", "slack", "discord", "linear"
  credentials Json    // Encrypted
  config      Json
  isActive    Boolean
}
```

---

## 16. Implementation Checklist

### 16.1 TASK-005 Deliverables

**Must Complete:**
- [ ] Create `prisma/schema.prisma` with all 16 models
- [ ] Define all relationships and indexes
- [ ] Run `npx prisma migrate dev --name init`
- [ ] Run `npx prisma generate`
- [ ] Verify with `npx prisma studio`
- [ ] Create seed data script
- [ ] Test database connection
- [ ] Document schema decisions (this document)

### 16.2 Validation Steps

**Test Queries:**
```typescript
// 1. Create organization
const org = await prisma.organization.create({ ... });

// 2. Create user
const user = await prisma.user.create({ ... });

// 3. Add user to org
const membership = await prisma.userOrganization.create({ ... });

// 4. Connect repository
const repo = await prisma.repository.create({ ... });

// 5. Create metrics
const metrics = await prisma.developerMetric.create({ ... });

// 6. Verify relationships
const orgWithRepos = await prisma.organization.findUnique({
  where: { id: org.id },
  include: { repositories: true, members: true }
});
```

### 16.3 Performance Testing

**Benchmark Queries:**
```sql
-- Test index effectiveness
EXPLAIN ANALYZE 
SELECT * FROM developer_metrics 
WHERE user_id = '...' AND org_id = '...' AND date BETWEEN '2025-01-01' AND '2025-12-31';

-- Check index usage
SELECT * FROM pg_stat_user_indexes 
WHERE schemaname = 'public';
```

---

## 17. Conclusion

### 17.1 Key Design Decisions Summary

1. ✅ **Organization-Centric** - All data scoped to organizations
2. ✅ **3-Tier Roles** - Admin/Member/Viewer (simple and extensible)
3. ✅ **Org-Level Repos** - Clean ownership, no duplicates
4. ✅ **90-Day Events** - Balance between debugging and storage
5. ✅ **Team-Visible AI** - Transparent but with privacy controls
6. ✅ **Encrypted Tokens** - Application-level AES-256-GCM
7. ✅ **Comprehensive Audit** - Security and compliance ready
8. ✅ **Performance-Focused** - Strategic indexes and caching
9. ✅ **GDPR Compliant** - Data export and deletion support
10. ✅ **Extensible** - Easy to add features without breaking changes

### 17.2 Schema Statistics

- **Total Models**: 16
- **Core Entities**: 11
- **Security/Audit**: 2
- **Integration**: 2
- **Notifications**: 2
- **Relationships**: 25+
- **Indexes**: 50+
- **Unique Constraints**: 15+

### 17.3 Next Steps

**Immediate (TASK-005):**
1. Implement Prisma schema based on this spec
2. Run initial migration
3. Create seed data
4. Verify with Prisma Studio

**Follow-Up (TASK-006+):**
1. Create Prisma client service
2. Implement repository pattern
3. Build API endpoints
4. Add caching layer
5. Set up monitoring

---

## Appendix

### A. Glossary

**Organization**: A team, company, or individual account that owns repositories
**Member**: A user belonging to an organization with specific role
**Repository**: A connected GitHub repository being tracked
**Event**: Raw webhook payload from GitHub
**Metric**: Aggregated statistics calculated from events
**AI Review**: Automated code review performed by Claude AI
**Audit Log**: Record of user actions for security/compliance

### B. Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/devmetrics"

# Redis
REDIS_URL="redis://localhost:6379"

# Security
TOKEN_ENCRYPTION_KEY="64-character-hex-string"
JWT_SECRET="random-secret-string"

# GitHub
GITHUB_CLIENT_ID="github-oauth-client-id"
GITHUB_CLIENT_SECRET="github-oauth-client-secret"
GITHUB_WEBHOOK_SECRET="webhook-secret"

# Anthropic AI
ANTHROPIC_API_KEY="sk-ant-..."
```

### C. References

- Prisma Documentation: https://www.prisma.io/docs
- PostgreSQL Best Practices: https://wiki.postgresql.org/wiki/Don't_Do_This
- GitHub Webhooks: https://docs.github.com/en/webhooks
- Anthropic API: https://docs.anthropic.com/

---

**Document Version**: 1.0  
**Last Updated**: November 6, 2025  
**Status**: ✅ APPROVED FOR IMPLEMENTATION  
**Next Review**: After TASK-005 completion

