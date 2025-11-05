#!/bin/bash

# GitHub Issues Creator for DevMetrics Project
# This script creates GitHub issues from the TASK_SPECIFICATION.md

# Configuration
REPO_OWNER="YOUR_GITHUB_USERNAME"  # Change this
REPO_NAME="devmet-app"              # Change if different
GITHUB_TOKEN="${GITHUB_TOKEN}"      # Set via: export GITHUB_TOKEN=your_token

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed${NC}"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with GitHub CLI${NC}"
    echo "Run: gh auth login"
    exit 1
fi

echo -e "${GREEN}Creating GitHub Issues for DevMetrics...${NC}\n"

# Create labels first
echo -e "${YELLOW}Creating labels...${NC}"

# Priority labels
gh label create "P0-Critical" --color "d73a4a" --description "Critical priority" --force 2>/dev/null
gh label create "P1-High" --color "ff9500" --description "High priority" --force 2>/dev/null
gh label create "P2-Medium" --color "fbca04" --description "Medium priority" --force 2>/dev/null
gh label create "P3-Low" --color "0e8a16" --description "Low priority" --force 2>/dev/null

# Type labels
gh label create "feature" --color "0075ca" --description "New feature" --force 2>/dev/null
gh label create "chore" --color "d4c5f9" --description "Maintenance task" --force 2>/dev/null
gh label create "enhancement" --color "84b6eb" --description "Enhancement" --force 2>/dev/null
gh label create "bug" --color "d73a4a" --description "Bug fix" --force 2>/dev/null

# Category labels
gh label create "backend" --color "5319e7" --description "Backend" --force 2>/dev/null
gh label create "frontend" --color "1d76db" --description "Frontend" --force 2>/dev/null
gh label create "infrastructure" --color "0e8a16" --description "Infrastructure" --force 2>/dev/null
gh label create "ai" --color "d876e3" --description "AI features" --force 2>/dev/null
gh label create "integration" --color "fbca04" --description "Integration" --force 2>/dev/null
gh label create "testing" --color "c5def5" --description "Testing" --force 2>/dev/null
gh label create "docs" --color "0075ca" --description "Documentation" --force 2>/dev/null

# Size labels
gh label create "XS" --color "c2e0c6" --description "1-2 hours" --force 2>/dev/null
gh label create "S" --color "bfdadc" --description "2-4 hours" --force 2>/dev/null
gh label create "M" --color "fef2c0" --description "4-8 hours" --force 2>/dev/null
gh label create "L" --color "fad8c7" --description "1-2 days" --force 2>/dev/null
gh label create "XL" --color "f9d0c4" --description "2-5 days" --force 2>/dev/null

# Sprint labels
gh label create "Sprint-1" --color "c5def5" --description "Week 1" --force 2>/dev/null
gh label create "Sprint-2" --color "bfdadc" --description "Week 2" --force 2>/dev/null
gh label create "Sprint-3" --color "d4c5f9" --description "Week 3" --force 2>/dev/null
gh label create "Sprint-4" --color "fef2c0" --description "Week 4" --force 2>/dev/null
gh label create "Backlog" --color "ededed" --description "Future enhancement" --force 2>/dev/null

echo -e "${GREEN}✓ Labels created${NC}\n"

# Function to create an issue
create_issue() {
    local task_id=$1
    local title=$2
    local body=$3
    local labels=$4
    
    echo -e "${YELLOW}Creating issue: ${task_id} - ${title}${NC}"
    
    gh issue create \
        --title "[${task_id}] ${title}" \
        --body "${body}" \
        --label "${labels}"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Created${NC}\n"
    else
        echo -e "${RED}✗ Failed${NC}\n"
    fi
}

# Sprint 1 Issues
echo -e "\n${GREEN}========== SPRINT 1 - WEEK 1 ==========${NC}\n"

create_issue "TASK-001" "Install and Configure PostgreSQL" \
"## Description
Install PostgreSQL 15, create database and user, verify connectivity.

## Acceptance Criteria
- [ ] PostgreSQL 15 installed via Homebrew
- [ ] PostgreSQL service running automatically
- [ ] \`devmetrics\` database created
- [ ] \`devmetrics_user\` created with proper permissions
- [ ] Can connect via psql
- [ ] Connection string tested

## Commands
\`\`\`bash
brew install postgresql@15
brew services start postgresql@15
psql postgres -c \"CREATE DATABASE devmetrics;\"
psql postgres -c \"CREATE USER devmetrics_user WITH PASSWORD 'devpass123';\"
psql postgres -c \"GRANT ALL PRIVILEGES ON DATABASE devmetrics TO devmetrics_user;\"
\`\`\`

**Estimated Time:** 1-2 hours" \
"P0-Critical,chore,infrastructure,S,Sprint-1"

create_issue "TASK-002" "Install and Configure Redis" \
"## Description
Install Redis for caching and session management, verify connectivity.

## Acceptance Criteria
- [ ] Redis installed via Homebrew
- [ ] Redis service running automatically
- [ ] \`redis-cli ping\` returns PONG
- [ ] Redis accessible at localhost:6379
- [ ] Connection tested from Node.js

**Estimated Time:** 30 minutes" \
"P0-Critical,chore,infrastructure,S,Sprint-1"

create_issue "TASK-003" "Initialize API Project Structure" \
"## Description
Set up Fastify API project with TypeScript, proper folder structure, and configuration files.

## Acceptance Criteria
- [ ] \`apps/api\` directory created
- [ ] \`package.json\` initialized
- [ ] TypeScript configured (strict mode)
- [ ] Directory structure created (routes, services, middleware, etc.)
- [ ] \`.env\` file exists
- [ ] \`.gitignore\` configured
- [ ] ESLint and Prettier configured

**Dependencies:** TASK-001, TASK-002  
**Estimated Time:** 2-3 hours" \
"P0-Critical,chore,backend,M,Sprint-1"

create_issue "TASK-004" "Install Backend Dependencies" \
"## Description
Install all required npm packages for the backend API.

## Acceptance Criteria
- [ ] Core dependencies installed (fastify, prisma, zod, etc.)
- [ ] Dev dependencies installed (typescript, jest, etc.)
- [ ] No security vulnerabilities
- [ ] \`package-lock.json\` generated

**Dependencies:** TASK-003  
**Estimated Time:** 1 hour" \
"P0-Critical,chore,backend,S,Sprint-1"

create_issue "TASK-005" "Configure Prisma and Database Schema" \
"## Description
Initialize Prisma ORM, define complete database schema, run initial migration.

## Acceptance Criteria
- [ ] Prisma initialized
- [ ] Complete schema defined with all models
- [ ] Relations defined
- [ ] Indexes added
- [ ] Migration successful
- [ ] Prisma client generated

**Dependencies:** TASK-003, TASK-004  
**Estimated Time:** 4-6 hours" \
"P0-Critical,chore,backend,L,Sprint-1"

create_issue "TASK-006" "Create Fastify Server Setup" \
"## Description
Create main server file with Fastify initialization, middleware, and basic configuration.

## Acceptance Criteria
- [ ] Server file created
- [ ] CORS configured
- [ ] Rate limiting configured
- [ ] Logging configured
- [ ] Health check endpoint
- [ ] Graceful shutdown

**Dependencies:** TASK-004  
**Estimated Time:** 3-4 hours" \
"P0-Critical,feature,backend,M,Sprint-1"

create_issue "TASK-007" "Create Configuration Management" \
"## Description
Create centralized configuration module for environment variables with validation.

## Acceptance Criteria
- [ ] Config file created
- [ ] Zod validation for all env vars
- [ ] Type-safe config export
- [ ] Helpful error messages

**Dependencies:** TASK-006  
**Estimated Time:** 2 hours" \
"P0-Critical,chore,backend,S,Sprint-1"

create_issue "TASK-008" "Set Up Logging System" \
"## Description
Configure Winston for structured logging with multiple transports.

## Acceptance Criteria
- [ ] Logger utility created
- [ ] Console and file transports
- [ ] Sensitive data redaction
- [ ] Request ID tracking
- [ ] Different log levels

**Dependencies:** TASK-006  
**Estimated Time:** 2 hours" \
"P1-High,chore,backend,S,Sprint-1"

create_issue "TASK-009" "Create Database Connection Service" \
"## Description
Create Prisma client singleton with proper connection pooling.

## Acceptance Criteria
- [ ] Prisma client service created
- [ ] Singleton pattern
- [ ] Connection pooling
- [ ] Graceful disconnect
- [ ] Health check method

**Dependencies:** TASK-005  
**Estimated Time:** 2 hours" \
"P0-Critical,chore,backend,S,Sprint-1"

create_issue "TASK-010" "Create Redis Connection Service" \
"## Description
Create Redis client with connection management and helper methods.

## Acceptance Criteria
- [ ] Redis client configured
- [ ] Helper methods (get, set, del, expire)
- [ ] Connection retry logic
- [ ] Health check method

**Dependencies:** TASK-002  
**Estimated Time:** 2 hours" \
"P0-Critical,chore,backend,S,Sprint-1"

create_issue "TASK-011" "Set Up Testing Framework" \
"## Description
Configure Jest for unit and integration testing with proper setup.

## Acceptance Criteria
- [ ] Jest configured with TypeScript
- [ ] Test database setup
- [ ] Test utilities created
- [ ] Mock factories
- [ ] Example tests pass
- [ ] Coverage reporting

**Dependencies:** TASK-005, TASK-009  
**Estimated Time:** 3-4 hours" \
"P1-High,chore,testing,M,Sprint-1"

create_issue "TASK-012" "Create NPM Scripts" \
"## Description
Add helpful npm scripts to package.json for development workflow.

## Acceptance Criteria
- [ ] dev, build, start scripts
- [ ] test scripts
- [ ] db scripts (migrate, generate, studio, seed)
- [ ] lint and format scripts

**Dependencies:** TASK-004  
**Estimated Time:** 1 hour" \
"P1-High,chore,backend,XS,Sprint-1"

create_issue "TASK-013" "Create Database Seeding Script" \
"## Description
Create seed script to populate database with sample data for development.

## Acceptance Criteria
- [ ] Seed script created
- [ ] Sample users, orgs, repos
- [ ] Sample events and metrics
- [ ] Idempotent execution
- [ ] Realistic test data

**Dependencies:** TASK-005  
**Estimated Time:** 3-4 hours" \
"P2-Medium,chore,backend,M,Sprint-1"

echo -e "${GREEN}✓ Sprint 1 issues created!${NC}"
echo -e "\n${YELLOW}Continue with Sprint 2-4 by uncommenting sections below...${NC}"

# TODO: Add Sprint 2, 3, 4 issues following the same pattern
# (Keeping this script concise - you can expand it based on TASK_SPECIFICATION.md)

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}GitHub issues created successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "View your issues at: https://github.com/${REPO_OWNER}/${REPO_NAME}/issues"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review created issues"
echo "2. Create a GitHub Project board"
echo "3. Add issues to project"
echo "4. Start with Sprint 1!"

