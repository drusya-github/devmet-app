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

