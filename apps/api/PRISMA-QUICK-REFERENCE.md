# Prisma Quick Reference Guide

Quick reference for working with the DevMetrics database schema.

---

## 🚀 Quick Start Commands

```bash
# Generate Prisma Client (after schema changes)
npm run db:generate

# Open Prisma Studio (visual database browser)
npm run db:studio

# Seed database with test data
npm run db:seed

# Reset database (⚠️ DESTROYS ALL DATA)
npm run db:reset

# Create new migration
npx prisma migrate dev --name migration_name

# Deploy migrations to production
npx prisma migrate deploy

# Verify schema
npx ts-node verify-schema.ts
```

---

## 📋 Database Models (16 Total)

### Core Models

```typescript
User; // GitHub users with OAuth tokens
Organization; // Companies/teams
UserOrganization; // User-org membership with roles
```

### Repository Models

```typescript
Repository; // Connected GitHub repos
RepositoryStats; // Daily repo statistics
```

### Activity Models

```typescript
Event; // Raw webhook events (90-day retention)
Commit; // Git commits
PullRequest; // Pull requests
Issue; // GitHub issues
```

### Metrics Models

```typescript
DeveloperMetric; // Per-user daily metrics (org-scoped)
TeamMetric; // Per-org daily metrics
AIReview; // AI code review results
```

### Notification Models

```typescript
NotificationRule; // Alert configurations
NotificationLog; // Notification delivery logs
```

### Security Models

```typescript
ApiKey; // External API access keys
AuditLog; // Security audit trail
```

---

## 🔑 Common Query Patterns

### Get Organization with Repos

```typescript
const org = await prisma.organization.findUnique({
  where: { id: orgId },
  include: {
    repositories: true,
    members: {
      include: { user: true },
    },
  },
});
```

### Get User's Metrics

```typescript
const metrics = await prisma.developerMetric.findMany({
  where: {
    userId: userId,
    orgId: orgId,
    date: {
      gte: startDate,
      lte: endDate,
    },
  },
  orderBy: { date: 'desc' },
});
```

### Get Repository with Stats

```typescript
const repo = await prisma.repository.findUnique({
  where: { id: repoId },
  include: {
    stats: {
      orderBy: { date: 'desc' },
      take: 30, // Last 30 days
    },
  },
});
```

### Get Pull Request with AI Review

```typescript
const pr = await prisma.pullRequest.findUnique({
  where: { id: prId },
  include: {
    aiReviews: true,
    repository: true,
    author: true,
  },
});
```

### Check User Organization Membership

```typescript
const membership = await prisma.userOrganization.findUnique({
  where: {
    userId_orgId: {
      userId: userId,
      orgId: orgId,
    },
  },
});
```

---

## 🎭 Enums

```typescript
// User roles in organizations
enum Role {
  ADMIN   // Full control
  MEMBER  // Standard access
  VIEWER  // Read-only
}

// Organization plans
enum PlanType {
  FREE
  PRO
  ENTERPRISE
}

// Pull request states
enum PRState {
  OPEN
  CLOSED
  MERGED
}

// Issue states
enum IssueState {
  OPEN
  CLOSED
}

// Repository sync status
enum SyncStatus {
  PENDING
  SYNCING
  ACTIVE
  ERROR
  PAUSED
}

// Repository sensitivity
enum SensitivityLevel {
  NORMAL        // Full AI analysis
  SENSITIVE     // Limited analysis
  CONFIDENTIAL  // No AI analysis
}

// Notification status
enum NotificationStatus {
  SENT
  FAILED
  BOUNCED
  PENDING
}
```

---

## 🔐 Security Fields

### Encrypted Tokens

```typescript
user.accessToken; // Encrypted GitHub OAuth token
user.refreshToken; // Encrypted refresh token
```

### API Keys

```typescript
apiKey.keyHash; // bcrypt hash (never store plain key)
apiKey.lastFour; // Last 4 chars for display only
```

### Webhook Secrets

```typescript
repository.webhookSecret; // For HMAC signature verification
```

---

## 📊 Metric Fields

### Developer Metrics (Daily)

```typescript
{
  (commits,
    linesAdded,
    linesDeleted,
    filesChanged,
    prsOpened,
    prsMerged,
    prsReviewed,
    issuesOpened,
    issuesResolved,
    avgCodeQuality,
    bugIntroduced,
    bugFixed);
}
```

### Team Metrics (Daily)

```typescript
{
  (velocity,
    avgPrCycleTime,
    avgReviewTime,
    totalCommits,
    totalPrsMerged,
    buildSuccessRate,
    codeQualityScore,
    activeContributors,
    prQueueLength);
}
```

### Repository Stats (Daily)

```typescript
{
  (commits,
    prsOpened,
    prsMerged,
    issuesOpened,
    issuesClosed,
    uniqueContributors,
    linesAdded,
    linesDeleted,
    stars,
    forks,
    watchers);
}
```

---

## 🔍 Useful Queries

### Count Users in Organization

```typescript
const count = await prisma.userOrganization.count({
  where: { orgId },
});
```

### Get Open PRs for Repository

```typescript
const openPRs = await prisma.pullRequest.findMany({
  where: {
    repoId,
    state: PRState.OPEN,
  },
  orderBy: { createdAt: 'desc' },
});
```

### Get Recent Commits

```typescript
const commits = await prisma.commit.findMany({
  where: { repoId },
  orderBy: { committedAt: 'desc' },
  take: 50,
  include: { author: true },
});
```

### Get Team Velocity Trend

```typescript
const trend = await prisma.teamMetric.findMany({
  where: {
    orgId,
    date: {
      gte: thirtyDaysAgo,
    },
  },
  orderBy: { date: 'asc' },
  select: {
    date: true,
    velocity: true,
    avgPrCycleTime: true,
  },
});
```

### Find High-Risk PRs

```typescript
const riskyPRs = await prisma.pullRequest.findMany({
  where: {
    state: PRState.OPEN,
    aiReviews: {
      some: {
        riskScore: { gte: 70 },
      },
    },
  },
  include: {
    aiReviews: true,
    repository: true,
  },
});
```

---

## 🏗️ Creating Records

### Create User

```typescript
const user = await prisma.user.create({
  data: {
    githubId: BigInt(123456),
    email: 'user@example.com',
    name: 'John Doe',
    accessToken: encryptedToken,
    preferences: {
      theme: 'dark',
      timezone: 'UTC',
    },
  },
});
```

### Add User to Organization

```typescript
await prisma.userOrganization.create({
  data: {
    userId: user.id,
    orgId: org.id,
    role: Role.MEMBER,
  },
});
```

### Create Repository

```typescript
const repo = await prisma.repository.create({
  data: {
    orgId: org.id,
    githubId: BigInt(789012),
    name: 'my-repo',
    fullName: 'org/my-repo',
    isPrivate: true,
    language: 'TypeScript',
    syncStatus: SyncStatus.PENDING,
  },
});
```

### Create AI Review

```typescript
const review = await prisma.aIReview.create({
  data: {
    prId: pullRequest.id,
    analysis: 'AI analysis...',
    suggestions: [...],
    riskScore: 45,
    complexity: 'medium',
    bugsPotential: 2,
    securityIssues: 0
  }
});
```

---

## 🔄 Updating Records

### Update User Preferences

```typescript
await prisma.user.update({
  where: { id: userId },
  data: {
    preferences: {
      theme: 'light',
      notifications: true,
    },
  },
});
```

### Update Repository Sync Status

```typescript
await prisma.repository.update({
  where: { id: repoId },
  data: {
    syncStatus: SyncStatus.ACTIVE,
    lastSyncedAt: new Date(),
  },
});
```

### Merge Pull Request

```typescript
await prisma.pullRequest.update({
  where: { id: prId },
  data: {
    state: PRState.MERGED,
    mergedAt: new Date(),
  },
});
```

---

## 🗑️ Deleting Records

### Remove User from Organization

```typescript
await prisma.userOrganization.delete({
  where: {
    userId_orgId: {
      userId,
      orgId,
    },
  },
});
```

### Disconnect Repository (Cascade Deletes)

```typescript
// This will cascade delete:
// - RepositoryStats
// - Events
// - Commits
// - PullRequests
// - Issues
await prisma.repository.delete({
  where: { id: repoId },
});
```

---

## 🔎 Aggregations

### Count Commits by User

```typescript
const stats = await prisma.commit.groupBy({
  by: ['authorId'],
  where: {
    repoId,
    committedAt: { gte: startDate },
  },
  _count: { id: true },
  _sum: { additions: true, deletions: true },
});
```

### Average Code Quality

```typescript
const avg = await prisma.developerMetric.aggregate({
  where: {
    userId,
    date: { gte: startDate },
  },
  _avg: { avgCodeQuality: true },
});
```

---

## 🚨 Error Handling

```typescript
try {
  const user = await prisma.user.create({ data });
} catch (error) {
  if (error.code === 'P2002') {
    // Unique constraint violation
    console.error('User already exists');
  } else if (error.code === 'P2003') {
    // Foreign key constraint violation
    console.error('Referenced record does not exist');
  } else {
    console.error('Database error:', error);
  }
}
```

---

## 💡 Best Practices

### 1. Always Use Transactions for Related Changes

```typescript
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  await tx.userOrganization.create({
    data: { userId: user.id, orgId, role },
  });
});
```

### 2. Use Select to Limit Fields

```typescript
// Only fetch needed fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
  },
});
```

### 3. Paginate Large Result Sets

```typescript
const commits = await prisma.commit.findMany({
  take: 50,
  skip: page * 50,
  orderBy: { committedAt: 'desc' },
});
```

### 4. Use Cursor-Based Pagination for Performance

```typescript
const commits = await prisma.commit.findMany({
  take: 50,
  cursor: lastId ? { id: lastId } : undefined,
  skip: lastId ? 1 : 0,
  orderBy: { committedAt: 'desc' },
});
```

---

## 📚 Additional Resources

- **Prisma Docs**: https://www.prisma.io/docs
- **Schema Reference**: https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference
- **Client API**: https://www.prisma.io/docs/reference/api-reference/prisma-client-reference
- **Database Spec**: `DATABASE-SCHEMA-RESEARCH-SPEC.md`
- **Completion Summary**: `TASK-005-COMPLETION-SUMMARY.md`

---

**Last Updated**: November 6, 2025  
**Prisma Version**: 6.18.0  
**Database**: PostgreSQL 14
