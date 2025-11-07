/**
 * Prisma Seed Script
 * Seeds the database with initial test data for development
 */

import { PrismaClient, Role, PlanType, SyncStatus, SensitivityLevel } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Simple encryption for demo purposes (in production, use proper encryption)
function encryptToken(token: string): string {
  return Buffer.from(token).toString('base64');
}

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // Clean up existing data
  console.log('🧹 Cleaning up existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.notificationLog.deleteMany();
  await prisma.notificationRule.deleteMany();
  await prisma.aIReview.deleteMany();
  await prisma.developerMetric.deleteMany();
  await prisma.teamMetric.deleteMany();
  await prisma.repositoryStats.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.pullRequest.deleteMany();
  await prisma.commit.deleteMany();
  await prisma.event.deleteMany();
  await prisma.repository.deleteMany();
  await prisma.userOrganization.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Cleanup complete\n');

  // Create Test Users
  console.log('👤 Creating test users...');

  const user1 = await prisma.user.create({
    data: {
      githubId: BigInt(123456),
      email: 'alice@techcorp.com',
      name: 'Alice Johnson',
      avatarUrl: 'https://avatars.githubusercontent.com/u/123456',
      accessToken: encryptToken('gho_test_token_alice_' + crypto.randomBytes(16).toString('hex')),
      refreshToken: encryptToken(
        'ghr_test_refresh_alice_' + crypto.randomBytes(16).toString('hex')
      ),
      tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      preferences: {
        theme: 'dark',
        timezone: 'America/Los_Angeles',
        language: 'en',
      },
      notificationPreferences: {
        emailNotifications: true,
        quietHours: { start: '22:00', end: '08:00' },
      },
      lastLoginAt: new Date(),
      lastLoginIp: '192.168.1.100',
      loginCount: 5,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      githubId: BigInt(789012),
      email: 'bob@techcorp.com',
      name: 'Bob Smith',
      avatarUrl: 'https://avatars.githubusercontent.com/u/789012',
      accessToken: encryptToken('gho_test_token_bob_' + crypto.randomBytes(16).toString('hex')),
      lastLoginAt: new Date(),
      loginCount: 3,
    },
  });

  const user3 = await prisma.user.create({
    data: {
      githubId: BigInt(345678),
      email: 'charlie@freelance.dev',
      name: 'Charlie Developer',
      avatarUrl: 'https://avatars.githubusercontent.com/u/345678',
      accessToken: encryptToken('gho_test_token_charlie_' + crypto.randomBytes(16).toString('hex')),
      lastLoginAt: new Date(),
      loginCount: 10,
    },
  });

  console.log(`✅ Created ${3} test users\n`);

  // Create Test Organizations
  console.log('🏢 Creating test organizations...');

  const techCorp = await prisma.organization.create({
    data: {
      name: 'TechCorp',
      slug: 'techcorp',
      githubId: BigInt(999001),
      planType: PlanType.PRO,
      planLimits: {
        maxRepos: 50,
        maxMembers: 25,
        maxAIReviews: 1000,
      },
      settings: {
        defaultBranch: 'main',
        requirePRReviews: true,
        autoAIReview: true,
      },
    },
  });

  const startupInc = await prisma.organization.create({
    data: {
      name: 'Startup Inc',
      slug: 'startup-inc',
      githubId: BigInt(999002),
      planType: PlanType.FREE,
      planLimits: {
        maxRepos: 5,
        maxMembers: 5,
        maxAIReviews: 100,
      },
    },
  });

  const personalOrg = await prisma.organization.create({
    data: {
      name: "Charlie's Personal Dev",
      slug: 'charlie-personal',
      githubId: null, // Personal org, no GitHub org
      planType: PlanType.FREE,
      planLimits: {
        maxRepos: 5,
        maxMembers: 1,
        maxAIReviews: 50,
      },
    },
  });

  console.log(`✅ Created ${3} test organizations\n`);

  // Create User-Organization Relationships
  console.log('🔗 Creating user-organization relationships...');

  await prisma.userOrganization.createMany({
    data: [
      { userId: user1.id, orgId: techCorp.id, role: Role.ADMIN },
      { userId: user2.id, orgId: techCorp.id, role: Role.MEMBER },
      { userId: user1.id, orgId: startupInc.id, role: Role.VIEWER },
      { userId: user3.id, orgId: personalOrg.id, role: Role.ADMIN },
    ],
  });

  console.log(`✅ Created ${4} user-organization relationships\n`);

  // Create Test Repositories
  console.log('📦 Creating test repositories...');

  const repo1 = await prisma.repository.create({
    data: {
      orgId: techCorp.id,
      githubId: BigInt(111001),
      name: 'devmetrics-api',
      fullName: 'techcorp/devmetrics-api',
      description: 'DevMetrics Backend API',
      language: 'TypeScript',
      isPrivate: true,
      webhookId: BigInt(555001),
      webhookSecret: crypto.randomBytes(32).toString('hex'),
      syncStatus: SyncStatus.ACTIVE,
      lastSyncedAt: new Date(),
      aiReviewEnabled: true,
      sensitivityLevel: SensitivityLevel.NORMAL,
      webhookRateLimit: 1000,
    },
  });

  const repo2 = await prisma.repository.create({
    data: {
      orgId: techCorp.id,
      githubId: BigInt(111002),
      name: 'devmetrics-frontend',
      fullName: 'techcorp/devmetrics-frontend',
      description: 'DevMetrics React Frontend',
      language: 'TypeScript',
      isPrivate: true,
      syncStatus: SyncStatus.ACTIVE,
      lastSyncedAt: new Date(),
      aiReviewEnabled: true,
      sensitivityLevel: SensitivityLevel.NORMAL,
    },
  });

  const repo3 = await prisma.repository.create({
    data: {
      orgId: personalOrg.id,
      githubId: BigInt(111003),
      name: 'personal-project',
      fullName: 'charlie/personal-project',
      description: 'Personal side project',
      language: 'Python',
      isPrivate: false,
      syncStatus: SyncStatus.ACTIVE,
      lastSyncedAt: new Date(),
      aiReviewEnabled: false,
      sensitivityLevel: SensitivityLevel.NORMAL,
    },
  });

  const repo4 = await prisma.repository.create({
    data: {
      orgId: techCorp.id,
      githubId: BigInt(111004),
      name: 'mobile-app',
      fullName: 'techcorp/mobile-app',
      description: 'React Native mobile application',
      language: 'TypeScript',
      isPrivate: true,
      webhookId: BigInt(555002),
      webhookSecret: crypto.randomBytes(32).toString('hex'),
      syncStatus: SyncStatus.ACTIVE,
      lastSyncedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      aiReviewEnabled: true,
      sensitivityLevel: SensitivityLevel.NORMAL,
    },
  });

  const repo5 = await prisma.repository.create({
    data: {
      orgId: techCorp.id,
      githubId: BigInt(111005),
      name: 'infrastructure',
      fullName: 'techcorp/infrastructure',
      description: 'Infrastructure as Code - Terraform configs',
      language: 'HCL',
      isPrivate: true,
      syncStatus: SyncStatus.ACTIVE,
      lastSyncedAt: new Date(),
      aiReviewEnabled: false,
      sensitivityLevel: SensitivityLevel.SENSITIVE,
    },
  });

  const repo6 = await prisma.repository.create({
    data: {
      orgId: techCorp.id,
      githubId: BigInt(111006),
      name: 'documentation',
      fullName: 'techcorp/documentation',
      description: 'Product and API documentation',
      language: 'Markdown',
      isPrivate: false,
      syncStatus: SyncStatus.ACTIVE,
      lastSyncedAt: new Date(),
      aiReviewEnabled: false,
      sensitivityLevel: SensitivityLevel.NORMAL,
    },
  });

  const repo7 = await prisma.repository.create({
    data: {
      orgId: startupInc.id,
      githubId: BigInt(111007),
      name: 'payment-service',
      fullName: 'startup-inc/payment-service',
      description: 'Microservice handling payments',
      language: 'Go',
      isPrivate: true,
      syncStatus: SyncStatus.SYNCING,
      lastSyncedAt: new Date(Date.now() - 10 * 60 * 1000),
      aiReviewEnabled: true,
      sensitivityLevel: SensitivityLevel.CONFIDENTIAL,
    },
  });

  const repo8 = await prisma.repository.create({
    data: {
      orgId: startupInc.id,
      githubId: BigInt(111008),
      name: 'legacy-monolith',
      fullName: 'startup-inc/legacy-monolith',
      description: 'Old monolithic application',
      language: 'Java',
      isPrivate: true,
      syncStatus: SyncStatus.ERROR,
      lastSyncedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      aiReviewEnabled: false,
      sensitivityLevel: SensitivityLevel.NORMAL,
    },
  });

  const repo9 = await prisma.repository.create({
    data: {
      orgId: personalOrg.id,
      githubId: BigInt(111009),
      name: 'blog',
      fullName: 'charlie/blog',
      description: 'Personal tech blog',
      language: 'JavaScript',
      isPrivate: false,
      syncStatus: SyncStatus.PENDING,
      aiReviewEnabled: false,
      sensitivityLevel: SensitivityLevel.NORMAL,
    },
  });

  console.log(`✅ Created ${9} test repositories\n`);

  // Create Test Commits
  console.log('💾 Creating test commits...');

  // Helper function to create commits with specific time patterns
  const generateCommitData = () => {
    const commitData = [];
    const now = Date.now();

    // Week 1 - Heavy activity
    commitData.push(
      {
        repoId: repo1.id,
        githubId: crypto.randomBytes(20).toString('hex'),
        sha: crypto.randomBytes(20).toString('hex'),
        message: 'feat: Add user authentication endpoint',
        authorId: user1.id,
        authorGithubId: user1.githubId,
        authorName: user1.name,
        authorEmail: user1.email,
        additions: 150,
        deletions: 20,
        committedAt: new Date(now - 2 * 24 * 60 * 60 * 1000), // 2 days ago, afternoon
      },
      {
        repoId: repo1.id,
        githubId: crypto.randomBytes(20).toString('hex'),
        sha: crypto.randomBytes(20).toString('hex'),
        message: 'fix: Resolve database connection issue',
        authorId: user2.id,
        authorGithubId: user2.githubId,
        authorName: user2.name,
        authorEmail: user2.email,
        additions: 30,
        deletions: 15,
        committedAt: new Date(now - 1 * 24 * 60 * 60 * 1000 - 8 * 60 * 60 * 1000), // 1 day + 8 hours ago
      },
      {
        repoId: repo2.id,
        githubId: crypto.randomBytes(20).toString('hex'),
        sha: crypto.randomBytes(20).toString('hex'),
        message: 'ui: Redesign dashboard layout',
        authorId: user1.id,
        authorGithubId: user1.githubId,
        authorName: user1.name,
        authorEmail: user1.email,
        additions: 250,
        deletions: 180,
        committedAt: new Date(now - 3 * 60 * 60 * 1000), // 3 hours ago
      },
      // Late night commit (burnout indicator)
      {
        repoId: repo1.id,
        githubId: crypto.randomBytes(20).toString('hex'),
        sha: crypto.randomBytes(20).toString('hex'),
        message: 'fix: Critical bug in production',
        authorId: user1.id,
        authorGithubId: user1.githubId,
        authorName: user1.name,
        authorEmail: user1.email,
        additions: 45,
        deletions: 12,
        committedAt: new Date(now - 3 * 24 * 60 * 60 * 1000 - 1 * 60 * 60 * 1000), // 3 days ago, 11 PM
      },
      // Weekend commits (burnout indicator)
      {
        repoId: repo4.id,
        githubId: crypto.randomBytes(20).toString('hex'),
        sha: crypto.randomBytes(20).toString('hex'),
        message: 'feat: Add biometric authentication to mobile app',
        authorId: user2.id,
        authorGithubId: user2.githubId,
        authorName: user2.name,
        authorEmail: user2.email,
        additions: 320,
        deletions: 45,
        committedAt: new Date(now - 6 * 24 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000), // Saturday
      },
      {
        repoId: repo4.id,
        githubId: crypto.randomBytes(20).toString('hex'),
        sha: crypto.randomBytes(20).toString('hex'),
        message: 'refactor: Improve mobile app navigation',
        authorId: user1.id,
        authorGithubId: user1.githubId,
        authorName: user1.name,
        authorEmail: user1.email,
        additions: 180,
        deletions: 95,
        committedAt: new Date(now - 7 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000), // Sunday
      },
    );

    // Week 2 - Medium activity
    for (let i = 8; i <= 14; i++) {
      commitData.push({
        repoId: i % 3 === 0 ? repo1.id : i % 3 === 1 ? repo2.id : repo4.id,
        githubId: crypto.randomBytes(20).toString('hex'),
        sha: crypto.randomBytes(20).toString('hex'),
        message: `chore: Update dependencies and fix linter warnings ${i}`,
        authorId: i % 2 === 0 ? user1.id : user2.id,
        authorGithubId: i % 2 === 0 ? user1.githubId : user2.githubId,
        authorName: i % 2 === 0 ? user1.name : user2.name,
        authorEmail: i % 2 === 0 ? user1.email : user2.email,
        additions: Math.floor(Math.random() * 200) + 50,
        deletions: Math.floor(Math.random() * 100) + 10,
        committedAt: new Date(now - i * 24 * 60 * 60 * 1000 - (i % 24) * 60 * 60 * 1000),
      });
    }

    // Week 3 - Add commits to other repos
    commitData.push(
      {
        repoId: repo5.id,
        githubId: crypto.randomBytes(20).toString('hex'),
        sha: crypto.randomBytes(20).toString('hex'),
        message: 'infra: Add Kubernetes deployment configs',
        authorId: user2.id,
        authorGithubId: user2.githubId,
        authorName: user2.name,
        authorEmail: user2.email,
        additions: 420,
        deletions: 0,
        committedAt: new Date(now - 15 * 24 * 60 * 60 * 1000),
      },
      {
        repoId: repo6.id,
        githubId: crypto.randomBytes(20).toString('hex'),
        sha: crypto.randomBytes(20).toString('hex'),
        message: 'docs: Update API documentation',
        authorId: user1.id,
        authorGithubId: user1.githubId,
        authorName: user1.name,
        authorEmail: user1.email,
        additions: 280,
        deletions: 50,
        committedAt: new Date(now - 16 * 24 * 60 * 60 * 1000),
      },
      {
        repoId: repo3.id,
        githubId: crypto.randomBytes(20).toString('hex'),
        sha: crypto.randomBytes(20).toString('hex'),
        message: 'feat: Add ML model for recommendations',
        authorId: user3.id,
        authorGithubId: user3.githubId,
        authorName: user3.name,
        authorEmail: user3.email,
        additions: 580,
        deletions: 120,
        committedAt: new Date(now - 20 * 24 * 60 * 60 * 1000),
      },
    );

    return commitData;
  };

  const commits = await prisma.commit.createMany({
    data: generateCommitData(),
  });

  console.log(`✅ Created ${commits.count} test commits\n`);

  // Create Test Pull Requests
  console.log('🔀 Creating test pull requests...');

  const pr1 = await prisma.pullRequest.create({
    data: {
      repoId: repo1.id,
      githubId: BigInt(222001),
      number: 1,
      title: 'Add user authentication system',
      state: 'OPEN',
      authorId: user1.id,
      authorGithubId: user1.githubId,
      additions: 150,
      deletions: 20,
      filesChanged: 8,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    },
  });

  const pr2 = await prisma.pullRequest.create({
    data: {
      repoId: repo1.id,
      githubId: BigInt(222002),
      number: 2,
      title: 'Fix database connection pooling',
      state: 'MERGED',
      authorId: user2.id,
      authorGithubId: user2.githubId,
      additions: 30,
      deletions: 15,
      filesChanged: 3,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      mergedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
  });

  const pr3 = await prisma.pullRequest.create({
    data: {
      repoId: repo2.id,
      githubId: BigInt(222003),
      number: 1,
      title: 'Redesign dashboard with new components',
      state: 'MERGED',
      authorId: user1.id,
      authorGithubId: user1.githubId,
      additions: 450,
      deletions: 280,
      filesChanged: 15,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      mergedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    },
  });

  const pr4 = await prisma.pullRequest.create({
    data: {
      repoId: repo4.id,
      githubId: BigInt(222004),
      number: 1,
      title: 'Add biometric authentication',
      state: 'OPEN',
      authorId: user2.id,
      authorGithubId: user2.githubId,
      additions: 320,
      deletions: 45,
      filesChanged: 12,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    },
  });

  const pr5 = await prisma.pullRequest.create({
    data: {
      repoId: repo1.id,
      githubId: BigInt(222005),
      number: 3,
      title: 'Refactor webhook processing',
      state: 'CLOSED',
      authorId: user2.id,
      authorGithubId: user2.githubId,
      additions: 180,
      deletions: 220,
      filesChanged: 8,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      closedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
    },
  });

  const pr6 = await prisma.pullRequest.create({
    data: {
      repoId: repo5.id,
      githubId: BigInt(222006),
      number: 1,
      title: 'Add Kubernetes deployment manifests',
      state: 'MERGED',
      authorId: user2.id,
      authorGithubId: user2.githubId,
      additions: 520,
      deletions: 0,
      filesChanged: 18,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      mergedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    },
  });

  const pr7 = await prisma.pullRequest.create({
    data: {
      repoId: repo3.id,
      githubId: BigInt(222007),
      number: 1,
      title: 'Implement ML recommendation engine',
      state: 'OPEN',
      authorId: user3.id,
      authorGithubId: user3.githubId,
      additions: 680,
      deletions: 120,
      filesChanged: 22,
      createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  });

  const pr8 = await prisma.pullRequest.create({
    data: {
      repoId: repo6.id,
      githubId: BigInt(222008),
      number: 1,
      title: 'Update API documentation for v2',
      state: 'MERGED',
      authorId: user1.id,
      authorGithubId: user1.githubId,
      additions: 380,
      deletions: 150,
      filesChanged: 25,
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
      mergedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(`✅ Created ${8} test pull requests\n`);

  // Create Test AI Reviews
  console.log('🤖 Creating test AI reviews...');

  await prisma.aIReview.createMany({
    data: [
      {
      prId: pr1.id,
      analysis:
        '# AI Code Review\n\n## Summary\nThis PR adds user authentication. Overall quality is good with minor suggestions.\n\n## Findings\n- Consider adding rate limiting to login endpoint\n- Password hashing looks secure (bcrypt)\n- JWT implementation follows best practices',
      suggestions: [
        {
          type: 'security',
          severity: 'medium',
          file: 'src/auth/login.ts',
          line: 42,
          issue: 'Consider adding rate limiting',
          suggestion: 'Add rate limiting middleware to prevent brute force attacks',
        },
        {
          type: 'performance',
          severity: 'low',
          file: 'src/auth/service.ts',
          line: 15,
          issue: 'Database query could be optimized',
          suggestion: 'Add index on email field for faster lookups',
        },
      ],
      riskScore: 35,
      complexity: 'medium',
      bugsPotential: 0,
      securityIssues: 1,
      qualityIssues: 2,
      performanceConcerns: 1,
      modelVersion: 'claude-3-sonnet',
      tokensUsed: 1500,
      processingTime: 3500,
      visibility: 'team',
      isSharedToGithub: false,
    },
      {
        prId: pr4.id,
        analysis:
          '# AI Code Review\n\n## Summary\nBiometric auth implementation. High complexity but well structured.\n\n## Findings\n- Excellent error handling\n- Consider adding fallback authentication methods\n- Security best practices followed',
        suggestions: [
          {
            type: 'enhancement',
            severity: 'low',
            file: 'src/auth/biometric.ts',
            line: 78,
            issue: 'Add fallback auth method',
            suggestion: 'Provide PIN/password fallback if biometric fails',
          },
        ],
        riskScore: 25,
        complexity: 'high',
        bugsPotential: 0,
        securityIssues: 0,
        qualityIssues: 1,
        performanceConcerns: 0,
        modelVersion: 'claude-3-sonnet',
        tokensUsed: 2100,
        processingTime: 4200,
        visibility: 'team',
        isSharedToGithub: true,
        githubCommentId: BigInt(999101),
      },
      {
        prId: pr7.id,
        analysis:
          '# AI Code Review\n\n## Summary\nML recommendation engine - very complex implementation.\n\n## Findings\n- Model training could be resource intensive\n- Consider adding caching for predictions\n- Good test coverage',
        suggestions: [
          {
            type: 'performance',
            severity: 'medium',
            file: 'src/ml/predictor.py',
            line: 156,
            issue: 'Cache prediction results',
            suggestion: 'Add Redis caching for frequently requested predictions',
          },
          {
            type: 'quality',
            severity: 'low',
            file: 'src/ml/trainer.py',
            line: 89,
            issue: 'Add more logging',
            suggestion: 'Log model training metrics for debugging',
          },
        ],
        riskScore: 55,
        complexity: 'very_high',
        bugsPotential: 1,
        securityIssues: 0,
        qualityIssues: 2,
        performanceConcerns: 2,
        modelVersion: 'claude-3-sonnet',
        tokensUsed: 3200,
        processingTime: 6800,
        visibility: 'team',
        isSharedToGithub: false,
      },
    ],
  });

  console.log(`✅ Created ${3} test AI reviews\n`);

  // Create Test Issues
  console.log('🐛 Creating test issues...');

  await prisma.issue.createMany({
    data: [
      {
        repoId: repo1.id,
        githubId: BigInt(333001),
        number: 1,
        title: 'Memory leak in webhook processor',
        state: 'OPEN',
        authorId: user2.id,
        authorGithubId: user2.githubId,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        repoId: repo1.id,
        githubId: BigInt(333002),
        number: 2,
        title: 'Update documentation for API endpoints',
        state: 'CLOSED',
        authorId: user1.id,
        authorGithubId: user1.githubId,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        closedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      },
      {
        repoId: repo2.id,
        githubId: BigInt(333003),
        number: 1,
        title: 'Dashboard loading slow on mobile',
        state: 'OPEN',
        authorId: user1.id,
        authorGithubId: user1.githubId,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        repoId: repo4.id,
        githubId: BigInt(333004),
        number: 1,
        title: 'Biometric auth fails on Android 12',
        state: 'OPEN',
        authorId: user2.id,
        authorGithubId: user2.githubId,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        repoId: repo1.id,
        githubId: BigInt(333005),
        number: 3,
        title: 'Add rate limiting to public endpoints',
        state: 'CLOSED',
        authorId: user1.id,
        authorGithubId: user1.githubId,
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        closedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      },
      {
        repoId: repo5.id,
        githubId: BigInt(333006),
        number: 1,
        title: 'Update Kubernetes version to 1.28',
        state: 'CLOSED',
        authorId: user2.id,
        authorGithubId: user2.githubId,
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        closedAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000),
      },
      {
        repoId: repo3.id,
        githubId: BigInt(333007),
        number: 1,
        title: 'ML model accuracy below 80%',
        state: 'OPEN',
        authorId: user3.id,
        authorGithubId: user3.githubId,
        createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
      },
      {
        repoId: repo6.id,
        githubId: BigInt(333008),
        number: 1,
        title: 'Fix broken links in API docs',
        state: 'CLOSED',
        authorId: user1.id,
        authorGithubId: user1.githubId,
        createdAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
        closedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log(`✅ Created ${8} test issues\n`);

  // Create Test Events (Critical for webhook processing)
  console.log('📡 Creating test events...');

  await prisma.event.createMany({
    data: [
      // Push events
      {
        repoId: repo1.id,
        type: 'push',
        action: null,
        githubId: BigInt(444001),
        authorId: user1.id,
        authorGithubId: user1.githubId,
        payload: {
          ref: 'refs/heads/main',
          commits: [
            {
              id: crypto.randomBytes(20).toString('hex'),
              message: 'feat: Add user authentication endpoint',
              author: { name: user1.name, email: user1.email },
              added: 150,
              removed: 20,
            },
          ],
        },
        processed: true,
        processedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 5000),
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        receivedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        repoId: repo2.id,
        type: 'push',
        action: null,
        githubId: BigInt(444002),
        authorId: user1.id,
        authorGithubId: user1.githubId,
        payload: {
          ref: 'refs/heads/main',
          commits: [
            {
              id: crypto.randomBytes(20).toString('hex'),
              message: 'ui: Redesign dashboard layout',
              author: { name: user1.name, email: user1.email },
              added: 250,
              removed: 180,
            },
          ],
        },
        processed: true,
        processedAt: new Date(Date.now() - 3 * 60 * 60 * 1000 + 2000),
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        receivedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      },
      // Pull Request events
      {
        repoId: repo1.id,
        type: 'pull_request',
        action: 'opened',
        githubId: BigInt(444003),
        authorId: user1.id,
        authorGithubId: user1.githubId,
        payload: {
          action: 'opened',
          number: 1,
          pull_request: {
            id: pr1.githubId.toString(),
            title: 'Add user authentication system',
            state: 'open',
            additions: 150,
            deletions: 20,
            changed_files: 8,
          },
        },
        processed: true,
        processedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 10000),
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        receivedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        repoId: repo1.id,
        type: 'pull_request',
        action: 'closed',
        githubId: BigInt(444004),
        authorId: user2.id,
        authorGithubId: user2.githubId,
        payload: {
          action: 'closed',
          number: 2,
          pull_request: {
            id: pr2.githubId.toString(),
            title: 'Fix database connection pooling',
            state: 'closed',
            merged: true,
            merged_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
        processed: true,
        processedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 3000),
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        receivedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        repoId: repo4.id,
        type: 'pull_request',
        action: 'opened',
        githubId: BigInt(444005),
        authorId: user2.id,
        authorGithubId: user2.githubId,
        payload: {
          action: 'opened',
          number: 1,
          pull_request: {
            id: pr4.githubId.toString(),
            title: 'Add biometric authentication',
            state: 'open',
            additions: 320,
            deletions: 45,
            changed_files: 12,
          },
        },
        processed: true,
        processedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 4000),
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        receivedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      // Issue events
      {
        repoId: repo1.id,
        type: 'issues',
        action: 'opened',
        githubId: BigInt(444006),
        authorId: user2.id,
        authorGithubId: user2.githubId,
        payload: {
          action: 'opened',
          issue: {
            id: 333001,
            number: 1,
            title: 'Memory leak in webhook processor',
            state: 'open',
          },
        },
        processed: true,
        processedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 2000),
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        receivedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        repoId: repo1.id,
        type: 'issues',
        action: 'closed',
        githubId: BigInt(444007),
        authorId: user1.id,
        authorGithubId: user1.githubId,
        payload: {
          action: 'closed',
          issue: {
            id: 333002,
            number: 2,
            title: 'Update documentation for API endpoints',
            state: 'closed',
            closed_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
        processed: true,
        processedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000 + 1000),
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        receivedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      },
      // PR Review events
      {
        repoId: repo1.id,
        type: 'pull_request_review',
        action: 'submitted',
        githubId: BigInt(444008),
        authorId: user2.id,
        authorGithubId: user2.githubId,
        payload: {
          action: 'submitted',
          review: {
            id: 555001,
            state: 'approved',
            body: 'LGTM! Great implementation.',
          },
          pull_request: {
            id: pr2.githubId.toString(),
            number: 2,
          },
        },
        processed: true,
        processedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000 + 1000),
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000),
        receivedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000),
      },
      // Unprocessed event (for testing queue processing)
      {
        repoId: repo2.id,
        type: 'push',
        action: null,
        githubId: BigInt(444009),
        authorId: user1.id,
        authorGithubId: user1.githubId,
        payload: {
          ref: 'refs/heads/feature/new-chart',
          commits: [
            {
              id: crypto.randomBytes(20).toString('hex'),
              message: 'wip: Add new chart component',
              author: { name: user1.name, email: user1.email },
              added: 85,
              removed: 12,
            },
          ],
        },
        processed: false,
        processedAt: null,
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
        receivedAt: new Date(Date.now() - 30 * 60 * 1000),
      },
    ],
  });

  console.log(`✅ Created ${9} test events\n`);

  // Create Test Metrics
  console.log('📊 Creating test metrics...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate 30 days of metrics for trend analysis
  const developerMetricsData = [];
  const teamMetricsData = [];
  const repoStatsData = [];

  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Simulate varying activity levels (higher during weekdays)
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const activityMultiplier = isWeekend ? 0.3 : 1.0;

    // Developer Metrics for user1
    developerMetricsData.push({
      userId: user1.id,
      orgId: techCorp.id,
      date: date,
      commits: Math.floor((3 + Math.random() * 5) * activityMultiplier),
      linesAdded: Math.floor((150 + Math.random() * 300) * activityMultiplier),
      linesDeleted: Math.floor((50 + Math.random() * 150) * activityMultiplier),
      filesChanged: Math.floor((5 + Math.random() * 15) * activityMultiplier),
      prsOpened: Math.random() > 0.7 ? 1 : 0,
      prsMerged: Math.random() > 0.6 ? 1 : 0,
      prsReviewed: Math.floor((1 + Math.random() * 4) * activityMultiplier),
      reviewComments: Math.floor((2 + Math.random() * 10) * activityMultiplier),
      issuesOpened: Math.random() > 0.85 ? 1 : 0,
      issuesResolved: Math.random() > 0.8 ? 1 : 0,
      commitsOnWeekend: isWeekend ? Math.floor(Math.random() * 3) : 0,
      commitsLateNight: Math.floor(Math.random() * 2),
      avgCodeQuality: 80 + Math.random() * 15,
      bugIntroduced: Math.random() > 0.9 ? 1 : 0,
      bugFixed: Math.random() > 0.85 ? 1 : 0,
    });

    // Developer Metrics for user2
    developerMetricsData.push({
      userId: user2.id,
      orgId: techCorp.id,
      date: date,
      commits: Math.floor((2 + Math.random() * 4) * activityMultiplier),
      linesAdded: Math.floor((100 + Math.random() * 200) * activityMultiplier),
      linesDeleted: Math.floor((30 + Math.random() * 100) * activityMultiplier),
      filesChanged: Math.floor((3 + Math.random() * 10) * activityMultiplier),
      prsOpened: Math.random() > 0.75 ? 1 : 0,
      prsMerged: Math.random() > 0.65 ? 1 : 0,
      prsReviewed: Math.floor((1 + Math.random() * 3) * activityMultiplier),
      reviewComments: Math.floor((1 + Math.random() * 8) * activityMultiplier),
      issuesOpened: Math.random() > 0.9 ? 1 : 0,
      issuesResolved: Math.random() > 0.85 ? 1 : 0,
      commitsOnWeekend: isWeekend ? Math.floor(Math.random() * 2) : 0,
      avgCodeQuality: 75 + Math.random() * 15,
      bugFixed: Math.random() > 0.9 ? 1 : 0,
    });

    // Developer Metrics for user3 (personal org, less frequent)
    if (i < 15 && !isWeekend) {
      developerMetricsData.push({
        userId: user3.id,
        orgId: personalOrg.id,
        date: date,
        commits: Math.floor(1 + Math.random() * 3),
        linesAdded: Math.floor(80 + Math.random() * 200),
        linesDeleted: Math.floor(20 + Math.random() * 80),
        filesChanged: Math.floor(2 + Math.random() * 8),
        prsOpened: Math.random() > 0.8 ? 1 : 0,
        prsMerged: Math.random() > 0.85 ? 1 : 0,
        avgCodeQuality: 78 + Math.random() * 12,
      });
    }

    // Team Metrics for TechCorp
    teamMetricsData.push({
      orgId: techCorp.id,
      date: date,
      velocity: Math.floor((10 + Math.random() * 15) * activityMultiplier),
      avgPrCycleTime: Math.floor(12 + Math.random() * 12), // 12-24 hours
      avgReviewTime: Math.floor(2 + Math.random() * 6), // 2-8 hours
      totalCommits: Math.floor((5 + Math.random() * 10) * activityMultiplier),
      totalPrsOpened: Math.floor((1 + Math.random() * 3) * activityMultiplier),
      totalPrsMerged: Math.floor((1 + Math.random() * 2) * activityMultiplier),
      totalIssuesClosed: Math.random() > 0.7 ? Math.floor(1 + Math.random() * 2) : 0,
      buildSuccessRate: 85 + Math.random() * 13,
      codeQualityScore: 78 + Math.random() * 15,
      activeContributors: isWeekend ? 1 : 2,
      prQueueLength: Math.floor(2 + Math.random() * 4),
      avgPrQueueTime: Math.floor(6 + Math.random() * 18),
      issueBacklog: Math.floor(5 + Math.random() * 10),
    });

    // Repository Stats for repo1
    repoStatsData.push({
      repoId: repo1.id,
      date: date,
      commits: Math.floor((2 + Math.random() * 5) * activityMultiplier),
      prsOpened: Math.random() > 0.7 ? 1 : 0,
      prsMerged: Math.random() > 0.65 ? 1 : 0,
      issuesOpened: Math.random() > 0.85 ? 1 : 0,
      issuesClosed: Math.random() > 0.8 ? 1 : 0,
      uniqueContributors: isWeekend ? 1 : 2,
      linesAdded: Math.floor((150 + Math.random() * 300) * activityMultiplier),
      linesDeleted: Math.floor((50 + Math.random() * 150) * activityMultiplier),
      filesChanged: Math.floor((5 + Math.random() * 15) * activityMultiplier),
      stars: 45 + i, // Growing stars
      forks: 8 + Math.floor(i / 5),
      watchers: 20 + Math.floor(i / 3),
    });

    // Repository Stats for repo2 (less active)
    if (i < 20) {
      repoStatsData.push({
        repoId: repo2.id,
        date: date,
        commits: Math.floor((1 + Math.random() * 3) * activityMultiplier),
        prsOpened: Math.random() > 0.8 ? 1 : 0,
        prsMerged: Math.random() > 0.75 ? 1 : 0,
        issuesOpened: Math.random() > 0.9 ? 1 : 0,
        uniqueContributors: 1,
        linesAdded: Math.floor((80 + Math.random() * 200) * activityMultiplier),
        linesDeleted: Math.floor((30 + Math.random() * 100) * activityMultiplier),
        filesChanged: Math.floor((3 + Math.random() * 10) * activityMultiplier),
        stars: 32 + Math.floor(i / 2),
        forks: 5 + Math.floor(i / 7),
      });
    }

    // Repository Stats for repo4 (mobile app)
    if (i < 15) {
      repoStatsData.push({
        repoId: repo4.id,
        date: date,
        commits: Math.floor((1 + Math.random() * 4) * activityMultiplier),
        prsOpened: Math.random() > 0.75 ? 1 : 0,
        prsMerged: Math.random() > 0.7 ? 1 : 0,
        uniqueContributors: isWeekend ? 1 : 2,
        linesAdded: Math.floor((120 + Math.random() * 250) * activityMultiplier),
        linesDeleted: Math.floor((40 + Math.random() * 120) * activityMultiplier),
        filesChanged: Math.floor((4 + Math.random() * 12) * activityMultiplier),
        stars: 28 + Math.floor(i / 3),
        forks: 4,
      });
    }
  }

  await prisma.developerMetric.createMany({
    data: developerMetricsData,
  });

  await prisma.teamMetric.createMany({
    data: teamMetricsData,
  });

  await prisma.repositoryStats.createMany({
    data: repoStatsData,
  });

  console.log(`✅ Created ${developerMetricsData.length} developer metrics entries\n`);
  console.log(`✅ Created ${teamMetricsData.length} team metrics entries\n`);
  console.log(`✅ Created ${repoStatsData.length} repository stats entries\n`);

  // Create Test Notification Rules
  console.log('🔔 Creating test notification rules...');

  const notifRule1 = await prisma.notificationRule.create({
    data: {
      orgId: techCorp.id,
      createdBy: user1.id,
      name: 'PR Review Reminder',
      type: 'pr_waiting_review',
      conditions: {
        hours: 24,
        repos: ['all'],
        branch: 'main',
      },
      channels: ['email', 'slack'],
      channelConfig: {
        slackWebhook: 'https://hooks.slack.com/services/XXXXXX',
        emailRecipients: ['team@techcorp.com'],
      },
      isActive: true,
    },
  });

  const notifRule2 = await prisma.notificationRule.create({
    data: {
      orgId: techCorp.id,
      createdBy: user1.id,
      name: 'Build Failure Alert',
      type: 'build_failed',
      conditions: {
        branch: 'main',
        severity: 'high',
      },
      channels: ['slack'],
      channelConfig: {
        slackWebhook: 'https://hooks.slack.com/services/XXXXXX',
      },
      isActive: true,
    },
  });

  console.log(`✅ Created ${2} notification rules\n`);

  // Create Test Notification Log
  console.log('📝 Creating test notification log...');

  await prisma.notificationLog.create({
    data: {
      ruleId: notifRule1.id,
      recipientId: user1.id,
      channel: 'email',
      status: 'SENT',
      title: 'PR #1 waiting for review',
      message:
        'Pull request "Add user authentication system" has been waiting for review for 24 hours.',
      metadata: {
        prNumber: 1,
        prTitle: 'Add user authentication system',
        repoName: 'devmetrics-api',
      },
      triggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      deliveredAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5000),
    },
  });

  console.log(`✅ Created ${1} notification log entry\n`);

  // Create Test API Key
  console.log('🔑 Creating test API key...');

  await prisma.apiKey.create({
    data: {
      userId: user1.id,
      orgId: techCorp.id,
      name: 'Jenkins CI',
      keyHash: '$2b$10$' + crypto.randomBytes(40).toString('hex').substring(0, 53), // Mock bcrypt hash
      lastFour: 'x7Qa',
      scopes: ['read:metrics', 'read:repos'],
      rateLimit: 1000,
      lastUsedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      totalRequests: 156,
      isActive: true,
    },
  });

  console.log(`✅ Created ${1} API key\n`);

  // Create Test Audit Logs
  console.log('📋 Creating test audit logs...');

  await prisma.auditLog.createMany({
    data: [
      {
        userId: user1.id,
        orgId: techCorp.id,
        action: 'repo_connected',
        resource: `repository:${repo1.id}`,
        metadata: {
          repoName: 'devmetrics-api',
          repoFullName: 'techcorp/devmetrics-api',
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        status: 'success',
      },
      {
        userId: user1.id,
        orgId: techCorp.id,
        action: 'user_invited',
        resource: `user:${user2.id}`,
        metadata: {
          invitedEmail: user2.email,
          role: 'MEMBER',
        },
        ipAddress: '192.168.1.100',
        status: 'success',
      },
      {
        userId: user1.id,
        orgId: techCorp.id,
        action: 'api_key_created',
        metadata: {
          keyName: 'Jenkins CI',
          scopes: ['read:metrics', 'read:repos'],
        },
        ipAddress: '192.168.1.100',
        status: 'success',
      },
    ],
  });

  console.log(`✅ Created ${3} audit log entries\n`);

  console.log('🎉 Database seeding completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   - ${3} Users`);
  console.log(`   - ${3} Organizations`);
  console.log(`   - ${4} User-Organization relationships`);
  console.log(`   - ${9} Repositories (various languages, sync statuses)`);
  console.log(`   - ${commits.count} Commits (with weekend/late-night patterns)`);
  console.log(`   - ${8} Pull Requests (OPEN, MERGED, CLOSED states)`);
  console.log(`   - ${3} AI Reviews`);
  console.log(`   - ${8} Issues`);
  console.log(`   - ${9} Events (push, PR, issues, reviews)`);
  console.log(`   - ${developerMetricsData.length} Developer Metrics entries (30 days)`);
  console.log(`   - ${teamMetricsData.length} Team Metrics entries (30 days)`);
  console.log(`   - ${repoStatsData.length} Repository Stats entries`);
  console.log(`   - ${2} Notification Rules`);
  console.log(`   - ${1} Notification Log`);
  console.log(`   - ${1} API Key`);
  console.log(`   - ${3} Audit Logs\n`);
  console.log('✨ Features:');
  console.log('   - 30 days of time-series data for trend analysis');
  console.log('   - Weekend/late-night commits for burnout detection');
  console.log('   - Multiple repository types and languages');
  console.log('   - All sync statuses covered (ACTIVE, PENDING, SYNCING, ERROR)');
  console.log('   - Events table populated for webhook testing');
  console.log('   - Realistic data patterns and volumes\n');
  console.log('🚀 You can now start the API server and begin development!');
  console.log('🔍 View data in Prisma Studio: npx prisma studio');
  console.log('📈 Dashboard charts will show 30 days of realistic trends!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
