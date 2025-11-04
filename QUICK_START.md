# DevMetrics Quick Start Guide

**TL;DR** - Get DevMetrics API running in 15 minutes

---

## ⚡ Prerequisites (5 minutes)

```bash
# Install via Homebrew (macOS)
brew install node@20 postgresql@15 redis

# Start services
brew services start postgresql@15
brew services start redis

# Verify
node --version    # Should be 20.x
psql --version    # Should be 15.x
redis-cli ping    # Should return PONG
```

---

## 🗄️ Database Setup (3 minutes)

```bash
# Create database and user
psql postgres << EOF
CREATE DATABASE devmetrics;
CREATE USER devmetrics_user WITH PASSWORD 'devpass123';
GRANT ALL PRIVILEGES ON DATABASE devmetrics TO devmetrics_user;
\q
EOF

# Test connection
psql -U devmetrics_user -d devmetrics -h localhost
# Enter password: devpass123
# Type \q to exit
```

---

## 🔑 Get API Keys (5 minutes)

### 1. GitHub OAuth App
1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - Name: `DevMetrics Local`
   - Homepage: `http://localhost:3000`
   - Callback: `http://localhost:3000/auth/callback`
4. Copy **Client ID** and **Client Secret**

### 2. Anthropic API Key (Optional)
1. Go to https://console.anthropic.com/
2. Create account / Sign in
3. Go to API Keys → Create Key
4. Copy the key (starts with `sk-ant-`)

### 3. Generate Secrets
```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Webhook Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🚀 API Setup (2 minutes)

```bash
# Create API directory
cd /Users/chandradrusya/Desktop/devmet-app
mkdir -p apps/api && cd apps/api

# Initialize project
npm init -y

# Create .env file
cat > .env << 'EOF'
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL=postgresql://devmetrics_user:devpass123@localhost:5432/devmetrics

# Redis
REDIS_URL=redis://localhost:6379

# GitHub OAuth (REPLACE THESE!)
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
GITHUB_WEBHOOK_SECRET=your_generated_webhook_secret_here
GITHUB_CALLBACK_URL=http://localhost:3000/auth/callback

# JWT (REPLACE THIS!)
JWT_SECRET=your_generated_jwt_secret_here
JWT_EXPIRES_IN=7d

# Anthropic (REPLACE THIS!)
ANTHROPIC_API_KEY=sk-ant-your-api-key-here

# Frontend
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
EOF
```

**⚠️ IMPORTANT**: Replace the placeholder values with your actual keys!

---

## 📦 Install Dependencies (2 minutes)

```bash
# Core dependencies
npm install --save \
  fastify @fastify/cors @fastify/helmet @fastify/rate-limit \
  socket.io @prisma/client dotenv zod bcrypt jsonwebtoken \
  axios @octokit/rest @anthropic-ai/sdk ioredis bull winston

# Dev dependencies
npm install --save-dev \
  typescript @types/node ts-node-dev prisma \
  @types/bcrypt @types/jsonwebtoken jest supertest
```

---

## 🔧 Initialize Prisma (1 minute)

```bash
# Initialize
npx prisma init

# The schema is in API_SETUP_GUIDE.md - copy it to prisma/schema.prisma
# Or download the complete schema

# Run migrations
npx prisma migrate dev --name init
npx prisma generate
```

---

## ✅ Verify Setup

```bash
# Test database
npx ts-node -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => console.log('✓ Database connected!'))
  .catch(e => console.error('✗ Database failed:', e))
  .finally(() => prisma.\$disconnect());
"

# Test Redis
redis-cli ping  # Should return PONG
```

---

## 🎯 MCP Server Connection

```bash
cd /Users/chandradrusya/Desktop/devmet-app/mcp-server

# Update .env
cat > .env << 'EOF'
DEVMETRICS_API_URL=http://localhost:3001/api
DEVMETRICS_AUTH_TOKEN=
EOF
```

---

## 🏃 Run the API

```bash
cd /Users/chandradrusya/Desktop/devmet-app/apps/api

# Development mode
npm run dev

# Should see:
# Server running on http://localhost:3001
```

Test it:
```bash
curl http://localhost:3001/health
# {"status":"ok"}
```

---

## 📝 Configuration Summary

| Service | URL | Status |
|---------|-----|--------|
| **API** | http://localhost:3001 | ⚙️ Configure |
| **Frontend** | http://localhost:3000 | 📋 Todo |
| **PostgreSQL** | localhost:5432 | ✅ Ready |
| **Redis** | localhost:6379 | ✅ Ready |
| **MCP Server** | stdio | ✅ Ready |

---

## 🆘 Common Issues

### "Cannot connect to database"
```bash
# Check PostgreSQL is running
brew services list | grep postgresql

# Start if needed
brew services start postgresql@15
```

### "Cannot connect to Redis"
```bash
# Start Redis
brew services start redis
```

### "Port 3001 already in use"
```bash
# Find and kill process
lsof -i :3001
kill -9 <PID>
```

---

## 📚 Full Documentation

For detailed setup:
- **Complete Guide**: `API_SETUP_GUIDE.md`
- **Backend Architecture**: `Backend.md`
- **Frontend Architecture**: `Frontend.md`
- **MCP Server**: `mcp-server/README.md`

---

## ✨ What's Next?

1. ✅ Database configured
2. ✅ API keys obtained
3. ✅ Environment configured
4. 🔨 **Build API** (follow Backend.md)
5. 🎨 **Build Frontend** (follow Frontend.md)
6. 🤖 **Use MCP Server** (ask Claude questions!)

---

**Ready to code!** 🚀 See `Backend.md` for implementation details.

