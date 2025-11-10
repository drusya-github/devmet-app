#!/usr/bin/env python3
"""
GitHub Issues and Project Board Creator for DevMetrics
Creates issues from TASK_SPECIFICATION.md and organizes them in a project board
"""

import requests
import os
import json
import time
import sys
from typing import Dict, List, Optional

# Configuration
GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN', '')
REPO_OWNER = os.environ.get('GITHUB_OWNER', '')  # Your GitHub username
REPO_NAME = os.environ.get('GITHUB_REPO', 'devmet-app')

# GitHub API base URL
API_BASE = 'https://api.github.com'

# Colors for labels
LABEL_COLORS = {
    # Priority
    'P0-Critical': 'd73a4a',
    'P1-High': 'ff9500',
    'P2-Medium': 'fbca04',
    'P3-Low': '0e8a16',
    # Type
    'feature': '0075ca',
    'chore': 'd4c5f9',
    'enhancement': '84b6eb',
    'bug': 'd73a4a',
    # Category
    'backend': '5319e7',
    'frontend': '1d76db',
    'infrastructure': '0e8a16',
    'ai': 'd876e3',
    'integration': 'fbca04',
    'testing': 'c5def5',
    'docs': '0075ca',
    # Size
    'XS': 'c2e0c6',
    'S': 'bfdadc',
    'M': 'fef2c0',
    'L': 'fad8c7',
    'XL': 'f9d0c4',
    # Sprint
    'Sprint-1': 'c5def5',
    'Sprint-2': 'bfdadc',
    'Sprint-3': 'd4c5f9',
    'Sprint-4': 'fef2c0',
    'Backlog': 'ededed',
}

class GitHubTaskManager:
    def __init__(self, token: str, owner: str, repo: str):
        self.token = token
        self.owner = owner
        self.repo = repo
        self.headers = {
            'Authorization': f'token {token}',
            'Accept': 'application/vnd.github.v3+json'
        }
        self.created_issues = []
        
    def create_label(self, name: str, color: str, description: str = ''):
        """Create a label in the repository"""
        url = f'{API_BASE}/repos/{self.owner}/{self.repo}/labels'
        data = {
            'name': name,
            'color': color,
            'description': description
        }
        
        try:
            response = requests.post(url, headers=self.headers, json=data)
            if response.status_code == 201:
                print(f'✓ Created label: {name}')
            elif response.status_code == 422:
                # Label already exists, update it
                url = f'{API_BASE}/repos/{self.owner}/{self.repo}/labels/{name}'
                response = requests.patch(url, headers=self.headers, json=data)
                if response.status_code == 200:
                    print(f'✓ Updated label: {name}')
            else:
                print(f'✗ Failed to create label {name}: {response.status_code}')
        except Exception as e:
            print(f'✗ Error creating label {name}: {e}')
    
    def create_all_labels(self):
        """Create all predefined labels"""
        print('\n📌 Creating labels...\n')
        
        label_descriptions = {
            'P0-Critical': 'Critical priority - must complete',
            'P1-High': 'High priority - should complete',
            'P2-Medium': 'Medium priority - nice to have',
            'P3-Low': 'Low priority - future enhancement',
            'feature': 'New feature or functionality',
            'chore': 'Maintenance or setup task',
            'enhancement': 'Enhancement to existing feature',
            'bug': 'Bug fix',
            'backend': 'Backend development',
            'frontend': 'Frontend development',
            'infrastructure': 'Infrastructure and DevOps',
            'ai': 'AI and machine learning features',
            'integration': 'Third-party integrations',
            'testing': 'Testing and QA',
            'docs': 'Documentation',
            'XS': 'Extra Small (1-2 hours)',
            'S': 'Small (2-4 hours)',
            'M': 'Medium (4-8 hours)',
            'L': 'Large (1-2 days)',
            'XL': 'Extra Large (2-5 days)',
            'Sprint-1': 'Week 1 - Foundation',
            'Sprint-2': 'Week 2 - Core Backend',
            'Sprint-3': 'Week 3 - Frontend',
            'Sprint-4': 'Week 4 - AI & Polish',
            'Backlog': 'Future enhancements',
        }
        
        for name, color in LABEL_COLORS.items():
            description = label_descriptions.get(name, '')
            self.create_label(name, color, description)
            time.sleep(0.2)  # Rate limiting
    
    def create_issue(self, title: str, body: str, labels: List[str]) -> Optional[Dict]:
        """Create an issue in the repository"""
        url = f'{API_BASE}/repos/{self.owner}/{self.repo}/issues'
        data = {
            'title': title,
            'body': body,
            'labels': labels
        }
        
        try:
            response = requests.post(url, headers=self.headers, json=data)
            if response.status_code == 201:
                issue = response.json()
                print(f'✓ Created issue #{issue["number"]}: {title}')
                return issue
            else:
                print(f'✗ Failed to create issue {title}: {response.status_code}')
                print(f'  Response: {response.text}')
                return None
        except Exception as e:
            print(f'✗ Error creating issue {title}: {e}')
            return None
    
    def create_project(self, name: str, description: str) -> Optional[Dict]:
        """Create a project board (Projects V2)"""
        # Note: This uses GraphQL API for Projects V2
        query = """
        mutation($ownerId: ID!, $title: String!, $description: String) {
          createProjectV2(input: {ownerId: $ownerId, title: $title}) {
            projectV2 {
              id
              number
              title
              url
            }
          }
        }
        """
        
        # First, get the owner ID
        owner_query = """
        query($login: String!) {
          user(login: $login) {
            id
          }
        }
        """
        
        try:
            # Get owner ID
            graphql_url = 'https://api.github.com/graphql'
            response = requests.post(
                graphql_url,
                headers=self.headers,
                json={'query': owner_query, 'variables': {'login': self.owner}}
            )
            
            if response.status_code != 200:
                print(f'✗ Failed to get owner ID: {response.status_code}')
                return None
            
            owner_id = response.json()['data']['user']['id']
            
            # Create project
            response = requests.post(
                graphql_url,
                headers=self.headers,
                json={
                    'query': query,
                    'variables': {
                        'ownerId': owner_id,
                        'title': name
                    }
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'data' in data and 'createProjectV2' in data['data']:
                    project = data['data']['createProjectV2']['projectV2']
                    print(f'\n✓ Created project board: {name}')
                    print(f'  URL: {project["url"]}')
                    return project
                else:
                    print(f'✗ Failed to create project: {data}')
                    return None
            else:
                print(f'✗ Failed to create project: {response.status_code}')
                return None
                
        except Exception as e:
            print(f'✗ Error creating project: {e}')
            return None

# ============================================================
# TASK DEFINITIONS - Master List
# ============================================================
# Add new tasks here and specify which ones to create below

ALL_TASKS = {
    'TASK-004': {
        'id': 'TASK-004',
        'title': 'Install Backend Dependencies',
        'type': 'chore',
        'priority': 'P0-Critical',
        'category': 'backend',
        'size': 'S',
        'sprint': 'Sprint-1',
        'description': '''## Description
Install all required npm packages for the backend API.

## Acceptance Criteria
- [ ] Core dependencies installed:
  - `fastify`, `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit`
  - `@prisma/client`, `dotenv`, `zod`
  - `bcrypt`, `jsonwebtoken`
  - `axios`, `@octokit/rest`
  - `@anthropic-ai/sdk`
  - `ioredis`, `bull`, `winston`
  - `socket.io`
- [ ] Dev dependencies installed:
  - `typescript`, `@types/node`, `ts-node-dev`, `prisma`
  - `@types/bcrypt`, `@types/jsonwebtoken`
  - `jest`, `supertest`, `@types/jest`, `@types/supertest`
  - `eslint`, `prettier`
- [ ] `package-lock.json` generated
- [ ] No security vulnerabilities (`npm audit`)

## Dependencies
- TASK-003 ✅ (Completed)

## Estimated Time
1 hour

---
📦 **Note**: All dependencies are essential for the DevMetrics backend!'''
    },
    'TASK-005': {
        'id': 'TASK-005',
        'title': 'Configure Prisma and Database Schema',
        'type': 'chore',
        'priority': 'P0-Critical',
        'category': 'infrastructure',
        'size': 'L',
        'sprint': 'Sprint-1',
        'description': '''## Description
Initialize Prisma ORM, define complete database schema, run initial migration.

## Acceptance Criteria
- [ ] `npx prisma init` executed
- [ ] `prisma/schema.prisma` contains all models:
  - User (id, githubId, email, name, avatarUrl, accessToken, refreshToken, createdAt, updatedAt)
  - Organization (id, name, githubId, planType, createdAt)
  - UserOrganization (userId, orgId, role, joinedAt)
  - Repository (id, orgId, githubId, name, fullName, isPrivate, webhookId, lastSyncedAt, createdAt)
  - RepositoryStats (id, repoId, date, commits, prsOpened, prsMerged, issuesOpened, issuesClosed)
  - Event (id, repoId, type, githubId, authorId, payload, createdAt)
  - Commit (id, repoId, githubId, sha, message, authorId, additions, deletions, createdAt)
  - PullRequest (id, repoId, githubId, number, title, state, authorId, mergedAt, closedAt, createdAt)
  - Issue (id, repoId, githubId, number, title, state, authorId, closedAt, createdAt)
  - DeveloperMetric (id, userId, date, commits, prsOpened, prsReviewed, issuesResolved)
  - TeamMetric (id, orgId, date, velocity, prCycleTime, deploymentFrequency)
  - AIReview (id, prId, analysis, suggestions, riskScore, createdAt)
  - NotificationRule (id, orgId, type, conditions, channels, isActive, createdAt)
  - NotificationLog (id, ruleId, triggeredAt, deliveredAt, status)
- [ ] Proper relations defined between models
- [ ] Indexes added for frequently queried fields
- [ ] `npx prisma migrate dev --name init` succeeds
- [ ] `npx prisma generate` creates types
- [ ] Prisma Studio can view database: `npx prisma studio`

## Dependencies
- TASK-003 ✅ (Completed)
- TASK-004

## Estimated Time
4-6 hours

---
🗄️ **Important**: This creates the foundation for all data operations!'''
    },
    'TASK-006': {
        'id': 'TASK-006',
        'title': 'Create Fastify Server Setup',
        'type': 'feature',
        'priority': 'P0-Critical',
        'category': 'backend',
        'size': 'M',
        'sprint': 'Sprint-1',
        'description': '''## Description
Create main server file with Fastify initialization, middleware, and basic configuration.

## Acceptance Criteria
- [ ] `src/server.ts` created with Fastify instance
- [ ] Environment variable loading from `.env`
- [ ] CORS configured for frontend origin
- [ ] Helmet middleware for security headers
- [ ] Rate limiting configured (100 req/min per IP)
- [ ] Request logging with Winston
- [ ] Error handling middleware
- [ ] Health check endpoint: `GET /health` returns `{"status": "ok"}`
- [ ] Server listens on port 3001
- [ ] Graceful shutdown on SIGTERM/SIGINT
- [ ] TypeScript types for all configurations

## File
`apps/api/src/server.ts`

## Dependencies
- TASK-004

## Estimated Time
3-4 hours

---
🚀 **Tip**: This is your main server entry point - make it robust!'''
    },
    'TASK-007': {
        'id': 'TASK-007',
        'title': 'Create Configuration Management',
        'type': 'chore',
        'priority': 'P0-Critical',
        'category': 'backend',
        'size': 'S',
        'sprint': 'Sprint-1',
        'description': '''## Description
Create centralized configuration module for environment variables with validation.

## Acceptance Criteria
- [ ] `src/config/env.config.ts` created
- [ ] All environment variables validated using Zod schema
- [ ] Type-safe configuration object exported
- [ ] Validation fails fast on missing required vars
- [ ] Helpful error messages for misconfiguration
- [ ] Default values for optional configs

## Variables to include
- NODE_ENV, PORT
- DATABASE_URL, REDIS_URL
- GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_WEBHOOK_SECRET
- JWT_SECRET, JWT_EXPIRES_IN
- ANTHROPIC_API_KEY (optional)
- FRONTEND_URL, CORS_ORIGIN
- RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS

## Dependencies
- TASK-006

## Estimated Time
2 hours

---
⚙️ **Tip**: Proper config management prevents deployment issues!'''
    },
    'TASK-008': {
        'id': 'TASK-008',
        'title': 'Set Up Logging System',
        'type': 'chore',
        'priority': 'P1-High',
        'category': 'backend',
        'size': 'S',
        'sprint': 'Sprint-1',
        'description': '''## Description
Configure Winston for structured logging with multiple transports.

## Acceptance Criteria
- [ ] `src/utils/logger.ts` created
- [ ] Console transport for development
- [ ] File transport for production (logs/combined.log, logs/error.log)
- [ ] JSON format for production, pretty format for development
- [ ] Log levels configured (error, warn, info, debug)
- [ ] Sensitive data (tokens, passwords) automatically redacted
- [ ] Request ID added to all logs
- [ ] Exported logger used across application

## Dependencies
- TASK-006

## Estimated Time
2 hours

---
📝 **Tip**: Good logging saves hours of debugging!'''
    },
    'TASK-009': {
        'id': 'TASK-009',
        'title': 'Create Database Connection Service',
        'type': 'chore',
        'priority': 'P0-Critical',
        'category': 'infrastructure',
        'size': 'S',
        'sprint': 'Sprint-1',
        'description': '''## Description
Create Prisma client singleton with proper connection pooling.

## Acceptance Criteria
- [ ] `src/database/prisma.client.ts` created
- [ ] Singleton pattern for Prisma Client
- [ ] Connection pool configured
- [ ] Graceful disconnect on shutdown
- [ ] Query logging in development
- [ ] Connection retry logic
- [ ] Health check method

## Dependencies
- TASK-005

## Estimated Time
2 hours

---
🔌 **Tip**: Singleton pattern prevents connection pool exhaustion!'''
    },
    'TASK-010': {
        'id': 'TASK-010',
        'title': 'Create Redis Connection Service',
        'type': 'chore',
        'priority': 'P0-Critical',
        'category': 'infrastructure',
        'size': 'S',
        'sprint': 'Sprint-1',
        'description': '''## Description
Create Redis client with connection management and helper methods.

## Acceptance Criteria
- [ ] `src/database/redis.client.ts` created
- [ ] IORedis client configured
- [ ] Connection retry logic
- [ ] Error handling
- [ ] Helper methods for common operations (get, set, del, expire)
- [ ] Session management helpers
- [ ] Cache invalidation utilities
- [ ] Health check method
- [ ] Singleton pattern implementation
- [ ] Event monitoring (connect, ready, error, close)
- [ ] Graceful disconnect on shutdown
- [ ] Comprehensive unit tests (41 tests)
- [ ] Integration with server startup/shutdown
- [ ] Documentation in README

## Dependencies
- TASK-002 ✅ (Completed - Redis installed)

## Estimated Time
2 hours

## Implementation Notes
- Uses IORedis for robust Redis client
- Exponential backoff retry (3 attempts, 1s-10s delay)
- Helper methods for JSON storage/retrieval
- Session management with TTL support
- Cache invalidation by pattern
- Default TTL constants (SHORT, MEDIUM, LONG, SESSION, WEEK)

---
🔴 **Status**: ✅ COMPLETED - All 55 tests passing!'''
    },
    'TASK-011': {
        'id': 'TASK-011',
        'title': 'Set Up Testing Framework',
        'type': 'chore',
        'priority': 'P1-High',
        'category': 'testing',
        'size': 'M',
        'sprint': 'Sprint-1',
        'description': '''## Description
Configure Jest for unit and integration testing with proper setup.

## Acceptance Criteria
- [ ] `jest.config.js` created with TypeScript support
- [ ] Test database setup for integration tests
- [ ] `setupTests.ts` for global test configuration
- [ ] Test utilities created (`src/__tests__/utils/`)
- [ ] Mock factories for common models
- [ ] Example unit test passes
- [ ] Example integration test passes
- [ ] `npm test` runs test suite
- [ ] Coverage report generated
- [ ] CI-friendly test output

## Dependencies
- TASK-005 (Configure Prisma and Database Schema)
- TASK-009 (Create Database Connection Service)

## Estimated Time
3-4 hours

---
🧪 **Tip**: Good test infrastructure makes development faster and safer!'''
    },
    'TASK-012': {
        'id': 'TASK-012',
        'title': 'Create NPM Scripts',
        'type': 'chore',
        'priority': 'P1-High',
        'category': 'infrastructure',
        'size': 'XS',
        'sprint': 'Sprint-1',
        'description': '''## Description
Add helpful npm scripts to package.json for development workflow.

## Acceptance Criteria
- [ ] `npm run dev` - Start development server with hot reload
- [ ] `npm run build` - Build TypeScript to JavaScript
- [ ] `npm start` - Start production server
- [ ] `npm test` - Run test suite
- [ ] `npm run test:watch` - Run tests in watch mode
- [ ] `npm run test:coverage` - Generate coverage report
- [ ] `npm run db:migrate` - Run Prisma migrations
- [ ] `npm run db:generate` - Generate Prisma client
- [ ] `npm run db:studio` - Open Prisma Studio
- [ ] `npm run db:seed` - Seed database
- [ ] `npm run lint` - Run ESLint
- [ ] `npm run format` - Run Prettier

## Dependencies
- TASK-004 (Install Backend Dependencies)

## Estimated Time
1 hour

---
⚡️ **Tip**: Well-organized npm scripts improve developer experience!'''
    },
    'TASK-013': {
        'id': 'TASK-013',
        'title': 'Create Database Seeding Script',
        'type': 'chore',
        'priority': 'P2-Medium',
        'category': 'infrastructure',
        'size': 'M',
        'sprint': 'Sprint-1',
        'description': '''## Description
Create seed script to populate database with sample data for development.

## Acceptance Criteria
- [ ] `prisma/seed.ts` created
- [ ] Creates sample users (3-5)
- [ ] Creates sample organizations (2-3)
- [ ] Creates sample repositories (5-10)
- [ ] Creates sample commits, PRs, issues
- [ ] Creates sample metrics
- [ ] Idempotent (can run multiple times)
- [ ] `npm run db:seed` executes successfully
- [ ] Seed data is realistic and useful for testing

## Dependencies
- TASK-005 (Configure Prisma and Database Schema)

## Estimated Time
3-4 hours

---
🌱 **Tip**: Good seed data makes development and testing much easier!'''
    },
    # ============================================================
    # SPRINT 2 TASKS
    # ============================================================
    'TASK-014': {
        'id': 'TASK-014',
        'title': 'Implement GitHub OAuth Flow',
        'type': 'feature',
        'priority': 'P0-Critical',
        'category': 'backend',
        'size': 'L',
        'sprint': 'Sprint-2',
        'description': '''## Description
Implement GitHub OAuth authentication flow for user sign-up and login.

## User Story
> As a developer, I want to sign up and log in using my GitHub account so that I don't need to create another password.

## Acceptance Criteria
- [ ] `src/modules/auth/auth.routes.ts` created with routes:
  - `GET /api/auth/github` - Initiate OAuth flow
  - `GET /api/auth/callback` - Handle GitHub callback
  - `POST /api/auth/logout` - Logout user
  - `GET /api/auth/me` - Get current user
- [ ] `src/modules/auth/auth.service.ts` handles OAuth logic
- [ ] Exchanges OAuth code for GitHub access token
- [ ] Fetches user profile from GitHub API
- [ ] Creates or updates user in database
- [ ] Stores GitHub access token (encrypted)
- [ ] Issues JWT token for API authentication
- [ ] JWT includes userId, role, orgIds
- [ ] Refresh token mechanism implemented
- [ ] Error handling for OAuth failures
- [ ] Redirects to frontend with auth token

## Dependencies
- TASK-006 ✅ (Fastify Server)
- TASK-009 ✅ (Database Connection)

## Estimated Time
6-8 hours

---
🔐 **Important**: This is the foundation for all authenticated features!'''
    },
    'TASK-015': {
        'id': 'TASK-015',
        'title': 'Create JWT Authentication Middleware',
        'type': 'feature',
        'priority': 'P0-Critical',
        'category': 'backend',
        'size': 'M',
        'sprint': 'Sprint-2',
        'description': '''## Description
Create middleware to verify JWT tokens and protect routes.

## Acceptance Criteria
- [ ] `src/middleware/auth.middleware.ts` created
- [ ] Extracts JWT from Authorization header
- [ ] Validates JWT signature and expiration
- [ ] Attaches user object to request
- [ ] Returns 401 for missing/invalid token
- [ ] Returns 403 for expired token
- [ ] Optional authentication for public routes
- [ ] Role-based access control helpers
- [ ] Integration tests for middleware

## Dependencies
- TASK-014

## Estimated Time
3-4 hours

---
🔒 **Tip**: Proper auth middleware is critical for API security!'''
    },
    'TASK-016': {
        'id': 'TASK-016',
        'title': 'Implement User Profile Management',
        'type': 'feature',
        'priority': 'P1-High',
        'category': 'backend',
        'size': 'M',
        'sprint': 'Sprint-2',
        'description': '''## Description
Implement user profile viewing and updating functionality.

## User Story
> As a user, I want to view and update my profile information.

## Acceptance Criteria
- [ ] Routes created:
  - `GET /api/users/me` - Get current user profile
  - `PATCH /api/users/me` - Update profile
  - `DELETE /api/users/me` - Delete account (GDPR compliance)
- [ ] `src/modules/users/users.service.ts` created
- [ ] Can update name, avatar, preferences
- [ ] Cannot update githubId or email directly
- [ ] Account deletion cascades to related data
- [ ] Account deletion logs for audit
- [ ] Input validation with Zod
- [ ] Unit tests for user service

## Dependencies
- TASK-015

## Estimated Time
4 hours

---
👤 **Tip**: GDPR compliance requires proper account deletion!'''
    },
    'TASK-017': {
        'id': 'TASK-017',
        'title': 'Implement Repository Listing from GitHub',
        'type': 'feature',
        'priority': 'P0-Critical',
        'category': 'integration',
        'size': 'M',
        'sprint': 'Sprint-2',
        'description': '''## Description
Fetch and display user's GitHub repositories for selection.

## User Story
> As a user, I want to see a list of my GitHub repositories so that I can choose which ones to track.

## Acceptance Criteria
- [ ] `GET /api/repositories/available` route created
- [ ] Uses Octokit to fetch user's repositories from GitHub
- [ ] Returns both owned and accessible repos
- [ ] Includes repo metadata (name, description, language, stars)
- [ ] Filters out already connected repos
- [ ] Pagination support for large repo lists
- [ ] Caches results in Redis (5 min TTL)
- [ ] Handles GitHub API rate limits gracefully
- [ ] Error handling for API failures

## Dependencies
- TASK-015

## Estimated Time
4 hours

---
📚 **Tip**: Cache GitHub API responses to avoid rate limits!'''
    },
    'TASK-018': {
        'id': 'TASK-018',
        'title': 'Implement Repository Connection',
        'type': 'feature',
        'priority': 'P0-Critical',
        'category': 'integration',
        'size': 'L',
        'sprint': 'Sprint-2',
        'description': '''## Description
Allow users to connect repositories and register webhooks.

## User Story
> As a user, I want to connect my repositories to DevMetrics so that they can be tracked.

## Acceptance Criteria
- [ ] Routes created:
  - `POST /api/repositories` - Connect repository
  - `GET /api/repositories` - List connected repos
  - `GET /api/repositories/:id` - Get repo details
  - `DELETE /api/repositories/:id` - Disconnect repo
- [ ] `src/modules/repositories/repositories.service.ts` created
- [ ] Validates user has access to repository
- [ ] Registers webhook with GitHub
- [ ] Stores webhook ID in database
- [ ] Webhook secret properly configured
- [ ] Can disconnect repo (removes webhook)
- [ ] Bulk import supported (connect multiple repos)
- [ ] Input validation
- [ ] Unit and integration tests

## Dependencies
- TASK-017

## Estimated Time
6-8 hours

---
🔗 **Important**: Webhook setup is crucial for real-time data!'''
    },
    'TASK-019': {
        'id': 'TASK-019',
        'title': 'Implement Historical Data Import',
        'type': 'feature',
        'priority': 'P1-High',
        'category': 'integration',
        'size': 'XL',
        'sprint': 'Sprint-2',
        'description': '''## Description
Import historical GitHub data when a repository is connected.

## User Story
> As a user, when I connect a repository, I want historical data imported so that I can see trends immediately.

## Acceptance Criteria
- [ ] `src/modules/repositories/import.service.ts` created
- [ ] Imports last 90 days of data on repo connection
- [ ] Fetches commits, PRs, issues from GitHub API
- [ ] Processes data in batches to avoid rate limits
- [ ] Uses Bull queue for background processing
- [ ] Shows import progress to user
- [ ] Can resume interrupted imports
- [ ] Stores raw data in events table
- [ ] Calculates initial metrics after import
- [ ] Handles API rate limiting with backoff
- [ ] Error handling and retry logic
- [ ] Logs import statistics

## Dependencies
- TASK-018

## Estimated Time
8-12 hours

---
📥 **Tip**: Historical data import is complex - handle rate limits carefully!'''
    },
    'TASK-020': {
        'id': 'TASK-020',
        'title': 'Create Webhook Endpoint',
        'type': 'feature',
        'priority': 'P0-Critical',
        'category': 'integration',
        'size': 'M',
        'sprint': 'Sprint-2',
        'description': '''## Description
Create endpoint to receive GitHub webhooks for real-time updates.

## User Story
> As a system, I need to receive real-time events from GitHub so that metrics stay up-to-date.

## Acceptance Criteria
- [ ] `POST /api/webhooks/github` route created
- [ ] `src/modules/webhooks/webhooks.controller.ts` created
- [ ] Validates webhook signature using HMAC
- [ ] Rejects webhooks with invalid signature
- [ ] Parses webhook event type from headers
- [ ] Accepts event types: push, pull_request, issues, pull_request_review
- [ ] Queues events for async processing
- [ ] Returns 200 OK immediately to GitHub
- [ ] Logs all webhook receipts
- [ ] Rate limiting disabled for webhook endpoint
- [ ] Integration tests with sample webhooks

## Dependencies
- TASK-010 ✅ (Redis Connection)

## Estimated Time
4 hours

---
🎣 **Important**: Webhook signature validation prevents spoofing!'''
    },
    'TASK-021': {
        'id': 'TASK-021',
        'title': 'Implement Webhook Queue Processing',
        'type': 'feature',
        'priority': 'P0-Critical',
        'category': 'backend',
        'size': 'L',
        'sprint': 'Sprint-2',
        'description': '''## Description
Process webhook events asynchronously using Bull queue.

## Acceptance Criteria
- [ ] `src/modules/webhooks/webhooks.queue.ts` created
- [ ] Bull queue configured with Redis
- [ ] Worker processes queued webhooks
- [ ] Extracts relevant data from each event type
- [ ] Creates records in events table
- [ ] Updates related models (commits, PRs, issues)
- [ ] Triggers metric calculation jobs
- [ ] Retry failed jobs (3 attempts with exponential backoff)
- [ ] Dead letter queue for permanently failed jobs
- [ ] Job monitoring dashboard data
- [ ] Unit tests for each event type processor

## Dependencies
- TASK-020

## Estimated Time
6-8 hours

---
⚡ **Tip**: Queue processing keeps webhook responses fast!'''
    },
    'TASK-022': {
        'id': 'TASK-022',
        'title': 'Implement Event Processors',
        'type': 'feature',
        'priority': 'P0-Critical',
        'category': 'backend',
        'size': 'L',
        'sprint': 'Sprint-2',
        'description': '''## Description
Create processors for different GitHub event types.

## Acceptance Criteria
- [ ] `src/modules/webhooks/processors/` directory created
- [ ] Push event processor:
  - Extracts commit data
  - Creates commit records
  - Links to repository and author
  - Stores additions/deletions
- [ ] Pull request event processor:
  - Handles opened, closed, merged, review_requested
  - Creates/updates PR records
  - Calculates PR cycle time
  - Tracks review status
- [ ] Issue event processor:
  - Handles opened, closed, assigned
  - Creates/updates issue records
  - Tracks resolution time
- [ ] PR review event processor:
  - Tracks review comments
  - Stores approval/rejection
  - Updates PR review metrics
- [ ] Each processor has unit tests
- [ ] Error handling for malformed events

## Dependencies
- TASK-021

## Estimated Time
8-10 hours

---
🔧 **Tip**: Each event type has unique structure - handle carefully!'''
    },
    'TASK-023': {
        'id': 'TASK-023',
        'title': 'Implement Basic Metrics Service',
        'type': 'feature',
        'priority': 'P0-Critical',
        'category': 'backend',
        'size': 'L',
        'sprint': 'Sprint-2',
        'description': '''## Description
Create service to calculate developer and team metrics from event data.

## Acceptance Criteria
- [ ] `src/modules/metrics/metrics.service.ts` created
- [ ] Individual developer metrics:
  - Commits per day/week
  - PRs opened/merged
  - Code contribution volume (additions + deletions)
  - Issue resolution time
  - PR review turnaround time
- [ ] Team metrics:
  - Team velocity (story points or PRs merged)
  - PR cycle time average
  - Code review coverage
  - Issue resolution rate
- [ ] Repository metrics:
  - Commit frequency
  - PR merge rate
  - Active contributors
- [ ] Metrics stored in respective tables
- [ ] Incremental calculation (only new data)
- [ ] Batch calculation for historical data
- [ ] Unit tests for calculations

## Dependencies
- TASK-022

## Estimated Time
8-10 hours

---
📊 **Important**: Accurate metrics are the core value of DevMetrics!'''
    },
    'TASK-024': {
        'id': 'TASK-024',
        'title': 'Create Metrics API Endpoints',
        'type': 'feature',
        'priority': 'P0-Critical',
        'category': 'backend',
        'size': 'M',
        'sprint': 'Sprint-2',
        'description': '''## Description
Create API endpoints to retrieve calculated metrics.

## User Story
> As a user, I want to view my team's metrics via API so that I can display them in the dashboard.

## Acceptance Criteria
- [ ] Routes created:
  - `GET /api/metrics/developer/:userId` - Individual metrics
  - `GET /api/metrics/team/:orgId` - Team metrics
  - `GET /api/metrics/repository/:repoId` - Repository metrics
  - `GET /api/metrics/trends` - Trend data over time
- [ ] Query parameters for date range filtering
- [ ] Response includes calculated metrics and trends
- [ ] Caching for expensive queries (15 min TTL)
- [ ] Pagination for large datasets
- [ ] Input validation
- [ ] Authorization checks (user can only see their org's metrics)
- [ ] Integration tests

## Dependencies
- TASK-023

## Estimated Time
4-5 hours

---
🔍 **Tip**: Cache metrics endpoints - they're expensive to calculate!'''
    },
    'TASK-025': {
        'id': 'TASK-025',
        'title': 'Implement Metrics Aggregation Jobs',
        'type': 'chore',
        'priority': 'P1-High',
        'category': 'backend',
        'size': 'M',
        'sprint': 'Sprint-2',
        'description': '''## Description
Create scheduled jobs to aggregate metrics daily.

## Acceptance Criteria
- [ ] `src/modules/metrics/metrics.jobs.ts` created
- [ ] Bull cron job runs daily at midnight
- [ ] Aggregates previous day's data
- [ ] Calculates developer metrics for all users
- [ ] Calculates team metrics for all organizations
- [ ] Updates repository stats
- [ ] Stores aggregated data in time-series tables
- [ ] Sends alerts for anomalies
- [ ] Logs job execution stats
- [ ] Can manually trigger aggregation

## Dependencies
- TASK-023

## Estimated Time
4 hours

---
⏰ **Tip**: Daily aggregation keeps dashboard queries fast!'''
    },
    # ============================================================
    # SPRINT 3 TASKS
    # ============================================================
    'TASK-026': {
        'id': 'TASK-026',
        'title': 'Initialize Frontend Project',
        'type': 'chore',
        'priority': 'P0-Critical',
        'category': 'frontend',
        'size': 'M',
        'sprint': 'Sprint-3',
        'description': '''## Description
Set up Next.js 14 frontend with TypeScript and Tailwind CSS.

## Acceptance Criteria
- [ ] `apps/web` directory created
- [ ] Next.js 14 with App Router initialized
- [ ] TypeScript configured
- [ ] Tailwind CSS installed and configured
- [ ] shadcn/ui components installed
- [ ] ESLint and Prettier configured
- [ ] Folder structure created:
  - `app/` - Pages and layouts
  - `components/` - Reusable components
  - `lib/` - Utilities and API client
  - `hooks/` - Custom React hooks
  - `types/` - TypeScript types
  - `public/` - Static assets
- [ ] `.env.local` for environment variables
- [ ] Development server runs on port 3000

## Dependencies
None

## Estimated Time
3-4 hours

---
⚛️ **Tip**: Next.js App Router is the modern way to build React apps!'''
    },
    'TASK-027': {
        'id': 'TASK-027',
        'title': 'Create API Client Library',
        'type': 'chore',
        'priority': 'P0-Critical',
        'category': 'frontend',
        'size': 'M',
        'sprint': 'Sprint-3',
        'description': '''## Description
Create TypeScript API client for communicating with backend.

## Acceptance Criteria
- [ ] `lib/api-client.ts` created
- [ ] Axios instance with base URL configuration
- [ ] Request interceptor adds JWT token
- [ ] Response interceptor handles errors
- [ ] Refresh token logic
- [ ] Type-safe API methods for all endpoints
- [ ] Error handling and retries
- [ ] Request/response logging in development

## Dependencies
- TASK-026

## Estimated Time
3-4 hours

---
📡 **Tip**: Type-safe API client prevents runtime errors!'''
    },
    'TASK-028': {
        'id': 'TASK-028',
        'title': 'Implement Authentication Flow (Frontend)',
        'type': 'feature',
        'priority': 'P0-Critical',
        'category': 'frontend',
        'size': 'L',
        'sprint': 'Sprint-3',
        'description': '''## Description
Implement frontend authentication flow with GitHub OAuth.

## User Story
> As a user, I want to sign in with GitHub and stay logged in across sessions.

## Acceptance Criteria
- [ ] Login page with "Sign in with GitHub" button
- [ ] OAuth flow redirects to GitHub
- [ ] Callback page receives auth token
- [ ] Stores JWT in httpOnly cookie or localStorage
- [ ] Auth context provider for global auth state
- [ ] `useAuth()` hook for accessing auth state
- [ ] Protected route wrapper component
- [ ] Automatic redirect to login for unauthenticated users
- [ ] Logout functionality
- [ ] Token refresh before expiration
- [ ] Loading states during auth

## Dependencies
- TASK-027
- TASK-014 (Backend OAuth)

## Estimated Time
6-8 hours

---
🔐 **Important**: Secure token storage is critical!'''
    },
    'TASK-029': {
        'id': 'TASK-029',
        'title': 'Create Layout and Navigation',
        'type': 'feature',
        'priority': 'P1-High',
        'category': 'frontend',
        'size': 'M',
        'sprint': 'Sprint-3',
        'description': '''## Description
Build main application layout with sidebar navigation.

## Acceptance Criteria
- [ ] Responsive sidebar navigation
- [ ] Navigation items:
  - Dashboard
  - Repositories
  - Metrics
  - Team
  - Settings
- [ ] User profile dropdown in header
- [ ] Mobile-friendly hamburger menu
- [ ] Active route highlighting
- [ ] Organization switcher (if multiple orgs)
- [ ] Dark mode toggle
- [ ] Uses shadcn/ui components

## Dependencies
- TASK-028

## Estimated Time
4-5 hours

---
🎨 **Tip**: Good navigation UX makes the app intuitive!'''
    },
    'TASK-030': {
        'id': 'TASK-030',
        'title': 'Create Main Dashboard Page',
        'type': 'feature',
        'priority': 'P0-Critical',
        'category': 'frontend',
        'size': 'L',
        'sprint': 'Sprint-3',
        'description': '''## Description
Create main dashboard showing team metrics overview.

## User Story
> As a user, I want to see an overview of my team's metrics on the main dashboard.

## Acceptance Criteria
- [ ] Dashboard page at `/dashboard`
- [ ] Overview cards showing:
  - Total commits (this week)
  - Open PRs
  - Average PR cycle time
  - Active contributors
- [ ] Commit activity chart (last 30 days)
- [ ] PR velocity trend chart
- [ ] Top contributors list
- [ ] Recent activity feed
- [ ] Loading states for data fetching
- [ ] Error states with retry
- [ ] Empty states for no data
- [ ] Responsive design (mobile, tablet, desktop)

## Dependencies
- TASK-029
- TASK-024 (Metrics API)

## Estimated Time
8-10 hours

---
📊 **Important**: The dashboard is the first thing users see - make it great!'''
    },
    'TASK-031': {
        'id': 'TASK-031',
        'title': 'Implement Metrics Charts',
        'type': 'feature',
        'priority': 'P1-High',
        'category': 'frontend',
        'size': 'L',
        'sprint': 'Sprint-3',
        'description': '''## Description
Create reusable chart components for metrics visualization.

## Acceptance Criteria
- [ ] Install Recharts library
- [ ] Line chart component for trends
- [ ] Bar chart component for comparisons
- [ ] Area chart for cumulative metrics
- [ ] Pie/donut chart for distributions
- [ ] Responsive charts
- [ ] Tooltips with detailed info
- [ ] Legend support
- [ ] Custom colors matching design system
- [ ] Loading skeletons
- [ ] Empty state handling
- [ ] Export chart as image functionality

## Dependencies
- TASK-030

## Estimated Time
6-8 hours

---
📈 **Tip**: Recharts is great for React chart visualization!'''
    },
    'TASK-032': {
        'id': 'TASK-032',
        'title': 'Create Repository Management Page',
        'type': 'feature',
        'priority': 'P0-Critical',
        'category': 'frontend',
        'size': 'L',
        'sprint': 'Sprint-3',
        'description': '''## Description
Create page for managing connected repositories.

## User Story
> As a user, I want to view and manage my connected repositories.

## Acceptance Criteria
- [ ] Repositories page at `/repositories`
- [ ] List of connected repositories with:
  - Repository name and description
  - Last sync time
  - Number of tracked events
  - Basic stats (commits, PRs, issues)
  - Disconnect button
- [ ] "Add Repository" button
- [ ] Modal to select repositories from GitHub
- [ ] Search/filter repositories
- [ ] Bulk connect repositories
- [ ] Import status indicator
- [ ] Repository detail view
- [ ] Confirm before disconnecting

## Dependencies
- TASK-029
- TASK-018 (Backend Repository Connection)

## Estimated Time
8-10 hours

---
🗂️ **Tip**: Clear repository management reduces user confusion!'''
    },
    'TASK-033': {
        'id': 'TASK-033',
        'title': 'Create Individual Developer Metrics Page',
        'type': 'feature',
        'priority': 'P1-High',
        'category': 'frontend',
        'size': 'M',
        'sprint': 'Sprint-3',
        'description': '''## Description
Create page showing individual developer metrics.

## User Story
> As a developer, I want to see my personal contribution metrics and compare them with team averages.

## Acceptance Criteria
- [ ] Personal metrics page at `/metrics/me`
- [ ] Metrics displayed:
  - Commits per day/week
  - PRs opened/merged
  - Code review stats
  - Issue resolution time
  - Contribution streak
- [ ] Comparison with team average (anonymized)
- [ ] Time range selector (week, month, quarter, year)
- [ ] Charts for each metric
- [ ] Export data as CSV
- [ ] Responsive design

## Dependencies
- TASK-030
- TASK-024 (Metrics API)

## Estimated Time
5-6 hours

---
👨‍💻 **Tip**: Personal metrics help developers track their growth!'''
    },
    'TASK-034': {
        'id': 'TASK-034',
        'title': 'Implement WebSocket Server (Backend)',
        'type': 'feature',
        'priority': 'P1-High',
        'category': 'backend',
        'size': 'M',
        'sprint': 'Sprint-3',
        'description': '''## Description
Set up Socket.io server for real-time updates.

## Acceptance Criteria
- [ ] Socket.io integrated with Fastify
- [ ] Socket authentication using JWT
- [ ] User joins organization room on connect
- [ ] User joins repository rooms for tracked repos
- [ ] Connection/disconnection logging
- [ ] Heartbeat/ping-pong for connection health
- [ ] Graceful disconnect handling
- [ ] Rate limiting for socket events
- [ ] Error handling and recovery

## Dependencies
- TASK-006 ✅ (Fastify Server)

## Estimated Time
4 hours

---
🔌 **Tip**: WebSockets enable real-time collaboration!'''
    },
    'TASK-035': {
        'id': 'TASK-035',
        'title': 'Emit Real-time Events from Backend',
        'type': 'feature',
        'priority': 'P1-High',
        'category': 'backend',
        'size': 'M',
        'sprint': 'Sprint-3',
        'description': '''## Description
Emit Socket.io events when metrics update.

## Acceptance Criteria
- [ ] Events emitted:
  - `metric:updated` - When new metrics calculated
  - `repository:event` - When new GitHub event received
  - `pr:opened` - When new PR created
  - `pr:merged` - When PR merged
  - `commit:pushed` - When commits pushed
- [ ] Events sent to appropriate rooms (org/repo)
- [ ] Event payload includes all necessary data
- [ ] No sensitive data in events
- [ ] Events logged for debugging
- [ ] Integration with webhook processors

## Dependencies
- TASK-034
- TASK-022 (Event Processors)

## Estimated Time
3-4 hours

---
📡 **Tip**: Real-time events make the dashboard feel alive!'''
    },
    'TASK-036': {
        'id': 'TASK-036',
        'title': 'Implement WebSocket Client (Frontend)',
        'type': 'feature',
        'priority': 'P1-High',
        'category': 'frontend',
        'size': 'M',
        'sprint': 'Sprint-3',
        'description': '''## Description
Connect frontend to Socket.io for real-time updates.

## Acceptance Criteria
- [ ] `lib/socket-client.ts` created
- [ ] Socket.io client initialized with auth
- [ ] Auto-reconnect on disconnect
- [ ] `useSocket()` hook for components
- [ ] Subscribe to organization events
- [ ] Subscribe to repository events
- [ ] Event handlers update UI automatically
- [ ] Connection status indicator
- [ ] Error handling and recovery
- [ ] Cleanup on unmount

## Dependencies
- TASK-035

## Estimated Time
4 hours

---
🔄 **Tip**: Handle reconnection gracefully for better UX!'''
    },
    'TASK-037': {
        'id': 'TASK-037',
        'title': 'Add Real-time Updates to Dashboard',
        'type': 'feature',
        'priority': 'P1-High',
        'category': 'frontend',
        'size': 'S',
        'sprint': 'Sprint-3',
        'description': '''## Description
Make dashboard update in real-time with WebSocket events.

## User Story
> As a user, I want to see metrics update in real-time without refreshing the page.

## Acceptance Criteria
- [ ] Dashboard subscribes to real-time events
- [ ] Metrics cards update when `metric:updated` received
- [ ] Activity feed shows new events immediately
- [ ] Charts update with new data points
- [ ] Smooth animations for updates
- [ ] Toast notifications for important events
- [ ] No full page refresh needed
- [ ] Optimistic UI updates

## Dependencies
- TASK-036
- TASK-030

## Estimated Time
3 hours

---
✨ **Tip**: Real-time updates create a magical user experience!'''
    },
    'TASK-038': {
        'id': 'TASK-038',
        'title': 'Create Settings Page',
        'type': 'feature',
        'priority': 'P2-Medium',
        'category': 'frontend',
        'size': 'M',
        'sprint': 'Sprint-3',
        'description': '''## Description
Create settings page for user preferences and configuration.

## User Story
> As a user, I want to configure my preferences and notification settings.

## Acceptance Criteria
- [ ] Settings page at `/settings`
- [ ] Tabs for different setting categories:
  - Profile
  - Notifications
  - API Keys
  - Billing (placeholder)
- [ ] Profile settings:
  - Update name
  - Update avatar
  - Change email preferences
- [ ] Notification settings:
  - Enable/disable notification types
  - Choose channels (email, Slack)
- [ ] API key generation and management
- [ ] Delete account option
- [ ] Form validation
- [ ] Success/error messages

## Dependencies
- TASK-029

## Estimated Time
5-6 hours

---
⚙️ **Tip**: Settings page improves user control over their experience!'''
    }
}

# ============================================================
# CONFIGURATION: Specify which tasks to create
# ============================================================
# Option 1: Specify task IDs directly (recommended for adding new tasks)
# Uncomment and modify this list to create specific tasks:
TASKS_TO_CREATE = [
    # 'TASK-007',
    # 'TASK-008', 
    # 'TASK-009',
]

# Option 2: Use command line arguments
# Example: python3 create_github_tasks.py TASK-007 TASK-008 TASK-009

def create_task_issue_body(task: Dict) -> tuple:
    """Create issue title and body from task data"""
    title = f"[{task['id']}] {task['title']}"
    labels = [task['priority'], task['type'], task['category'], task['size'], task['sprint']]
    
    return title, task['description'], labels

def main():
    """Main function to create specified tasks"""
    print('🚀 DevMetrics GitHub Task Creator\n')
    print('=' * 60)
    
    # Check for required environment variables
    if not GITHUB_TOKEN:
        print('❌ ERROR: GITHUB_TOKEN environment variable not set')
        print('\nTo set your token:')
        print('  export GITHUB_TOKEN=your_github_personal_access_token')
        print('\nCreate a token at: https://github.com/settings/tokens')
        print('Required scopes: repo, project')
        return
    
    if not REPO_OWNER:
        print('❌ ERROR: GITHUB_OWNER environment variable not set')
        print('\nTo set your GitHub username:')
        print('  export GITHUB_OWNER=your_github_username')
        return
    
    print(f'📦 Repository: {REPO_OWNER}/{REPO_NAME}')
    print(f'🔑 Token: {"*" * 20}{GITHUB_TOKEN[-4:]}\n')
    
    # Determine which tasks to create
    tasks_to_create = []
    
    # Check command line arguments first
    if len(sys.argv) > 1:
        task_ids = sys.argv[1:]
        print(f'📝 Tasks from command line: {", ".join(task_ids)}\n')
        for task_id in task_ids:
            if task_id in ALL_TASKS:
                tasks_to_create.append(ALL_TASKS[task_id])
            else:
                print(f'⚠️  Warning: {task_id} not found in task definitions')
    # Otherwise use TASKS_TO_CREATE list
    elif TASKS_TO_CREATE:
        print(f'📝 Tasks from configuration: {", ".join(TASKS_TO_CREATE)}\n')
        for task_id in TASKS_TO_CREATE:
            if task_id in ALL_TASKS:
                tasks_to_create.append(ALL_TASKS[task_id])
            else:
                print(f'⚠️  Warning: {task_id} not found in task definitions')
    else:
        print('❌ ERROR: No tasks specified!')
        print('\nPlease specify tasks using one of these methods:')
        print('  1. Command line: python3 create_github_tasks.py TASK-007 TASK-008')
        print('  2. Edit TASKS_TO_CREATE list in the script')
        print('\nAvailable tasks:', ', '.join(ALL_TASKS.keys()))
        return
    
    if not tasks_to_create:
        print('❌ No valid tasks to create!')
        return
    
    # Initialize manager
    manager = GitHubTaskManager(GITHUB_TOKEN, REPO_OWNER, REPO_NAME)
    
    # Create labels (always ensure labels exist)
    manager.create_all_labels()
    
    # Create issues
    print(f'\n📋 Creating {len(tasks_to_create)} issue(s)...\n')
    
    for task in tasks_to_create:
        title, body, labels = create_task_issue_body(task)
        issue = manager.create_issue(title, body, labels)
        if issue:
            manager.created_issues.append(issue)
        time.sleep(0.5)  # Rate limiting
    
    # Create project board
    print('\n📊 Creating project board...')
    project = manager.create_project(
        'DevMetrics Development',
        'Complete project management board for DevMetrics development'
    )
    
    # Summary
    print('\n' + '=' * 60)
    print(f'✅ Summary:')
    print(f'   - Labels ensured: {len(LABEL_COLORS)}')
    print(f'   - Issues created: {len(manager.created_issues)}')
    if manager.created_issues:
        print(f'\n   Created issues:')
        for issue in manager.created_issues:
            print(f'     - Issue #{issue["number"]}: {issue["title"]}')
    if project:
        print(f'\n   - Project board: {project["title"]}')
        print(f'   - Project URL: {project["url"]}')
    print('\n📌 Next steps:')
    print('   1. Visit your repository: https://github.com/{}/{}/issues'.format(REPO_OWNER, REPO_NAME))
    print('   2. Review and organize the new issues')
    print('   3. Start working on the tasks!')
    print('\n🎉 All set! Happy coding!')

if __name__ == '__main__':
    main()

