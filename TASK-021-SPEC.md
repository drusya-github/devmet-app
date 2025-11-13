# TASK-021: Implement Webhook Queue Processing

**Type**: `feature` | **Priority**: `P0-Critical` | **Size**: `L`
**Sprint**: Week 2
**Estimated Time**: 6-8 hours
**Status**: In Progress

---

## Table of Contents

1. [Overview](#overview)
2. [Current Status](#current-status)
3. [Objectives](#objectives)
4. [Detailed Requirements](#detailed-requirements)
5. [Subtasks](#subtasks)
6. [Technical Specifications](#technical-specifications)
7. [Database Schema Impact](#database-schema-impact)
8. [Testing Requirements](#testing-requirements)
9. [Acceptance Criteria](#acceptance-criteria)
10. [Dependencies](#dependencies)
11. [Implementation Plan](#implementation-plan)
12. [Success Metrics](#success-metrics)

---

## Overview

**Description:**
Process webhook events asynchronously using Bull queue. This task implements the worker process that consumes queued webhook events from GitHub and transforms them into structured data in our database.

**Context:**
TASK-020 created the webhook endpoint that receives events from GitHub and queues them. TASK-021 completes the pipeline by processing those queued events asynchronously.

**User Story:**
> As a system, I need to process queued webhook events from GitHub so that repository activity data is captured and stored for analytics.

---

## Current Status

### ✅ Already Implemented (TASK-020)

1. **Queue Infrastructure** (`webhooks.queue.ts`):
   - Bull queue configured with Redis (DB 1)
   - Retry logic: 3 attempts with exponential backoff (2s, 4s, 8s)
   - Dead letter queue: Keeps last 500 failed jobs
   - Job monitoring functions
   - Event handlers for job lifecycle
   - Graceful shutdown

2. **Service Layer** (`webhooks.service.ts`):
   - HMAC signature verification
   - Repository validation
   - Event queueing logic

3. **Routes & Controller**:
   - `POST /api/webhooks/github` - Receives and queues webhooks
   - `GET /api/webhooks/health` - Health check
   - `GET /api/webhooks/stats` - Queue statistics

4. **Type Definitions** (`webhooks.types.ts`):
   - Complete types for all supported event payloads
   - WebhookJobData interface
   - Event-specific payload types

### ❌ Missing Components (To Be Implemented)

1. **Worker Process** - No consumer of queued jobs
2. **Event Processors** - No logic to transform events into database records
3. **User Mapping Service** - No GitHub user → DevMetrics user linking
4. **Event Record Creation** - No Event table population
5. **Metric Triggers** - No metric calculation job triggering
6. **Processor Tests** - No unit tests for event processors

---

## Objectives

The primary objectives of TASK-021 are:

1. **Process Queued Events**: Consume jobs from the webhook queue and process them
2. **Extract Event Data**: Parse webhook payloads and extract relevant information
3. **Create Database Records**: Populate Event, Commit, PullRequest, and Issue tables
4. **Map GitHub Users**: Link GitHub user IDs to DevMetrics User records
5. **Trigger Metrics**: Queue metric calculation jobs after processing
6. **Handle Failures**: Implement robust error handling and retry logic
7. **Monitor Processing**: Track processing status and failures
8. **Test Thoroughly**: Ensure all event types are properly tested

---

## Detailed Requirements

### 1. Worker Process

**File**: `src/modules/webhooks/webhooks.worker.ts`

- Single worker instance that processes jobs from the webhook queue
- Processes jobs in order (FIFO)
- Handles job failures with proper logging
- Graceful shutdown support
- Can be started as a separate process or integrated with main server

### 2. Event Processors

**Directory**: `src/modules/webhooks/processors/`

Each processor handles a specific event type and extracts relevant data:

#### 2.1 Push Event Processor

**File**: `processors/push.processor.ts`

**Responsibilities**:
- Extract commits from push event payload
- Create Commit records for each commit
- Map commit authors to User records
- Handle additions/deletions counts
- Store commit messages and metadata
- Link commits to repository

**Data Extracted**:
- Commit SHA
- Commit message
- Author (name, email, GitHub ID)
- Timestamp
- Additions/deletions
- Files changed

#### 2.2 Pull Request Event Processor

**File**: `processors/pull-request.processor.ts`

**Responsibilities**:
- Handle PR lifecycle events: opened, closed, merged, reopened, synchronize
- Create or update PullRequest records
- Track PR state transitions
- Calculate PR cycle time (for merged PRs)
- Map PR authors to User records
- Store PR metadata (title, additions, deletions, files changed)

**Data Extracted**:
- PR number
- Title
- State (OPEN, CLOSED, MERGED)
- Author GitHub ID
- Additions/deletions/files changed
- Created/updated/merged/closed timestamps

#### 2.3 Issue Event Processor

**File**: `processors/issue.processor.ts`

**Responsibilities**:
- Handle issue lifecycle: opened, closed, reopened
- Create or update Issue records
- Track issue state
- Map issue authors to User records
- Calculate resolution time (for closed issues)

**Data Extracted**:
- Issue number
- Title
- State (OPEN, CLOSED)
- Author GitHub ID
- Created/closed timestamps

#### 2.4 Pull Request Review Event Processor

**File**: `processors/pull-request-review.processor.ts`

**Responsibilities**:
- Track PR review events: submitted, edited, dismissed
- Update developer metrics for reviewers
- Track review turnaround time
- Store review metadata

**Data Extracted**:
- Reviewer GitHub ID
- Review state (approved, changes_requested, commented)
- Review timestamp
- Associated PR

### 3. User Mapping Service

**File**: `src/modules/webhooks/services/user-mapping.service.ts`

**Responsibilities**:
- Map GitHub user IDs to DevMetrics User records
- Cache mappings in Redis for performance
- Handle users not yet in our system
- Create placeholder user records if needed (future enhancement)

**Features**:
- `async findUserByGithubId(githubId: number): Promise<User | null>`
- `async getUserIdByGithubId(githubId: number): Promise<string | null>`
- Caching layer (15-minute TTL)

### 4. Event Record Service

**File**: `src/modules/webhooks/services/event-record.service.ts`

**Responsibilities**:
- Create Event records in database
- Handle duplicate events (idempotency)
- Mark events as processed
- Store full webhook payload for debugging

**Features**:
- `async createEvent(data: CreateEventData): Promise<Event>`
- `async markEventProcessed(eventId: string): Promise<void>`
- Duplicate detection using `githubId` and `repoId` unique constraint

---

## Subtasks

### TASK-021.1: Create Worker Process
**Estimated Time**: 1 hour

- [ ] Create `webhooks.worker.ts`
- [ ] Import webhook queue
- [ ] Set up job processor
- [ ] Handle job completion
- [ ] Handle job failures
- [ ] Implement graceful shutdown
- [ ] Add worker lifecycle logging
- [ ] Export worker start/stop functions

### TASK-021.2: Implement User Mapping Service
**Estimated Time**: 1 hour

- [ ] Create `services/user-mapping.service.ts`
- [ ] Implement `findUserByGithubId()` method
- [ ] Add Redis caching layer
- [ ] Handle cache misses
- [ ] Add error handling
- [ ] Write unit tests

### TASK-021.3: Implement Event Record Service
**Estimated Time**: 1 hour

- [ ] Create `services/event-record.service.ts`
- [ ] Implement `createEvent()` method
- [ ] Implement `markEventProcessed()` method
- [ ] Handle duplicate events
- [ ] Add error handling
- [ ] Write unit tests

### TASK-021.4: Implement Push Event Processor
**Estimated Time**: 1.5 hours

- [ ] Create `processors/push.processor.ts`
- [ ] Define processor interface
- [ ] Parse push event payload
- [ ] Extract commits array
- [ ] Create Commit records
- [ ] Map commit authors
- [ ] Handle bulk inserts efficiently
- [ ] Write unit tests
- [ ] Test with sample webhook data

### TASK-021.5: Implement Pull Request Event Processor
**Estimated Time**: 1.5 hours

- [ ] Create `processors/pull-request.processor.ts`
- [ ] Handle PR opened events
- [ ] Handle PR closed/merged events
- [ ] Handle PR synchronize events
- [ ] Create/update PullRequest records
- [ ] Calculate PR cycle time
- [ ] Map PR authors
- [ ] Write unit tests
- [ ] Test with sample webhook data

### TASK-021.6: Implement Issue Event Processor
**Estimated Time**: 1 hour

- [ ] Create `processors/issue.processor.ts`
- [ ] Handle issue opened events
- [ ] Handle issue closed events
- [ ] Create/update Issue records
- [ ] Calculate resolution time
- [ ] Map issue authors
- [ ] Write unit tests
- [ ] Test with sample webhook data

### TASK-021.7: Implement Pull Request Review Processor
**Estimated Time**: 1 hour

- [ ] Create `processors/pull-request-review.processor.ts`
- [ ] Handle review submitted events
- [ ] Extract reviewer information
- [ ] Track review metadata
- [ ] Map reviewers to users
- [ ] Write unit tests
- [ ] Test with sample webhook data

### TASK-021.8: Integrate Processors with Worker
**Estimated Time**: 30 minutes

- [ ] Import all processors in worker
- [ ] Create event type → processor mapping
- [ ] Route jobs to appropriate processor
- [ ] Handle processor errors
- [ ] Add integration tests

### TASK-021.9: Add Metric Calculation Triggers
**Estimated Time**: 30 minutes

- [ ] Define metric calculation job queue (placeholder)
- [ ] Trigger metric jobs after successful processing
- [ ] Queue developer metric updates
- [ ] Queue team metric updates
- [ ] Add logging for metric triggers

### TASK-021.10: Testing & Documentation
**Estimated Time**: 1 hour

- [ ] Write integration tests for worker
- [ ] Test with real GitHub webhook samples
- [ ] Test error scenarios
- [ ] Test retry logic
- [ ] Document processor architecture
- [ ] Update README with worker setup
- [ ] Add troubleshooting guide

---

## Technical Specifications

### Architecture

```
GitHub → Webhook Endpoint → Queue → Worker → Processors → Database
                                            ↓
                                      Metric Jobs Queue
```

### Worker Process Flow

```typescript
1. Start Worker
   ↓
2. Listen to Queue
   ↓
3. Receive Job (WebhookJobData)
   ↓
4. Create Event Record
   ↓
5. Route to Processor (based on event type)
   ↓
6. Processor Extracts Data
   ↓
7. Processor Creates DB Records (Commits/PRs/Issues)
   ↓
8. Mark Event as Processed
   ↓
9. Trigger Metric Calculation Jobs
   ↓
10. Complete Job
```

### Error Handling Strategy

1. **Transient Errors** (network, temporary DB issues):
   - Retry up to 3 times with exponential backoff
   - Log each retry attempt
   - Mark job as failed after all retries exhausted

2. **Permanent Errors** (invalid payload, schema violations):
   - Log error with full context
   - Move to dead letter queue
   - Do not retry
   - Send alert notification

3. **Partial Failures** (some commits fail, others succeed):
   - Use database transactions
   - Roll back on any failure
   - Retry entire job

### Performance Considerations

1. **Batch Processing**:
   - Process commits in batches (e.g., 50 at a time)
   - Use Prisma's `createMany()` for bulk inserts
   - Reduce database round trips

2. **Caching**:
   - Cache user mappings in Redis (15-min TTL)
   - Cache repository data (already loaded during validation)
   - Reduce repeated database queries

3. **Concurrency**:
   - Start with 1 worker, scale to multiple workers if needed
   - Use Bull's concurrency option: `process(5, processorFn)`
   - Monitor queue depth and processing time

4. **Memory Management**:
   - Don't load entire payload into memory for large push events
   - Stream large datasets if needed
   - Clean up references after processing

### Data Deduplication

1. **Events**: Use `githubId + repoId` unique constraint
2. **Commits**: Use `githubId` (SHA) unique constraint
3. **Pull Requests**: Use `repoId + number` unique constraint
4. **Issues**: Use `repoId + number` unique constraint

Use `upsert` operations where appropriate to handle duplicates gracefully.

---

## Database Schema Impact

### Tables Modified/Created

#### 1. `events` Table
```prisma
model Event {
  id          String    @id @default(uuid())
  repoId      String
  type        String    // "push", "pull_request", etc.
  action      String?   // "opened", "closed", etc.
  githubId    BigInt    @unique
  authorId    String?
  authorGithubId BigInt?
  payload     Json
  processed   Boolean   @default(false)
  processedAt DateTime?
  createdAt   DateTime  @default(now())
  receivedAt  DateTime  @default(now())

  repository Repository @relation(...)

  @@unique([githubId, repoId])
  @@index([repoId, createdAt])
  @@index([processed, createdAt])
}
```

#### 2. `commits` Table
```prisma
model Commit {
  id             String    @id @default(uuid())
  repoId         String
  githubId       String    @unique  // SHA
  sha            String
  message        String    @db.Text
  authorId       String?
  authorGithubId BigInt?
  authorName     String?
  authorEmail    String?
  additions      Int       @default(0)
  deletions      Int       @default(0)
  committedAt    DateTime
  createdAt      DateTime  @default(now())

  repository Repository @relation(...)
  author     User?      @relation(...)
}
```

#### 3. `pull_requests` Table
```prisma
model PullRequest {
  id             String    @id @default(uuid())
  repoId         String
  githubId       BigInt    @unique
  number         Int
  title          String
  state          PRState   @default(OPEN)
  authorId       String?
  authorGithubId BigInt?
  additions      Int       @default(0)
  deletions      Int       @default(0)
  filesChanged   Int       @default(0)
  mergedAt       DateTime?
  closedAt       DateTime?
  createdAt      DateTime
  updatedAt      DateTime

  repository Repository @relation(...)
  author     User?      @relation(...)
}
```

#### 4. `issues` Table
```prisma
model Issue {
  id             String     @id @default(uuid())
  repoId         String
  githubId       BigInt     @unique
  number         Int
  title          String
  state          IssueState @default(OPEN)
  authorId       String?
  authorGithubId BigInt?
  closedAt       DateTime?
  createdAt      DateTime

  repository Repository @relation(...)
  author     User?      @relation(...)
}
```

### Indexes Required

All indexes are already defined in the schema.prisma file. Ensure these are created:

- `events`: `[githubId, repoId]`, `[repoId, createdAt]`, `[processed, createdAt]`
- `commits`: `[repoId, committedAt]`, `[authorId, committedAt]`
- `pull_requests`: `[repoId, number]`, `[repoId, state, createdAt]`
- `issues`: `[repoId, number]`, `[repoId, state]`

---

## Testing Requirements

### Unit Tests

#### 1. User Mapping Service Tests
**File**: `services/__tests__/user-mapping.service.test.ts`

- [ ] Test finding user by GitHub ID
- [ ] Test caching behavior
- [ ] Test cache invalidation
- [ ] Test handling missing users
- [ ] Test error handling

#### 2. Event Record Service Tests
**File**: `services/__tests__/event-record.service.test.ts`

- [ ] Test creating event records
- [ ] Test duplicate detection
- [ ] Test marking events as processed
- [ ] Test error handling

#### 3. Push Processor Tests
**File**: `processors/__tests__/push.processor.test.ts`

- [ ] Test extracting commits from payload
- [ ] Test creating commit records
- [ ] Test author mapping
- [ ] Test handling empty commits
- [ ] Test error scenarios

#### 4. Pull Request Processor Tests
**File**: `processors/__tests__/pull-request.processor.test.ts`

- [ ] Test PR opened events
- [ ] Test PR closed events
- [ ] Test PR merged events
- [ ] Test PR synchronize events
- [ ] Test state transitions
- [ ] Test author mapping

#### 5. Issue Processor Tests
**File**: `processors/__tests__/issue.processor.test.ts`

- [ ] Test issue opened events
- [ ] Test issue closed events
- [ ] Test issue reopened events
- [ ] Test author mapping

#### 6. PR Review Processor Tests
**File**: `processors/__tests__/pull-request-review.processor.test.ts`

- [ ] Test review submitted events
- [ ] Test reviewer mapping
- [ ] Test different review states

### Integration Tests

#### 7. Worker Integration Tests
**File**: `__tests__/webhooks.worker.integration.test.ts`

- [ ] Test worker starts and stops
- [ ] Test processing jobs end-to-end
- [ ] Test job routing to processors
- [ ] Test error handling
- [ ] Test retry logic
- [ ] Test database transactions

#### 8. End-to-End Tests
**File**: `__tests__/webhooks.e2e.test.ts`

- [ ] Test complete flow: webhook → queue → worker → database
- [ ] Test with real GitHub webhook samples
- [ ] Test all supported event types
- [ ] Test concurrent processing
- [ ] Test queue cleanup

### Test Data

Create sample webhook payloads in `__tests__/fixtures/`:

- `push-event.json` - Sample push event with multiple commits
- `pull-request-opened.json` - PR opened event
- `pull-request-merged.json` - PR merged event
- `issue-opened.json` - Issue opened event
- `issue-closed.json` - Issue closed event
- `pull-request-review.json` - PR review submitted event

---

## Acceptance Criteria

### Core Functionality

- [x] Webhook queue configured with Redis (already done)
- [ ] Worker process created and functional
- [ ] Worker consumes jobs from queue
- [ ] Worker routes jobs to appropriate processor
- [ ] All 4 event processors implemented:
  - [ ] Push events → Create Commit records
  - [ ] Pull request events → Create/update PullRequest records
  - [ ] Issue events → Create/update Issue records
  - [ ] PR review events → Track review metadata
- [ ] Event records created in database
- [ ] GitHub users mapped to User records
- [ ] Database records properly linked (repository, author)

### Error Handling & Reliability

- [ ] Retry failed jobs (3 attempts with exponential backoff)
- [ ] Dead letter queue for permanently failed jobs
- [ ] Transactional processing (all-or-nothing)
- [ ] Duplicate event detection
- [ ] Graceful error handling for malformed events
- [ ] Logging for all failures with context

### Performance

- [ ] Bulk insert for multiple commits in push events
- [ ] User mapping cached in Redis
- [ ] Processing time < 5 seconds for typical events
- [ ] Queue monitoring dashboard data available
- [ ] Can handle 100+ events per minute

### Testing

- [ ] Unit tests for all processors (>80% coverage)
- [ ] Integration tests for worker
- [ ] End-to-end tests with sample webhooks
- [ ] All tests pass consistently
- [ ] Test coverage report generated

### Monitoring & Observability

- [ ] Job completion logged with timing
- [ ] Job failures logged with full context
- [ ] Queue statistics available via API
- [ ] Processing metrics tracked (events/min, failures, etc.)
- [ ] Worker health status visible

### Documentation

- [ ] Worker architecture documented
- [ ] Processor flow diagrams
- [ ] How to run worker (development & production)
- [ ] How to debug failed jobs
- [ ] How to add new event processors

---

## Dependencies

### Prerequisite Tasks

- [x] **TASK-005**: Database schema defined with Prisma
- [x] **TASK-009**: Prisma client configured
- [x] **TASK-010**: Redis client configured
- [x] **TASK-020**: Webhook endpoint created and queueing events

### Required Packages

All required packages are already installed:

- `bull` - Queue management
- `@prisma/client` - Database access
- `ioredis` - Redis client
- `winston` - Logging

### External Systems

- **PostgreSQL**: Database for storing events and records
- **Redis**: Queue storage and caching
- **GitHub API**: Source of webhook events (already configured)

### Blocked By

None - all prerequisites are complete.

### Blocks

- **TASK-023**: Implement Basic Metrics Service (needs processed event data)
- **TASK-024**: Create Metrics API Endpoints (needs metrics data)

---

## Implementation Plan

### Phase 1: Foundation (2 hours)

1. Create user mapping service
2. Create event record service
3. Write tests for services
4. Create worker skeleton

### Phase 2: Event Processors (3 hours)

1. Implement push event processor
2. Implement pull request event processor
3. Implement issue event processor
4. Implement PR review processor
5. Write tests for each processor

### Phase 3: Integration (1.5 hours)

1. Connect worker to processors
2. Add error handling
3. Add logging and monitoring
4. Write integration tests

### Phase 4: Testing & Polish (1.5 hours)

1. End-to-end testing
2. Test with real webhook samples
3. Performance testing
4. Documentation
5. Code review and refactoring

---

## Success Metrics

### Functional Metrics

- ✅ All 4 event types successfully processed
- ✅ 100% of valid webhooks result in database records
- ✅ 0% data loss for valid events
- ✅ All tests pass with >80% coverage

### Performance Metrics

- ⚡ Average processing time < 5 seconds per event
- ⚡ Queue depth stays < 100 during normal load
- ⚡ Can process 100+ events per minute
- ⚡ Redis cache hit rate > 80% for user mappings

### Reliability Metrics

- 🛡️ Job failure rate < 1%
- 🛡️ All transient failures successfully retried
- 🛡️ Zero permanent failures for valid webhooks
- 🛡️ Worker uptime > 99.9%

### Code Quality Metrics

- 📊 Test coverage > 80%
- 📊 Zero linting errors
- 📊 Zero TypeScript errors
- 📊 All integration tests pass

---

## Risk Assessment

### High Risk

**Risk**: Large push events (100+ commits) overwhelm worker
**Mitigation**: Implement batch processing, use database transactions efficiently

**Risk**: User mapping cache misses cause database overload
**Mitigation**: Warm cache on startup, increase TTL, implement cache preloading

### Medium Risk

**Risk**: Worker crashes and jobs are lost
**Mitigation**: Bull queue persists jobs in Redis, implement worker health checks

**Risk**: Database connection pool exhausted
**Mitigation**: Properly close connections, use connection pooling, monitor pool usage

### Low Risk

**Risk**: Redis goes down and queue is unavailable
**Mitigation**: Redis persistence enabled, implement Redis health checks

---

## Future Enhancements (Out of Scope)

The following are potential improvements but not required for TASK-021:

1. **Multiple Workers**: Horizontal scaling with multiple worker instances
2. **Priority Queue**: High-priority events processed first
3. **Worker Dashboard**: UI for monitoring queue and worker health
4. **Auto-scaling**: Automatically scale workers based on queue depth
5. **User Creation**: Auto-create User records for unknown GitHub users
6. **Webhook Replay**: Ability to replay failed webhooks from dead letter queue
7. **Real-time Metrics**: Update metrics in real-time as events are processed
8. **Event Analytics**: Track webhook processing patterns and trends

---

## Appendix

### A. Sample Processor Interface

```typescript
export interface EventProcessor<T extends GitHubWebhookPayload> {
  /**
   * Process a webhook event and create database records
   * @param job - Bull job containing webhook data
   * @returns Processing result with metadata
   */
  process(job: Job<WebhookJobData>): Promise<WebhookProcessingResult>;

  /**
   * Validate event payload structure
   * @param payload - Webhook payload
   * @returns Whether payload is valid
   */
  validate(payload: T): boolean;
}
```

### B. Sample Worker Configuration

```typescript
// Worker configuration
const WORKER_CONFIG = {
  concurrency: 5, // Process 5 jobs concurrently
  maxJobsPerWorker: 100, // Max jobs before restart
  lockDuration: 30000, // 30s lock duration
  lockRenewTime: 15000, // Renew lock every 15s
  stalledInterval: 30000, // Check for stalled jobs every 30s
};
```

### C. Monitoring Queries

```sql
-- Check processing status
SELECT
  type,
  processed,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (processedAt - receivedAt))) as avg_processing_time_sec
FROM events
WHERE createdAt > NOW() - INTERVAL '24 hours'
GROUP BY type, processed;

-- Find failed events
SELECT id, type, action, repoId, createdAt, receivedAt
FROM events
WHERE processed = false
  AND createdAt < NOW() - INTERVAL '1 hour'
ORDER BY createdAt DESC;

-- Check commit creation rate
SELECT
  DATE_TRUNC('hour', createdAt) as hour,
  COUNT(*) as commits_created
FROM commits
WHERE createdAt > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

---

**Document Version**: 1.0
**Created**: November 13, 2025
**Last Updated**: November 13, 2025
**Author**: DevMetrics Team
**Status**: Ready for Implementation
