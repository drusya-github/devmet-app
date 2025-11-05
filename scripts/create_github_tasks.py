#!/usr/bin/env python3
"""
GitHub Issues and Project Board Creator for DevMetrics
Creates issues from TASK_SPECIFICATION.md and organizes them in a project board
"""

import requests
import os
import json
import time
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

# Task definitions for Sprint 1
SPRINT_1_TASKS = [
    {
        'id': 'TASK-001',
        'title': 'Install and Configure PostgreSQL',
        'type': 'chore',
        'priority': 'P0-Critical',
        'category': 'infrastructure',
        'size': 'S',
        'sprint': 'Sprint-1',
        'description': '''## Description
Install PostgreSQL 15, create database and user, verify connectivity.

## Acceptance Criteria
- [ ] PostgreSQL 15 installed via Homebrew
- [ ] PostgreSQL service running automatically
- [ ] `devmetrics` database created
- [ ] `devmetrics_user` created with proper permissions
- [ ] Can connect via psql: `psql -U devmetrics_user -d devmetrics -h localhost`
- [ ] Connection string tested

## Commands
```bash
brew install postgresql@15
brew services start postgresql@15
psql postgres -c "CREATE DATABASE devmetrics;"
psql postgres -c "CREATE USER devmetrics_user WITH PASSWORD 'devpass123';"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE devmetrics TO devmetrics_user;"
```

## Dependencies
None

## Estimated Time
1-2 hours

---
📝 **Note**: Feel free to modify this task or add additional requirements as needed!'''
    },
    {
        'id': 'TASK-002',
        'title': 'Install and Configure Redis',
        'type': 'chore',
        'priority': 'P0-Critical',
        'category': 'infrastructure',
        'size': 'S',
        'sprint': 'Sprint-1',
        'description': '''## Description
Install Redis for caching and session management, verify connectivity.

## Acceptance Criteria
- [ ] Redis installed via Homebrew
- [ ] Redis service running automatically
- [ ] `redis-cli ping` returns PONG
- [ ] Redis accessible at localhost:6379
- [ ] Connection tested from Node.js

## Commands
```bash
brew install redis
brew services start redis
redis-cli ping
```

## Dependencies
None

## Estimated Time
30 minutes

---
📝 **Note**: This is a flexible task - adapt as needed for your setup!'''
    },
    {
        'id': 'TASK-003',
        'title': 'Initialize API Project Structure',
        'type': 'chore',
        'priority': 'P0-Critical',
        'category': 'backend',
        'size': 'M',
        'sprint': 'Sprint-1',
        'description': '''## Description
Set up Fastify API project with TypeScript, proper folder structure, and configuration files.

## Acceptance Criteria
- [ ] `apps/api` directory structure created
- [ ] `package.json` initialized with proper metadata
- [ ] TypeScript configuration set to strict mode
- [ ] Folder structure in place (routes, services, middleware, utils, types)
- [ ] `.env` file configured
- [ ] `.gitignore` includes node_modules, .env, dist
- [ ] ESLint and Prettier configured

## Dependencies
- TASK-001 (PostgreSQL)
- TASK-002 (Redis)

## Estimated Time
2-3 hours

---
💡 **Tip**: Use AI to generate boilerplate folder structure and configs!'''
    },
    # Add more tasks here...
]

def create_task_issue_body(task: Dict) -> tuple:
    """Create issue title and body from task data"""
    title = f"[{task['id']}] {task['title']}"
    labels = [task['priority'], task['type'], task['category'], task['size'], task['sprint']]
    
    return title, task['description'], labels

def main():
    """Main function to create all tasks"""
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
    
    # Initialize manager
    manager = GitHubTaskManager(GITHUB_TOKEN, REPO_OWNER, REPO_NAME)
    
    # Create labels
    manager.create_all_labels()
    
    # Create Sprint 1 issues
    print(f'\n📋 Creating Sprint 1 issues ({len(SPRINT_1_TASKS)} tasks)...\n')
    
    for task in SPRINT_1_TASKS:
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
    print(f'   - Labels created: {len(LABEL_COLORS)}')
    print(f'   - Issues created: {len(manager.created_issues)}')
    if project:
        print(f'   - Project board created: {project["title"]}')
        print(f'   - Project URL: {project["url"]}')
    print('\n📌 Next steps:')
    print('   1. Visit your repository issues tab')
    print('   2. Organize issues in the project board')
    print('   3. Start with Sprint-1 tasks!')
    print('   4. Modify tasks as needed - they\'re flexible!')
    print('\n🎉 All set! Happy coding!')

if __name__ == '__main__':
    main()

