# Configuration Management Guide

## Overview

DevMetrics uses a centralized configuration system with **Zod validation** to ensure all environment variables are properly set and validated before the application starts.

## Features

- ✅ **Type-safe configuration** using TypeScript and Zod schemas
- ✅ **Comprehensive validation** with helpful error messages
- ✅ **Fail-fast approach** - catches configuration errors at startup
- ✅ **Default values** for optional configuration
- ✅ **Security checks** (minimum secret lengths, URL format validation)
- ✅ **Environment-specific settings** (development, production, test)

## Configuration File

Configuration is managed in `src/config/index.ts` using Zod schemas for validation.

## Environment Variables

### Required Variables

#### Database & Cache
- **DATABASE_URL**: PostgreSQL connection string
  - Format: `postgresql://username:password@host:port/database`
  - Example: `postgresql://devmetrics_user:password@localhost:5432/devmetrics`

- **REDIS_URL**: Redis connection string
  - Format: `redis://host:port`
  - Example: `redis://localhost:6379`

#### Security
- **JWT_SECRET**: Secret for JWT token signing
  - **Minimum**: 32 characters
  - Generate: `openssl rand -base64 32`

- **SESSION_SECRET**: Secret for session encryption
  - **Minimum**: 32 characters
  - Generate: `openssl rand -base64 32`

- **GITHUB_WEBHOOK_SECRET**: Secret for GitHub webhook verification
  - **Minimum**: 16 characters
  - Set this in your GitHub webhook settings

### Optional Variables

#### Server
- **NODE_ENV**: Environment (`development`, `production`, `test`)
  - Default: `development`

- **PORT**: Server port number (1-65535)
  - Default: `3001`

- **HOST**: Server host address
  - Default: `0.0.0.0`

#### GitHub OAuth
- **GITHUB_CLIENT_ID**: GitHub OAuth App Client ID
  - Optional for development
  - Required for OAuth functionality

- **GITHUB_CLIENT_SECRET**: GitHub OAuth App Client Secret
  - Optional for development
  - Required for OAuth functionality

- **GITHUB_CALLBACK_URL**: OAuth callback URL
  - Default: `http://localhost:3001/api/auth/github/callback`

#### AI Features
- **ANTHROPIC_API_KEY**: Anthropic Claude API key
  - Optional
  - Required for AI-powered features

#### Frontend
- **FRONTEND_URL**: Frontend application URL
  - Default: `http://localhost:3000`

- **CORS_ORIGIN**: Allowed CORS origin
  - Default: `http://localhost:3000`

#### Rate Limiting
- **RATE_LIMIT_MAX_REQUESTS**: Max requests per time window
  - Default: `100`

- **RATE_LIMIT_WINDOW_MS**: Time window in milliseconds
  - Default: `60000` (1 minute)

#### Logging
- **LOG_LEVEL**: Logging level (`error`, `warn`, `info`, `debug`)
  - Default: `info`

- **LOG_FILE_PATH**: Directory for log files
  - Default: `./logs`

## Setup Instructions

### 1. Copy Environment File

```bash
cp .env.example .env
```

### 2. Generate Secrets

```bash
# Generate JWT secret (32+ characters)
openssl rand -base64 32

# Generate session secret (32+ characters)
openssl rand -base64 32

# Generate webhook secret (16+ characters)
openssl rand -base64 24
```

### 3. Update Database URL

Update `DATABASE_URL` with your PostgreSQL connection details:

```env
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/devmetrics
```

### 4. Update Redis URL

Update `REDIS_URL` with your Redis connection details:

```env
REDIS_URL=redis://localhost:6379
```

### 5. Configure GitHub OAuth (Optional)

1. Create a GitHub OAuth App at https://github.com/settings/developers
2. Copy the Client ID and Client Secret
3. Update `.env`:

```env
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_CALLBACK_URL=http://localhost:3001/api/auth/github/callback
```

### 6. Add Anthropic API Key (Optional)

For AI features, get an API key from https://console.anthropic.com/:

```env
ANTHROPIC_API_KEY=sk-ant-api03-...
```

## Validation

The configuration system validates all variables at startup:

### Valid Configuration
If all variables are valid, the server starts normally:

```
✅ Configuration loaded successfully!
🚀 Server running at: http://localhost:3001
```

### Invalid Configuration
If any variables are invalid, you'll see detailed error messages:

```
❌ Configuration Validation Failed!

The following environment variables have issues:

  🔴 JWT_SECRET:
     Problem: JWT_SECRET must be at least 32 characters for security
     Current: "short"

  🔴 DATABASE_URL:
     Problem: Invalid URL
     Current: "invalid-url"

💡 Tips:
  - Check your .env file exists in the project root
  - Ensure all required variables are set
  - Verify URL formats include protocol (http://, redis://, etc.)
  - Secrets should be at least 32 characters long
```

## Accessing Configuration

### In TypeScript Code

```typescript
import { config } from './config';

// Access configuration values
console.log(config.server.port); // 3001
console.log(config.database.url); // postgresql://...
console.log(config.jwt.secret); // your-secret

// Environment helpers
import { isDevelopment, isProduction, isTest } from './config';

if (isDevelopment) {
  console.log('Running in development mode');
}
```

### Configuration Structure

```typescript
interface AppConfig {
  server: {
    port: number;
    host: string;
    nodeEnv: 'development' | 'production' | 'test';
    corsOrigin: string;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    logFilePath: string;
  };
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  rateLimit: {
    maxRequests: number;
    timeWindowMs: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  github: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
    webhookSecret: string;
  };
  anthropicApiKey: string;
  sessionSecret: string;
  frontendUrl: string;
}
```

## Best Practices

### Security

1. **Never commit `.env` files** - They contain secrets
2. **Use strong secrets** - Minimum 32 characters for JWT/Session secrets
3. **Rotate secrets regularly** - Especially in production
4. **Use different secrets** - Don't reuse the same secret for multiple purposes

### Environment-Specific Configuration

#### Development (`.env`)
```env
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/devmetrics
JWT_SECRET=dev-secret-change-in-production-min-32-chars
```

#### Production
```env
NODE_ENV=production
DATABASE_URL=postgresql://prod-host:5432/devmetrics
JWT_SECRET=<strong-random-secret-from-vault>
```

#### Testing
```env
NODE_ENV=test
DATABASE_URL=postgresql://localhost:5432/devmetrics_test
JWT_SECRET=test-secret-for-testing-min-32-chars
```

## Troubleshooting

### Error: Missing required environment variables

**Problem**: Required variables are not set in `.env`

**Solution**: Check `.env.example` and ensure all required variables are present

### Error: JWT_SECRET must be at least 32 characters

**Problem**: Secret is too short

**Solution**: Generate a proper secret:
```bash
openssl rand -base64 32
```

### Error: Invalid URL

**Problem**: Database or Redis URL is not properly formatted

**Solution**: Ensure URLs include the protocol:
- PostgreSQL: `postgresql://...`
- Redis: `redis://...`

### Error: Cannot find module

**Problem**: Configuration file is not being loaded

**Solution**: Check that `src/config/index.ts` exists and is properly exported

## Testing Configuration

### Test Valid Configuration

```bash
npx ts-node -e "
import { config } from './src/config/index';
console.log('✅ Configuration loaded successfully!');
console.log('PORT:', config.server.port);
"
```

### Test Invalid Configuration

```bash
DATABASE_URL="invalid" npm run dev
# Should show validation errors
```

## Related Files

- **Configuration**: `src/config/index.ts`
- **Type Definitions**: `src/types/server.ts`
- **Environment Template**: `.env.example`
- **Logger Configuration**: `src/config/logger.ts`

## References

- [Zod Documentation](https://zod.dev/)
- [dotenv Documentation](https://github.com/motdotla/dotenv)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
- [Redis Connection Strings](https://redis.io/docs/getting-started/)

