# DevMetrics Backend Architecture

## Overview
The DevMetrics backend is a scalable, event-driven architecture built with Node.js and TypeScript, designed to process real-time GitHub events, compute analytics, and provide RESTful APIs for the frontend application.

---

## Technology Stack

### Core Framework
- **Runtime**: Node.js 20.x LTS
- **Language**: TypeScript 5.x
- **API Framework**: Fastify (high-performance) or Express.js
- **Real-time**: Socket.io or native WebSockets

### Database & Storage
- **Primary Database**: PostgreSQL 15+
- **Time-series Extension**: TimescaleDB
- **ORM**: Prisma or TypeORM
- **Caching**: Redis 7.x
- **Search** (Optional): Elasticsearch 8.x

### Message Queue & Processing
- **Queue**: Redis with Bull or BullMQ
- **Alternative**: RabbitMQ with amqplib
- **Event Store**: PostgreSQL events table

### External Integrations
- **GitHub API**: Octokit (@octokit/rest)
- **AI Analysis**: Anthropic Claude API
- **Notifications**: 
  - Slack API (@slack/web-api)
  - Discord webhooks
  - Email (NodeMailer)

### Testing & Quality
- **Testing**: Jest, Supertest
- **Linting**: ESLint with TypeScript config
- **Validation**: Zod or Joi
- **API Docs**: Swagger/OpenAPI 3.0

### Monitoring & Logging
- **Logging**: Winston or Pino
- **Monitoring**: Prometheus client
- **APM**: DataDog or New Relic
- **Error Tracking**: Sentry

---

## Application Structure

```
apps/api/
├── src/
│   ├── config/                   # Configuration management
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   ├── queue.ts
│   │   ├── logger.ts
│   │   └── index.ts
│   ├── modules/                  # Feature modules
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.middleware.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.dto.ts
│   │   │   └── auth.test.ts
│   │   ├── users/
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.repository.ts
│   │   │   ├── users.routes.ts
│   │   │   └── users.dto.ts
│   │   ├── repositories/
│   │   │   ├── repositories.controller.ts
│   │   │   ├── repositories.service.ts
│   │   │   ├── repositories.repository.ts
│   │   │   ├── repositories.routes.ts
│   │   │   └── repositories.dto.ts
│   │   ├── webhooks/
│   │   │   ├── webhooks.controller.ts
│   │   │   ├── webhooks.service.ts
│   │   │   ├── webhooks.validator.ts
│   │   │   └── webhooks.routes.ts
│   │   ├── metrics/
│   │   │   ├── metrics.controller.ts
│   │   │   ├── metrics.service.ts
│   │   │   ├── calculators/
│   │   │   │   ├── velocity.calculator.ts
│   │   │   │   ├── cycle-time.calculator.ts
│   │   │   │   └── burndown.calculator.ts
│   │   │   └── metrics.routes.ts
│   │   ├── pull-requests/
│   │   │   ├── pull-requests.controller.ts
│   │   │   ├── pull-requests.service.ts
│   │   │   ├── pull-requests.repository.ts
│   │   │   └── pull-requests.routes.ts
│   │   ├── analytics/
│   │   │   ├── analytics.controller.ts
│   │   │   ├── analytics.service.ts
│   │   │   ├── aggregators/
│   │   │   │   ├── team.aggregator.ts
│   │   │   │   ├── individual.aggregator.ts
│   │   │   │   └── repository.aggregator.ts
│   │   │   └── analytics.routes.ts
│   │   ├── ai/
│   │   │   ├── ai.service.ts
│   │   │   ├── claude.client.ts
│   │   │   ├── analyzers/
│   │   │   │   ├── code-review.analyzer.ts
│   │   │   │   ├── complexity.analyzer.ts
│   │   │   │   └── security.analyzer.ts
│   │   │   └── ai.routes.ts
│   │   └── notifications/
│   │       ├── notifications.controller.ts
│   │       ├── notifications.service.ts
│   │       ├── channels/
│   │       │   ├── slack.channel.ts
│   │       │   ├── discord.channel.ts
│   │       │   └── email.channel.ts
│   │       └── notifications.routes.ts
│   ├── workers/                  # Background job workers
│   │   ├── event-processor.worker.ts
│   │   ├── metrics-aggregator.worker.ts
│   │   ├── ai-analyzer.worker.ts
│   │   └── notification-sender.worker.ts
│   ├── queues/                   # Queue definitions
│   │   ├── events.queue.ts
│   │   ├── metrics.queue.ts
│   │   ├── ai.queue.ts
│   │   └── notifications.queue.ts
│   ├── services/                 # Shared services
│   │   ├── github/
│   │   │   ├── github.client.ts
│   │   │   ├── github.service.ts
│   │   │   └── github.types.ts
│   │   ├── cache/
│   │   │   └── cache.service.ts
│   │   └── socket/
│   │       └── socket.service.ts
│   ├── middleware/               # Global middleware
│   │   ├── error-handler.ts
│   │   ├── rate-limiter.ts
│   │   ├── request-logger.ts
│   │   ├── cors.ts
│   │   └── auth.middleware.ts
│   ├── utils/                    # Utility functions
│   │   ├── crypto.ts
│   │   ├── validators.ts
│   │   ├── date-helpers.ts
│   │   └── response.ts
│   ├── types/                    # TypeScript types
│   │   ├── express.d.ts
│   │   ├── models.ts
│   │   └── api.ts
│   ├── database/                 # Database related
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── seeds/
│   │   │   └── seed.ts
│   │   └── client.ts
│   ├── app.ts                    # App initialization
│   └── server.ts                 # Server entry point
├── tests/
│   ├── integration/
│   ├── unit/
│   └── e2e/
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── jest.config.js

apps/workers/                     # Separate worker service
├── src/
│   ├── processors/
│   │   ├── event.processor.ts
│   │   ├── metrics.processor.ts
│   │   └── ai.processor.ts
│   ├── config/
│   ├── utils/
│   └── index.ts
└── package.json
```

---

## Core Modules

### 1. Authentication Module

#### GitHub OAuth Flow
```typescript
// auth.service.ts
export class AuthService {
  async initiateGitHubOAuth(): Promise<string> {
    const state = generateRandomState();
    await this.cache.set(`oauth:state:${state}`, true, 600); // 10 min
    
    return `https://github.com/login/oauth/authorize?` +
           `client_id=${GITHUB_CLIENT_ID}&` +
           `redirect_uri=${CALLBACK_URL}&` +
           `scope=repo,read:org,read:user&` +
           `state=${state}`;
  }

  async handleCallback(code: string, state: string): Promise<AuthToken> {
    // Verify state
    const validState = await this.cache.get(`oauth:state:${state}`);
    if (!validState) throw new UnauthorizedError('Invalid state');

    // Exchange code for token
    const { access_token } = await this.exchangeCodeForToken(code);

    // Get user info from GitHub
    const githubUser = await this.getGitHubUser(access_token);

    // Create or update user
    const user = await this.userService.upsert(githubUser);

    // Generate JWT
    const jwt = this.generateJWT(user);

    return { token: jwt, user };
  }

  private generateJWT(user: User): string {
    return jwt.sign(
      { 
        userId: user.id, 
        githubId: user.githubId,
        email: user.email 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  async verifyToken(token: string): Promise<User> {
    const decoded = jwt.verify(token, JWT_SECRET);
    return this.userService.findById(decoded.userId);
  }
}
```

#### Auth Middleware
```typescript
// auth.middleware.ts
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = extractToken(req);
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const user = await authService.verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorize = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

---

### 2. Webhook Module

#### Webhook Endpoint
```typescript
// webhooks.controller.ts
export class WebhooksController {
  async handleWebhook(req: Request, res: Response) {
    const signature = req.headers['x-hub-signature-256'];
    const event = req.headers['x-github-event'];
    const delivery = req.headers['x-github-delivery'];

    // Verify signature
    if (!this.webhookService.verifySignature(req.body, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Queue event for processing
    await this.eventsQueue.add('process-webhook', {
      event,
      delivery,
      payload: req.body,
      receivedAt: new Date(),
    });

    // Immediate response to GitHub
    return res.status(202).json({ message: 'Accepted' });
  }
}
```

#### Webhook Signature Verification
```typescript
// webhooks.validator.ts
export class WebhookValidator {
  verifySignature(payload: any, signature: string): boolean {
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    const digest = 'sha256=' + hmac.update(JSON.stringify(payload)).digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    );
  }
}
```

#### Event Processing Worker
```typescript
// workers/event-processor.worker.ts
export class EventProcessor {
  async processWebhook(job: Job) {
    const { event, payload } = job.data;

    switch (event) {
      case 'push':
        await this.processPushEvent(payload);
        break;
      case 'pull_request':
        await this.processPullRequestEvent(payload);
        break;
      case 'pull_request_review':
        await this.processReviewEvent(payload);
        break;
      case 'issues':
        await this.processIssueEvent(payload);
        break;
      case 'workflow_run':
        await this.processWorkflowEvent(payload);
        break;
      default:
        logger.warn(`Unhandled event type: ${event}`);
    }

    // Trigger real-time update
    await this.socketService.emit(`repository:${payload.repository.id}:updated`);
  }

  private async processPushEvent(payload: PushEvent) {
    const { repository, commits, pusher } = payload;

    // Store commits
    await this.db.commit.createMany({
      data: commits.map(commit => ({
        sha: commit.id,
        message: commit.message,
        authorId: pusher.id,
        repositoryId: repository.id,
        timestamp: new Date(commit.timestamp),
      })),
    });

    // Queue metrics recalculation
    await this.metricsQueue.add('recalculate-metrics', {
      repositoryId: repository.id,
      type: 'commit',
    });
  }

  private async processPullRequestEvent(payload: PullRequestEvent) {
    const { action, pull_request, repository } = payload;

    if (action === 'opened') {
      await this.handlePROpened(pull_request, repository);
    } else if (action === 'closed') {
      await this.handlePRClosed(pull_request, repository);
    }
  }

  private async handlePROpened(pr: PullRequest, repo: Repository) {
    // Store PR
    await this.db.pullRequest.create({
      data: {
        number: pr.number,
        title: pr.title,
        description: pr.body,
        authorId: pr.user.id,
        repositoryId: repo.id,
        status: 'open',
        createdAt: new Date(pr.created_at),
      },
    });

    // Queue AI analysis
    await this.aiQueue.add('analyze-pr', {
      prId: pr.id,
      prNumber: pr.number,
      repositoryId: repo.id,
    }, {
      priority: 1,
      delay: 5000, // Wait 5 seconds to batch changes
    });

    // Check notification rules
    await this.notificationService.checkRules({
      type: 'pr_opened',
      repositoryId: repo.id,
      prNumber: pr.number,
    });
  }
}
```

---

### 3. GitHub Integration Service

```typescript
// services/github/github.service.ts
export class GitHubService {
  private octokit: Octokit;

  constructor(private accessToken: string) {
    this.octokit = new Octokit({ auth: accessToken });
  }

  async listRepositories(userId: string): Promise<Repository[]> {
    const cacheKey = `github:repos:${userId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated',
    });

    await this.cache.set(cacheKey, data, 300); // 5 min cache
    return data;
  }

  async createWebhook(owner: string, repo: string): Promise<Webhook> {
    const { data } = await this.octokit.repos.createWebhook({
      owner,
      repo,
      config: {
        url: `${API_BASE_URL}/webhooks/github`,
        content_type: 'json',
        secret: WEBHOOK_SECRET,
      },
      events: ['push', 'pull_request', 'pull_request_review', 'issues', 'workflow_run'],
    });

    return data;
  }

  async getPullRequestDiff(owner: string, repo: string, prNumber: number): Promise<string> {
    const { data } = await this.octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
      mediaType: { format: 'diff' },
    });

    return data as unknown as string;
  }

  async importHistoricalData(repositoryId: string, days: number = 90): Promise<void> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Import commits
    const commits = await this.fetchCommitsSince(repositoryId, since);
    await this.storeCommits(commits);

    // Import PRs
    const prs = await this.fetchPullRequestsSince(repositoryId, since);
    await this.storePullRequests(prs);

    // Import issues
    const issues = await this.fetchIssuesSince(repositoryId, since);
    await this.storeIssues(issues);
  }
}
```

---

### 4. Metrics Calculation Module

#### Velocity Calculator
```typescript
// modules/metrics/calculators/velocity.calculator.ts
export class VelocityCalculator {
  async calculate(teamId: string, sprintCount: number = 4): Promise<VelocityMetric> {
    const sprints = await this.getLastNSprints(teamId, sprintCount);
    
    // Calculate weighted velocity
    const weights = [0.4, 0.3, 0.2, 0.1]; // Recent sprints weighted higher
    let weightedVelocity = 0;

    sprints.forEach((sprint, index) => {
      const points = this.calculateSprintPoints(sprint);
      weightedVelocity += points * weights[index];
    });

    // Calculate trend
    const trend = this.calculateTrend(sprints);

    return {
      current: weightedVelocity,
      average: sprints.reduce((sum, s) => sum + this.calculateSprintPoints(s), 0) / sprints.length,
      trend,
      confidence: this.calculateConfidence(sprints),
      sprints: sprints.map(s => ({
        id: s.id,
        points: this.calculateSprintPoints(s),
        startDate: s.startDate,
        endDate: s.endDate,
      })),
    };
  }

  private calculateSprintPoints(sprint: Sprint): number {
    // Sum story points of completed items
    return sprint.items
      .filter(item => item.status === 'completed')
      .reduce((sum, item) => sum + (item.storyPoints || 0), 0);
  }

  private calculateTrend(sprints: Sprint[]): 'up' | 'down' | 'stable' {
    const points = sprints.map(s => this.calculateSprintPoints(s));
    const recentAvg = (points[0] + points[1]) / 2;
    const olderAvg = (points[2] + points[3]) / 2;
    
    const diff = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (diff > 5) return 'up';
    if (diff < -5) return 'down';
    return 'stable';
  }
}
```

#### PR Cycle Time Calculator
```typescript
// modules/metrics/calculators/cycle-time.calculator.ts
export class CycleTimeCalculator {
  async calculate(repositoryId: string, range: DateRange): Promise<CycleTimeMetric> {
    const prs = await this.db.pullRequest.findMany({
      where: {
        repositoryId,
        createdAt: { gte: range.start, lte: range.end },
        status: 'merged',
      },
      include: {
        reviews: true,
      },
    });

    const cycleData = prs.map(pr => {
      const timeToFirstReview = this.calculateTimeToFirstReview(pr);
      const timeToApproval = this.calculateTimeToApproval(pr);
      const timeToMerge = this.calculateTimeToMerge(pr);

      return {
        prNumber: pr.number,
        timeToFirstReview,
        timeToApproval,
        timeToMerge,
        totalCycleTime: timeToMerge,
      };
    });

    return {
      average: this.average(cycleData.map(d => d.totalCycleTime)),
      median: this.median(cycleData.map(d => d.totalCycleTime)),
      p95: this.percentile(cycleData.map(d => d.totalCycleTime), 95),
      breakdown: {
        timeToFirstReview: this.average(cycleData.map(d => d.timeToFirstReview)),
        timeToApproval: this.average(cycleData.map(d => d.timeToApproval)),
      },
      data: cycleData,
    };
  }

  private calculateTimeToFirstReview(pr: PullRequestWithReviews): number {
    if (!pr.reviews.length) return 0;
    
    const firstReview = pr.reviews.sort((a, b) => 
      a.submittedAt.getTime() - b.submittedAt.getTime()
    )[0];

    return (firstReview.submittedAt.getTime() - pr.createdAt.getTime()) / (1000 * 60 * 60); // hours
  }
}
```

#### Metrics Aggregation Worker
```typescript
// workers/metrics-aggregator.worker.ts
export class MetricsAggregator {
  async aggregateDailyMetrics(job: Job) {
    const { repositoryId, date } = job.data;

    const metrics = await Promise.all([
      this.calculateDailyCommits(repositoryId, date),
      this.calculateDailyPRs(repositoryId, date),
      this.calculateDailyIssues(repositoryId, date),
    ]);

    await this.db.repositoryStats.upsert({
      where: { repositoryId_date: { repositoryId, date } },
      create: {
        repositoryId,
        date,
        commits: metrics[0],
        prsOpened: metrics[1].opened,
        prsMerged: metrics[1].merged,
        issuesOpened: metrics[2].opened,
        issuesClosed: metrics[2].closed,
      },
      update: {
        commits: metrics[0],
        prsOpened: metrics[1].opened,
        prsMerged: metrics[1].merged,
        issuesOpened: metrics[2].opened,
        issuesClosed: metrics[2].closed,
      },
    });

    // Emit real-time update
    await this.socketService.emit(
      `repository:${repositoryId}:metrics`,
      { date, ...metrics }
    );
  }
}
```

---

### 5. AI Analysis Module

#### Claude Integration
```typescript
// modules/ai/claude.client.ts
import Anthropic from '@anthropic-ai/sdk';

export class ClaudeClient {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async analyzePullRequest(prData: PRAnalysisInput): Promise<AIInsights> {
    const prompt = this.buildPRAnalysisPrompt(prData);

    const message = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    return this.parseAnalysisResponse(message.content);
  }

  private buildPRAnalysisPrompt(prData: PRAnalysisInput): string {
    return `
Analyze this pull request for code quality, potential issues, and suggestions.

**Title**: ${prData.title}
**Description**: ${prData.description}

**Changed Files**: ${prData.filesChanged}
**Lines Added**: ${prData.additions}
**Lines Deleted**: ${prData.deletions}

**Code Diff**:
\`\`\`diff
${prData.diff}
\`\`\`

Please provide:
1. Risk Score (0-100, where 100 is highest risk)
2. Complexity Assessment (low/medium/high)
3. Potential Bugs (array of issues)
4. Security Concerns (array of issues)
5. Code Quality Suggestions (array of suggestions)
6. Estimated Review Time (in minutes)

Format your response as JSON.
    `;
  }

  private parseAnalysisResponse(content: any): AIInsights {
    // Extract JSON from Claude's response
    const textContent = content.find((c: any) => c.type === 'text');
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Invalid response format from Claude');
    }

    return JSON.parse(jsonMatch[0]);
  }
}
```

#### AI Analysis Worker
```typescript
// workers/ai-analyzer.worker.ts
export class AIAnalyzer {
  async analyzePullRequest(job: Job) {
    const { prId, repositoryId } = job.data;

    // Fetch PR details
    const pr = await this.db.pullRequest.findUnique({
      where: { id: prId },
      include: { repository: true },
    });

    // Get diff from GitHub
    const diff = await this.githubService.getPullRequestDiff(
      pr.repository.owner,
      pr.repository.name,
      pr.number
    );

    // Analyze with Claude
    const insights = await this.claudeClient.analyzePullRequest({
      title: pr.title,
      description: pr.description,
      diff,
      filesChanged: pr.filesChanged,
      additions: pr.additions,
      deletions: pr.deletions,
    });

    // Store insights
    await this.db.aiReview.create({
      data: {
        pullRequestId: prId,
        riskScore: insights.riskScore,
        complexity: insights.complexity,
        potentialBugs: insights.potentialBugs,
        securityIssues: insights.securityIssues,
        suggestions: insights.suggestions,
        estimatedReviewTime: insights.estimatedReviewTime,
      },
    });

    // Optionally comment on GitHub PR
    if (insights.riskScore > 70) {
      await this.githubService.createPRComment(
        pr.repository.owner,
        pr.repository.name,
        pr.number,
        this.formatAIComment(insights)
      );
    }

    // Emit real-time update
    await this.socketService.emit(`pr:${prId}:ai-insights`, insights);
  }
}
```

---

### 6. Notifications Module

#### Notification Service
```typescript
// modules/notifications/notifications.service.ts
export class NotificationService {
  async checkRules(event: NotificationEvent) {
    const rules = await this.db.notificationRule.findMany({
      where: {
        type: event.type,
        orgId: event.organizationId,
        enabled: true,
      },
    });

    for (const rule of rules) {
      if (this.evaluateConditions(event, rule.conditions)) {
        await this.trigger(event, rule);
      }
    }
  }

  private evaluateConditions(event: NotificationEvent, conditions: any): boolean {
    // Example: Notify if PR waiting for review > 4 hours
    if (conditions.waitingTime) {
      const hours = (Date.now() - event.timestamp) / (1000 * 60 * 60);
      return hours > conditions.waitingTime;
    }
    return true;
  }

  private async trigger(event: NotificationEvent, rule: NotificationRule) {
    const channels = rule.channels;

    await Promise.all([
      channels.includes('slack') && this.slackChannel.send(event, rule),
      channels.includes('discord') && this.discordChannel.send(event, rule),
      channels.includes('email') && this.emailChannel.send(event, rule),
      channels.includes('in_app') && this.createInAppNotification(event, rule),
    ]);

    // Log notification
    await this.db.notificationLog.create({
      data: {
        ruleId: rule.id,
        eventType: event.type,
        triggeredAt: new Date(),
        status: 'sent',
      },
    });
  }
}
```

#### Slack Channel
```typescript
// modules/notifications/channels/slack.channel.ts
import { WebClient } from '@slack/web-api';

export class SlackChannel {
  private client: WebClient;

  constructor() {
    this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
  }

  async send(event: NotificationEvent, rule: NotificationRule) {
    const message = this.formatMessage(event);

    await this.client.chat.postMessage({
      channel: rule.slackChannel,
      text: message.text,
      blocks: message.blocks,
    });
  }

  private formatMessage(event: NotificationEvent) {
    switch (event.type) {
      case 'pr_review_required':
        return {
          text: `PR #${event.prNumber} needs review`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `🔍 *PR Review Required*\n\n*${event.prTitle}*\n\nWaiting for ${event.waitingHours} hours`,
              },
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: 'Review PR' },
                  url: event.prUrl,
                },
              ],
            },
          ],
        };
      default:
        return { text: 'Notification', blocks: [] };
    }
  }
}
```

---

### 7. Real-time WebSocket Service

```typescript
// services/socket/socket.service.ts
import { Server } from 'socket.io';

export class SocketService {
  private io: Server;

  initialize(httpServer: any) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL,
        credentials: true,
      },
    });

    this.setupAuthentication();
    this.setupConnectionHandlers();
  }

  private setupAuthentication() {
    this.io.use(async (socket, next) => {
      const token = socket.handshake.auth.token;
      
      try {
        const user = await authService.verifyToken(token);
        socket.data.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupConnectionHandlers() {
    this.io.on('connection', (socket) => {
      const user = socket.data.user;
      logger.info(`User ${user.id} connected`);

      // Join user-specific room
      socket.join(`user:${user.id}`);

      // Join organization rooms
      user.organizations.forEach(org => {
        socket.join(`org:${org.id}`);
      });

      socket.on('subscribe:repository', (repositoryId) => {
        socket.join(`repository:${repositoryId}`);
      });

      socket.on('disconnect', () => {
        logger.info(`User ${user.id} disconnected`);
      });
    });
  }

  // Emit to specific rooms
  async emit(room: string, event: string, data: any) {
    this.io.to(room).emit(event, data);
  }

  async emitToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }
}
```

---

## Database Schema (Prisma)

```prisma
// database/prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// Users & Organizations
model User {
  id                String              @id @default(uuid())
  githubId          String              @unique
  email             String              @unique
  name              String
  avatarUrl         String?
  githubAccessToken String              @db.Text
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  
  userOrganizations UserOrganization[]
  commits           Commit[]
  pullRequests      PullRequest[]
  reviews           Review[]
  
  @@map("users")
}

model Organization {
  id                String              @id @default(uuid())
  name              String
  githubId          String              @unique
  planType          String              @default("free")
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  
  userOrganizations UserOrganization[]
  repositories      Repository[]
  notificationRules NotificationRule[]
  
  @@map("organizations")
}

model UserOrganization {
  userId         String
  organizationId String
  role           Role          @default(DEVELOPER)
  joinedAt       DateTime      @default(now())
  
  user           User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization   Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@id([userId, organizationId])
  @@map("user_organizations")
}

enum Role {
  ADMIN
  MANAGER
  DEVELOPER
  VIEWER
}

// Repositories
model Repository {
  id             String           @id @default(uuid())
  organizationId String
  githubId       String           @unique
  name           String
  fullName       String
  isPrivate      Boolean
  language       String?
  webhookId      String?
  webhookSecret  String?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  
  organization   Organization     @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  commits        Commit[]
  pullRequests   PullRequest[]
  issues         Issue[]
  events         Event[]
  stats          RepositoryStats[]
  
  @@map("repositories")
}

model RepositoryStats {
  id            String     @id @default(uuid())
  repositoryId  String
  date          DateTime   @db.Date
  commits       Int        @default(0)
  prsOpened     Int        @default(0)
  prsMerged     Int        @default(0)
  prsClosed     Int        @default(0)
  issuesOpened  Int        @default(0)
  issuesClosed  Int        @default(0)
  
  repository    Repository @relation(fields: [repositoryId], references: [id], onDelete: Cascade)
  
  @@unique([repositoryId, date])
  @@index([repositoryId, date])
  @@map("repository_stats")
}

// Events (Time-series with TimescaleDB)
model Event {
  id           String   @id @default(uuid())
  repositoryId String
  type         String   // push, pull_request, issues, etc.
  githubId     String   @unique
  authorId     String?
  payload      Json
  createdAt    DateTime @default(now())
  
  repository   Repository @relation(fields: [repositoryId], references: [id], onDelete: Cascade)
  
  @@index([repositoryId, type, createdAt])
  @@map("events")
}

// Commits
model Commit {
  id           String     @id @default(uuid())
  repositoryId String
  sha          String     @unique
  message      String     @db.Text
  authorId     String
  additions    Int        @default(0)
  deletions    Int        @default(0)
  timestamp    DateTime
  createdAt    DateTime   @default(now())
  
  repository   Repository @relation(fields: [repositoryId], references: [id], onDelete: Cascade)
  author       User       @relation(fields: [authorId], references: [id], onDelete: Cascade)
  
  @@index([repositoryId, timestamp])
  @@map("commits")
}

// Pull Requests
model PullRequest {
  id           String      @id @default(uuid())
  repositoryId String
  number       Int
  githubId     String      @unique
  title        String
  description  String?     @db.Text
  authorId     String
  status       PRStatus    @default(OPEN)
  additions    Int         @default(0)
  deletions    Int         @default(0)
  filesChanged Int         @default(0)
  createdAt    DateTime
  updatedAt    DateTime
  closedAt     DateTime?
  mergedAt     DateTime?
  
  repository   Repository  @relation(fields: [repositoryId], references: [id], onDelete: Cascade)
  author       User        @relation(fields: [authorId], references: [id], onDelete: Cascade)
  reviews      Review[]
  aiReviews    AIReview[]
  
  @@unique([repositoryId, number])
  @@index([repositoryId, status, createdAt])
  @@map("pull_requests")
}

enum PRStatus {
  OPEN
  CLOSED
  MERGED
}

model Review {
  id             String      @id @default(uuid())
  pullRequestId  String
  reviewerId     String
  state          ReviewState
  comment        String?     @db.Text
  submittedAt    DateTime
  
  pullRequest    PullRequest @relation(fields: [pullRequestId], references: [id], onDelete: Cascade)
  reviewer       User        @relation(fields: [reviewerId], references: [id], onDelete: Cascade)
  
  @@index([pullRequestId, submittedAt])
  @@map("reviews")
}

enum ReviewState {
  APPROVED
  CHANGES_REQUESTED
  COMMENTED
  DISMISSED
}

// AI Analysis
model AIReview {
  id                   String      @id @default(uuid())
  pullRequestId        String
  riskScore            Int
  complexity           Complexity
  potentialBugs        Json
  securityIssues       Json
  suggestions          Json
  estimatedReviewTime  Int         // minutes
  createdAt            DateTime    @default(now())
  
  pullRequest          PullRequest @relation(fields: [pullRequestId], references: [id], onDelete: Cascade)
  
  @@index([pullRequestId])
  @@map("ai_reviews")
}

enum Complexity {
  LOW
  MEDIUM
  HIGH
}

// Issues
model Issue {
  id           String     @id @default(uuid())
  repositoryId String
  number       Int
  githubId     String     @unique
  title        String
  description  String?    @db.Text
  authorId     String
  assigneeId   String?
  status       IssueStatus @default(OPEN)
  createdAt    DateTime
  closedAt     DateTime?
  
  repository   Repository @relation(fields: [repositoryId], references: [id], onDelete: Cascade)
  
  @@unique([repositoryId, number])
  @@index([repositoryId, status])
  @@map("issues")
}

enum IssueStatus {
  OPEN
  CLOSED
}

// Metrics
model DeveloperMetric {
  id             String   @id @default(uuid())
  userId         String
  date           DateTime @db.Date
  commits        Int      @default(0)
  prsOpened      Int      @default(0)
  prsReviewed    Int      @default(0)
  issuesResolved Int      @default(0)
  linesAdded     Int      @default(0)
  linesDeleted   Int      @default(0)
  
  @@unique([userId, date])
  @@index([userId, date])
  @@map("developer_metrics")
}

model TeamMetric {
  id                   String   @id @default(uuid())
  organizationId       String
  date                 DateTime @db.Date
  velocity             Float
  prCycleTime          Float    // hours
  deploymentFrequency  Int
  buildSuccessRate     Float    // percentage
  
  @@unique([organizationId, date])
  @@index([organizationId, date])
  @@map("team_metrics")
}

// Notifications
model NotificationRule {
  id             String         @id @default(uuid())
  organizationId String
  type           String
  conditions     Json
  channels       String[]
  enabled        Boolean        @default(true)
  slackChannel   String?
  discordWebhook String?
  createdAt      DateTime       @default(now())
  
  organization   Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  logs           NotificationLog[]
  
  @@map("notification_rules")
}

model NotificationLog {
  id          String           @id @default(uuid())
  ruleId      String
  eventType   String
  triggeredAt DateTime         @default(now())
  deliveredAt DateTime?
  status      String
  
  rule        NotificationRule @relation(fields: [ruleId], references: [id], onDelete: Cascade)
  
  @@index([ruleId, triggeredAt])
  @@map("notification_logs")
}
```

---

## API Routes

### REST API Endpoints

```typescript
// Main router setup
// app.ts
const app = fastify();

app.register(authRoutes, { prefix: '/api/auth' });
app.register(repositoriesRoutes, { prefix: '/api/repositories' });
app.register(metricsRoutes, { prefix: '/api/metrics' });
app.register(pullRequestsRoutes, { prefix: '/api/pull-requests' });
app.register(analyticsRoutes, { prefix: '/api/analytics' });
app.register(notificationsRoutes, { prefix: '/api/notifications' });
app.register(webhooksRoutes, { prefix: '/api/webhooks' });
```

### Endpoint List

#### Authentication
- `POST /api/auth/github` - Initiate GitHub OAuth
- `GET /api/auth/callback` - OAuth callback
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

#### Repositories
- `GET /api/repositories` - List repositories
- `GET /api/repositories/:id` - Get repository details
- `POST /api/repositories` - Connect repository
- `DELETE /api/repositories/:id` - Disconnect repository
- `POST /api/repositories/:id/import` - Import historical data
- `GET /api/repositories/:id/metrics` - Get repository metrics

#### Metrics
- `GET /api/metrics/velocity` - Team velocity
- `GET /api/metrics/cycle-time` - PR cycle time
- `GET /api/metrics/burndown` - Sprint burndown
- `GET /api/metrics/deployment` - Deployment frequency
- `GET /api/metrics/build-success` - Build success rate

#### Pull Requests
- `GET /api/pull-requests` - List PRs
- `GET /api/pull-requests/:id` - Get PR details
- `GET /api/pull-requests/:id/ai-insights` - Get AI analysis
- `POST /api/pull-requests/:id/reanalyze` - Trigger re-analysis

#### Analytics
- `GET /api/analytics/team` - Team analytics
- `GET /api/analytics/individual/:userId` - Individual analytics
- `GET /api/analytics/repository/:id` - Repository analytics
- `GET /api/analytics/trends` - Historical trends

#### Notifications
- `GET /api/notifications` - List notifications
- `PATCH /api/notifications/:id/read` - Mark as read
- `POST /api/notifications/rules` - Create notification rule
- `GET /api/notifications/rules` - List notification rules
- `DELETE /api/notifications/rules/:id` - Delete rule

#### Webhooks
- `POST /api/webhooks/github` - GitHub webhook endpoint

---

## Queue System

### Queue Configuration
```typescript
// queues/events.queue.ts
import Bull from 'bull';

export const eventsQueue = new Bull('events', {
  redis: {
    host: REDIS_HOST,
    port: REDIS_PORT,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// Process events
eventsQueue.process('process-webhook', 10, async (job) => {
  await eventProcessor.processWebhook(job);
});
```

### Queue Types
1. **Events Queue** - Webhook processing
2. **Metrics Queue** - Metrics calculation
3. **AI Queue** - AI analysis tasks
4. **Notifications Queue** - Notification delivery

---

## Caching Strategy

### Redis Caching
```typescript
// services/cache/cache.service.ts
export class CacheService {
  private client: Redis;

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    await this.client.setex(key, ttl, JSON.stringify(value));
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }
}
```

### Cache Invalidation Strategy
- Invalidate on webhook events
- TTL-based expiration
- Manual invalidation for critical updates

---

## Error Handling

### Global Error Handler
```typescript
// middleware/error-handler.ts
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  if (error instanceof ValidationError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details,
    });
  }

  if (error instanceof UnauthorizedError) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (error instanceof NotFoundError) {
    return res.status(404).json({ error: 'Resource not found' });
  }

  return res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
};
```

---

## Logging

### Logger Configuration
```typescript
// config/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});
```

---

## Security

### Rate Limiting
```typescript
// middleware/rate-limiter.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000, // Higher limit for webhooks
});
```

### Input Validation
```typescript
// Example with Zod
import { z } from 'zod';

const connectRepositorySchema = z.object({
  githubUrl: z.string().url(),
  organizationId: z.string().uuid(),
});

export const validateConnectRepository = (req, res, next) => {
  try {
    connectRepositorySchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({ error: error.errors });
  }
};
```

---

## Monitoring

### Prometheus Metrics
```typescript
// config/metrics.ts
import promClient from 'prom-client';

const register = new promClient.Registry();

export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

export const webhooksProcessed = new promClient.Counter({
  name: 'webhooks_processed_total',
  help: 'Total number of webhooks processed',
  labelNames: ['event_type', 'status'],
  registers: [register],
});
```

---

## Deployment

### Docker Configuration
```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build
RUN npx prisma generate

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
EXPOSE 3001
CMD ["npm", "run", "start:prod"]
```

### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: timescale/timescaledb:latest-pg15
    environment:
      POSTGRES_DB: devmetrics
      POSTGRES_USER: devmetrics
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  api:
    build: .
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://devmetrics:password@postgres:5432/devmetrics
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

  workers:
    build:
      context: .
      dockerfile: Dockerfile.worker
    environment:
      DATABASE_URL: postgresql://devmetrics:password@postgres:5432/devmetrics
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

volumes:
  postgres-data:
  redis-data:
```

---

## Performance Optimization

### Database Optimization
- Index on frequently queried columns
- Use TimescaleDB hypertables for events
- Connection pooling
- Query optimization with EXPLAIN ANALYZE

### API Optimization
- Response compression
- Pagination for large datasets
- Database query caching
- Lazy loading relationships

---

## Testing

### Unit Tests Example
```typescript
// modules/metrics/__tests__/velocity.calculator.test.ts
describe('VelocityCalculator', () => {
  let calculator: VelocityCalculator;

  beforeEach(() => {
    calculator = new VelocityCalculator(mockDb);
  });

  it('calculates weighted velocity correctly', async () => {
    const result = await calculator.calculate('team-1', 4);
    expect(result.current).toBeCloseTo(42.5, 1);
  });

  it('handles empty sprints', async () => {
    const result = await calculator.calculate('team-empty', 4);
    expect(result.current).toBe(0);
  });
});
```

---

## Environment Variables

```env
# .env.example
NODE_ENV=development
PORT=3001
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/devmetrics

# Redis
REDIS_URL=redis://localhost:6379

# GitHub
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_WEBHOOK_SECRET=

# Claude API
ANTHROPIC_API_KEY=

# JWT
JWT_SECRET=
JWT_EXPIRES_IN=7d

# Slack
SLACK_BOT_TOKEN=

# Discord
DISCORD_WEBHOOK_URL=

# Monitoring
SENTRY_DSN=
DATADOG_API_KEY=

# Frontend
FRONTEND_URL=http://localhost:3000
```

---

**Last Updated**: November 4, 2025
**Version**: 1.0.0

