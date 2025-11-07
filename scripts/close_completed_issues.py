#!/usr/bin/env python3
"""
Close duplicate GitHub issues for already completed tasks
"""

import requests
import os

# Configuration
GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN', '')
REPO_OWNER = os.environ.get('GITHUB_OWNER', '')
REPO_NAME = os.environ.get('GITHUB_REPO', 'devmet-app')

# GitHub API base URL
API_BASE = 'https://api.github.com'

def close_issue(issue_number: int, comment: str = None):
    """Close a GitHub issue with optional comment"""
    headers = {
        'Authorization': f'token {GITHUB_TOKEN}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    # Add comment if provided
    if comment:
        comment_url = f'{API_BASE}/repos/{REPO_OWNER}/{REPO_NAME}/issues/{issue_number}/comments'
        try:
            response = requests.post(comment_url, headers=headers, json={'body': comment})
            if response.status_code == 201:
                print(f'✓ Added comment to issue #{issue_number}')
            else:
                print(f'✗ Failed to comment on issue #{issue_number}: {response.status_code}')
        except Exception as e:
            print(f'✗ Error commenting on issue #{issue_number}: {e}')
    
    # Close the issue
    issue_url = f'{API_BASE}/repos/{REPO_OWNER}/{REPO_NAME}/issues/{issue_number}'
    try:
        response = requests.patch(issue_url, headers=headers, json={'state': 'closed'})
        if response.status_code == 200:
            print(f'✓ Closed issue #{issue_number}')
            return True
        else:
            print(f'✗ Failed to close issue #{issue_number}: {response.status_code}')
            return False
    except Exception as e:
        print(f'✗ Error closing issue #{issue_number}: {e}')
        return False

def main():
    print('🗑️  Closing Completed Task Issues\n')
    print('=' * 60)
    
    if not GITHUB_TOKEN or not REPO_OWNER:
        print('❌ ERROR: Required environment variables not set')
        return
    
    print(f'📦 Repository: {REPO_OWNER}/{REPO_NAME}\n')
    
    # Issues to close (Tasks 4, 5, 6 which are already completed)
    issues_to_close = [
        {
            'number': 7,
            'task': 'TASK-004',
            'title': 'Install Backend Dependencies'
        },
        {
            'number': 8,
            'task': 'TASK-005',
            'title': 'Configure Prisma and Database Schema'
        },
        {
            'number': 9,
            'task': 'TASK-006',
            'title': 'Create Fastify Server Setup'
        }
    ]
    
    comment = """✅ This task has already been completed.

Closing this duplicate issue. The work for this task was completed earlier in the project.

Relevant completed tasks:
- TASK-001: PostgreSQL Setup ✅
- TASK-002: Redis Setup ✅
- TASK-003: API Project Structure ✅
- TASK-004: Backend Dependencies ✅
- TASK-005: Prisma & Database Schema ✅
- TASK-006: Fastify Server Setup ✅

Current focus is on TASK-007, TASK-008, and TASK-009."""
    
    print('📋 Closing completed task issues:\n')
    
    for issue in issues_to_close:
        print(f'Processing Issue #{issue["number"]}: [{issue["task"]}] {issue["title"]}')
        close_issue(issue['number'], comment)
        print()
    
    print('=' * 60)
    print('✅ Done! Check your issues at:')
    print(f'   https://github.com/{REPO_OWNER}/{REPO_NAME}/issues')
    print('\n💡 Note: GitHub does not allow deleting issues via API.')
    print('   These issues are now closed. If you need to delete them')
    print('   completely, you can do so from the GitHub UI (Settings → Danger Zone).')

if __name__ == '__main__':
    main()

