# DevMetrics API Setup Guide

Complete step-by-step guide to configure and run the DevMetrics Backend API.

---

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- [ ] **Node.js 20.x or higher** - [Download](https://nodejs.org/)
- [ ] **PostgreSQL 15+** - [Download](https://www.postgresql.org/download/)
- [ ] **Redis 7.x** - [Download](https://redis.io/download/)
- [ ] **Git** installed
- [ ] **GitHub Account** for OAuth
- [ ] **Anthropic API Key** for AI features (optional for MVP)

---

## Step 1: Install Required Software

### Install Node.js
```bash
# Check if installed
node --version  # Should be 20.x or higher
npm --version

# If not installed, download from: https://nodejs.org/
```

### Install PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15

# Verify installation
psql --version
```

**macOS (using Postgres.app):**
- Download from [postgresapp.com](https://postgresapp.com/)
- Install and start Postgres.app

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
- Download from [postgresql.org](https://www.postgresql.org/download/windows/)
- Run installer and follow prompts

### Install Redis

**macOS (using Homebrew):**
```bash
brew install redis
brew services start redis

# Verify installation
redis-cli ping  # Should return PONG
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**Windows:**
- Download from [redis.io](https://redis.io/download/)
- Or use WSL2 with Linux instructions

### Install TimescaleDB Extension (Optional but Recommended)

**macOS:**
```bash
brew tap timescale/tap
brew install timescaledb
timescaledb-tune --quiet --yes
```

**Linux:**
```bash
sudo add-apt-repository ppa:timescale/timescaledb-ppa
sudo apt update
sudo apt install timescaledb-postgresql-15
sudo timescaledb-tune --quiet --yes
```

---

## Step 2: Create Project Directory Structure

```bash
cd /Users/chandradrusya/Desktop/devmet-app

# Create backend API directory
mkdir -p apps/api
cd apps/api

# Initialize Node.js project
npm init -y

# Create directory structure
mkdir -p src/{config,modules,middleware,services,utils,types,database/prisma,workers,queues}
mkdir -p logs tests
```

---

## Step 3: Install Backend Dependencies

```bash
cd /Users/chandradrusya/Desktop/devmet-app/apps/api

# Core dependencies
npm install --save \
  fastify \
  @fastify/cors \
  @fastify/helmet \
  @fastify/rate-limit \
  socket.io \
  @prisma/client \
  dotenv \
  zod \
  bcrypt \
  jsonwebtoken \
  axios \
  @octokit/rest \
  @anthropic-ai/sdk \
  ioredis \
  bull \
  bullmq \
  winston \
  pino \
  pino-pretty

# Development dependencies
npm install --save-dev \
  typescript \
  @types/node \
  @types/bcrypt \
  @types/jsonwebtoken \
  ts-node \
  ts-node-dev \
  prisma \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  eslint \
  jest \
  @types/jest \
  ts-jest \
  supertest \
  @types/supertest
```

---

## Step 4: Configure TypeScript

Create `tsconfig.json`:

```bash
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "types": ["node", "jest"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
EOF
```

---

## Step 5: Set Up Database

### Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql postgres

# In psql prompt:
CREATE DATABASE devmetrics;
CREATE USER devmetrics_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE devmetrics TO devmetrics_user;

# Enable TimescaleDB extension (if installed)
\c devmetrics
CREATE EXTENSION IF NOT EXISTS timescaledb;

# Exit psql
\q
```

### Test Database Connection

```bash
psql -U devmetrics_user -d devmetrics -h localhost
# Enter password when prompted
# If successful, you'll see the devmetrics prompt
\q
```

---

## Step 6: Set Up GitHub OAuth App

### Create GitHub OAuth Application

1. Go to [GitHub Settings > Developer Settings > OAuth Apps](https://github.com/settings/developers)
2. Click **"New OAuth App"**
3. Fill in details:
   - **Application name**: `DevMetrics (Development)`
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/auth/callback`
4. Click **"Register application"**
5. Copy the **Client ID**
6. Click **"Generate a new client secret"** and copy it
7. **Save both values** - you'll need them for `.env`

### Generate Webhook Secret

```bash
# Generate a random webhook secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy this value for later use.

---

## Step 7: Get Anthropic API Key (for AI Features)

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to **API Keys**
4. Click **"Create Key"**
5. Copy the API key (starts with `sk-ant-`)
6. **Important**: This key is shown only once!

---

## Step 8: Create Environment Configuration

Create `.env` file:

```bash
cd /Users/chandradrusya/Desktop/devmet-app/apps/api

cat > .env << 'EOF'
# ============================================
# DevMetrics API Configuration
# ============================================

# Environment
NODE_ENV=development
PORT=3001
LOG_LEVEL=info

# ============================================
# Database Configuration
# ============================================
DATABASE_URL=postgresql://devmetrics_user:your_secure_password@localhost:5432/devmetrics

# ============================================
# Redis Configuration
# ============================================
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# ============================================
# GitHub OAuth Configuration
# ============================================
# Replace with your values from Step 6
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_WEBHOOK_SECRET=your_generated_webhook_secret_here

# OAuth Callback URL
GITHUB_CALLBACK_URL=http://localhost:3000/auth/callback

# ============================================
# JWT Configuration
# ============================================
# Generate a secure secret:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your_generated_jwt_secret_here
JWT_EXPIRES_IN=7d

# ============================================
# Anthropic Claude API (AI Features)
# ============================================
# Replace with your API key from Step 7
ANTHROPIC_API_KEY=sk-ant-your-api-key-here

# ============================================
# Slack Integration (Optional)
# ============================================
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_SIGNING_SECRET=your-slack-signing-secret

# ============================================
# Discord Integration (Optional)
# ============================================
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-url

# ============================================
# Email Configuration (Optional)
# ============================================
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=DevMetrics <noreply@devmetrics.io>

# ============================================
# Frontend Configuration
# ============================================
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# ============================================
# API Configuration
# ============================================
API_BASE_URL=http://localhost:3001

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# ============================================
# Monitoring (Optional)
# ============================================
SENTRY_DSN=
DATADOG_API_KEY=

# ============================================
# Worker Configuration
# ============================================
WORKER_CONCURRENCY=5
QUEUE_RETRY_ATTEMPTS=3
QUEUE_RETRY_DELAY=2000

EOF
```

### Generate Required Secrets

```bash
# Generate JWT Secret
echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")"

# Generate Webhook Secret (if you haven't already)
echo "GITHUB_WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
```

**Add these generated values to your `.env` file!**

---

## Step 9: Initialize Prisma (Database ORM)

```bash
cd /Users/chandradrusya/Desktop/devmet-app/apps/api

# Initialize Prisma
npx prisma init

# This creates:
# - prisma/schema.prisma
# - Updates .env with DATABASE_URL
```

### Configure Prisma Schema

Edit `prisma/schema.prisma` with the schema from `Backend.md`:

```bash
cat > prisma/schema.prisma << 'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
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

// Events
model Event {
  id           String   @id @default(uuid())
  repositoryId String
  type         String
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
  estimatedReviewTime  Int
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
  prCycleTime          Float
  deploymentFrequency  Int
  buildSuccessRate     Float
  
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
EOF
```

### Run Prisma Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Create initial migration
npx prisma migrate dev --name init

# This will:
# - Create all tables in the database
# - Generate Prisma Client
```

---

## Step 10: Create Basic Package.json Scripts

Update `package.json`:

```bash
cat > package.json << 'EOF'
{
  "name": "@devmetrics/api",
  "version": "1.0.0",
  "description": "DevMetrics Backend API",
  "main": "dist/server.js",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio",
    "db:seed": "ts-node prisma/seed.ts",
    "lint": "eslint src --ext .ts",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "keywords": ["devmetrics", "analytics", "github"],
  "author": "DevMetrics Team",
  "license": "MIT"
}
EOF
```

---

## Step 11: Test Database Connection

Create a test file:

```bash
cat > src/test-db.ts << 'EOF'
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Testing database connection...\n');
  
  try {
    await prisma.$connect();
    console.log('✓ Database connection successful!');
    
    // Test query
    const count = await prisma.user.count();
    console.log(`✓ Database query successful! Users in database: ${count}`);
    
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
EOF

# Run test
npx ts-node src/test-db.ts
```

---

## Step 12: Test Redis Connection

Create Redis test:

```bash
cat > src/test-redis.ts << 'EOF'
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function main() {
  console.log('Testing Redis connection...\n');
  
  try {
    await redis.ping();
    console.log('✓ Redis connection successful!');
    
    // Test set/get
    await redis.set('test-key', 'test-value');
    const value = await redis.get('test-key');
    console.log(`✓ Redis operations successful! Value: ${value}`);
    
    await redis.del('test-key');
    
  } catch (error) {
    console.error('✗ Redis connection failed:', error);
    process.exit(1);
  } finally {
    redis.disconnect();
  }
}

main();
EOF

# Run test
npx ts-node src/test-redis.ts
```

---

## Step 13: Update MCP Server Configuration

Update the MCP server `.env` to point to your API:

```bash
cd /Users/chandradrusya/Desktop/devmet-app/mcp-server

cat > .env << 'EOF'
# DevMetrics API Configuration
DEVMETRICS_API_URL=http://localhost:3001/api
DEVMETRICS_API_KEY=
DEVMETRICS_AUTH_TOKEN=

# Server Configuration
MCP_SERVER_NAME=devmetrics
MCP_SERVER_VERSION=1.0.0

# Logging
LOG_LEVEL=info
EOF
```

---

## Step 14: Verify All Configuration

Run verification script:

```bash
cd /Users/chandradrusya/Desktop/devmet-app/apps/api

cat > verify-setup.sh << 'EOF'
#!/bin/bash

echo "DevMetrics API Configuration Verification"
echo "==========================================="
echo ""

# Check Node.js
echo "✓ Checking Node.js..."
node --version || echo "✗ Node.js not found"

# Check PostgreSQL
echo "✓ Checking PostgreSQL..."
psql --version || echo "✗ PostgreSQL not found"

# Check Redis
echo "✓ Checking Redis..."
redis-cli ping > /dev/null 2>&1 && echo "✓ Redis is running" || echo "✗ Redis not running"

# Check .env file
echo "✓ Checking .env file..."
[ -f .env ] && echo "✓ .env file exists" || echo "✗ .env file missing"

# Check Prisma
echo "✓ Checking Prisma..."
[ -f prisma/schema.prisma ] && echo "✓ Prisma schema exists" || echo "✗ Prisma schema missing"

# Check dependencies
echo "✓ Checking node_modules..."
[ -d node_modules ] && echo "✓ Dependencies installed" || echo "✗ Run 'npm install'"

echo ""
echo "==========================================="
echo "Setup verification complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your GitHub OAuth credentials"
echo "2. Update .env with your Anthropic API key"
echo "3. Run: npm run dev"
EOF

chmod +x verify-setup.sh
./verify-setup.sh
```

---

## 📝 Configuration Checklist

### Required Configuration

- [ ] **PostgreSQL** installed and running
- [ ] **Redis** installed and running
- [ ] **Database** created (`devmetrics`)
- [ ] **Database user** created with permissions
- [ ] **.env file** created with all variables
- [ ] **GitHub OAuth App** created
  - [ ] Client ID added to `.env`
  - [ ] Client Secret added to `.env`
  - [ ] Webhook Secret generated and added
- [ ] **JWT Secret** generated and added to `.env`
- [ ] **Prisma** schema configured
- [ ] **Prisma migrations** run
- [ ] **Dependencies** installed

### Optional Configuration

- [ ] **Anthropic API Key** for AI features
- [ ] **Slack** bot token (if using Slack notifications)
- [ ] **Discord** webhook URL (if using Discord notifications)
- [ ] **Email** SMTP settings (if using email notifications)
- [ ] **Sentry DSN** (if using error tracking)

---

## 🚀 Starting the API

Once everything is configured:

```bash
cd /Users/chandradrusya/Desktop/devmet-app/apps/api

# Development mode (with auto-reload)
npm run dev

# Production build
npm run build
npm start
```

The API should start at: **http://localhost:3001**

---

## 🧪 Testing the API

```bash
# Health check
curl http://localhost:3001/health

# Should return: {"status":"ok","version":"1.0.0"}
```

---

## 🔧 Troubleshooting

### Database Connection Failed

```bash
# Check PostgreSQL is running
brew services list | grep postgresql

# Start PostgreSQL if not running
brew services start postgresql@15

# Test connection manually
psql -U devmetrics_user -d devmetrics -h localhost
```

### Redis Connection Failed

```bash
# Check Redis is running
redis-cli ping

# Start Redis if not running
brew services start redis
```

### Port Already in Use

```bash
# Find what's using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>
```

### Prisma Errors

```bash
# Reset database (WARNING: Deletes all data!)
npx prisma migrate reset

# Regenerate Prisma Client
npx prisma generate
```

---

## 📚 Next Steps

After configuration:

1. **Implement the API** following `Backend.md` architecture
2. **Build the Frontend** following `Frontend.md` architecture
3. **Test MCP Server** integration
4. **Set up CI/CD** pipeline
5. **Deploy** to production

---

## 🆘 Getting Help

- **Backend Architecture**: See `Backend.md`
- **Frontend Architecture**: See `Frontend.md`
- **MCP Server**: See `mcp-server/README.md`
- **Issues**: [GitHub Issues](https://github.com/drusya-github/devmet-app/issues)

---

**Configuration complete!** 🎉 You're ready to build the DevMetrics API!

