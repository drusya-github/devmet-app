# Database Connection Services

This module provides robust database connection services for the DevMetrics API, including:
- **PostgreSQL** via Prisma ORM
- **Redis** via IORedis

## Features

- ✅ **Singleton Pattern**: Prevents multiple database connections
- ✅ **Connection Pooling**: Optimized connection management
- ✅ **Retry Logic**: Automatic retry with exponential backoff
- ✅ **Health Checks**: Monitor database connectivity
- ✅ **Graceful Shutdown**: Clean disconnection on server stop
- ✅ **Query Logging**: Detailed logging in development mode (Prisma)
- ✅ **Error Handling**: Comprehensive error tracking
- ✅ **Helper Methods**: Convenient Redis operations (get, set, del, etc.)
- ✅ **Session Management**: Built-in session storage utilities
- ✅ **Cache Invalidation**: Pattern-based cache clearing

## Usage

---

## PostgreSQL (Prisma)

### Basic Usage

```typescript
import { prisma } from './database';

// Use Prisma client directly
const users = await prisma.user.findMany();
```

### Connection Management

```typescript
import { connectDatabase, disconnectDatabase } from './database';

// Connect to database (with automatic retry)
await connectDatabase();

// Disconnect from database
await disconnectDatabase();
```

### Health Check

```typescript
import { checkDatabaseHealth } from './database';

const health = await checkDatabaseHealth();

if (health.healthy) {
  console.log(`Database is healthy (latency: ${health.latency}ms)`);
} else {
  console.error(`Database is unhealthy: ${health.error}`);
}
```

### Retry Logic for Operations

```typescript
import { withRetry, prisma } from './database';

// Automatically retry failed operations
const result = await withRetry(async () => {
  return await prisma.user.findUnique({
    where: { id: userId },
  });
}, 3); // Retry up to 3 times
```

### Check Connection Status

```typescript
import { isConnectedToDatabase } from './database';

if (isConnectedToDatabase()) {
  console.log('Database is connected');
}
```

---

## Redis

### Basic Usage

```typescript
import { redis, get, set, del } from './database';

// Use Redis client directly
await redis.ping(); // 'PONG'

// Or use helper methods
await set('user:123', 'John Doe', 300); // Set with 5-minute TTL
const name = await get('user:123'); // Get value
await del('user:123'); // Delete key
```

### Connection Management

```typescript
import { connectRedis, disconnectRedis } from './database';

// Connect to Redis (with automatic retry)
await connectRedis();

// Disconnect from Redis
await disconnectRedis();
```

### Health Check

```typescript
import { checkRedisHealth } from './database';

const health = await checkRedisHealth();

if (health.healthy) {
  console.log(`Redis is healthy (latency: ${health.latency}ms)`);
  console.log(`Memory usage: ${health.details?.memoryUsage}`);
} else {
  console.error(`Redis is unhealthy: ${health.error}`);
}
```

### Basic Operations

```typescript
import { get, getJSON, set, setJSON, del, expire, exists, ttl } from './database';

// String operations
await set('key', 'value'); // Set without TTL
await set('key', 'value', 300); // Set with 5-minute TTL
const value = await get('key'); // Get value

// JSON operations
await setJSON('user:123', { id: 123, name: 'John' }, 900); // Store object
const user = await getJSON('user:123'); // Retrieve and parse object

// Key management
await del('key1', 'key2', 'key3'); // Delete multiple keys
await expire('key', 600); // Set expiration to 10 minutes
const keyExists = await exists('key'); // Check if key exists
const remaining = await ttl('key'); // Get remaining TTL in seconds
```

### Session Management

```typescript
import {
  setSession,
  getSession,
  deleteSession,
  extendSession,
  DEFAULT_TTL,
} from './database';

// Store session data
await setSession('session-abc123', {
  userId: 123,
  role: 'admin',
  loginAt: Date.now(),
}); // Uses DEFAULT_TTL.SESSION (24 hours)

// Custom TTL
await setSession('session-xyz789', sessionData, 3600); // 1 hour

// Retrieve session
const session = await getSession('session-abc123');
if (session) {
  console.log(`User ID: ${session.userId}`);
}

// Extend session TTL (refresh on activity)
await extendSession('session-abc123'); // Extends by 24 hours
await extendSession('session-abc123', 7200); // Extends by 2 hours

// Delete session (logout)
await deleteSession('session-abc123');
```

### Cache Invalidation

```typescript
import { invalidateCache, deletePattern, flushAll } from './database';

// Invalidate all cache entries for a resource type
await invalidateCache('user'); // Deletes cache:user:*

// Invalidate cache for specific resource
await invalidateCache('user', 123); // Deletes cache:user:123:*

// Delete keys matching custom pattern
await deletePattern('temp:*'); // Deletes all temp keys

// Clear entire Redis database (USE WITH CAUTION!)
await flushAll();
```

### Default TTL Constants

```typescript
import { DEFAULT_TTL } from './database';

DEFAULT_TTL.SHORT    // 300 seconds (5 minutes)
DEFAULT_TTL.MEDIUM   // 900 seconds (15 minutes)
DEFAULT_TTL.LONG     // 3600 seconds (1 hour)
DEFAULT_TTL.SESSION  // 86400 seconds (24 hours)
DEFAULT_TTL.WEEK     // 604800 seconds (7 days)
```

### Check Connection Status

```typescript
import { isConnectedToRedis } from './database';

if (isConnectedToRedis()) {
  console.log('Redis is connected');
}
```

---

## Configuration

The database connections are configured through environment variables:

```env
# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/devmetrics

# Redis
REDIS_URL=redis://localhost:6379
```

## Retry Configuration

The connection retry logic uses exponential backoff:

- **Max Retries**: 3 attempts
- **Initial Delay**: 1 second
- **Max Delay**: 10 seconds
- **Backoff Multiplier**: 2x

## Query Logging

In development mode, all queries are logged with:
- Query SQL
- Query parameters
- Execution duration

In production mode, only errors and warnings are logged.

## Connection Pooling

Prisma automatically manages connection pooling with sensible defaults:
- Connection pool is managed by Prisma
- Connections are reused efficiently
- Idle connections are cleaned up automatically

## Error Handling

All database operations should be wrapped in try-catch blocks:

```typescript
try {
  const user = await prisma.user.create({
    data: { name: 'John Doe', email: 'john@example.com' },
  });
} catch (error) {
  logger.error('Failed to create user', { error });
  throw error;
}
```

For automatic retry on transient errors, use the `withRetry` helper:

```typescript
const user = await withRetry(async () => {
  return await prisma.user.findUnique({ where: { id } });
});
```

## Graceful Shutdown

The service automatically handles graceful shutdown on SIGINT and SIGTERM signals through the main server file.

## Testing

For testing, you can use a separate test database:

```typescript
import { getPrismaClient } from './database';

const testClient = getPrismaClient();

// Run your tests
await testClient.user.deleteMany(); // Clean up
```

## Best Practices

1. **Always use the singleton instance**: Import `prisma` from this module
2. **Don't create new PrismaClient instances**: Use `getPrismaClient()` if needed
3. **Let the service handle connections**: Don't call `$connect()` or `$disconnect()` directly
4. **Use retry logic for critical operations**: Wrap important queries with `withRetry()`
5. **Monitor health checks**: Regularly check database health in production
6. **Handle errors gracefully**: Always catch and log database errors

## Troubleshooting

### Connection Failures

If the database connection fails:
1. Check DATABASE_URL is correct
2. Verify PostgreSQL is running
3. Ensure network connectivity
4. Check database credentials
5. Review logs for error details

### Slow Queries

If queries are slow:
1. Enable query logging in development
2. Check for missing indexes
3. Use Prisma Studio to inspect data
4. Profile slow queries
5. Consider query optimization

### Connection Pool Exhaustion

If you see connection pool errors:
1. Check for unclosed connections
2. Review concurrent query patterns
3. Consider increasing pool size
4. Look for long-running transactions
5. Implement connection timeout limits

## Related Files

- `prisma/schema.prisma` - Database schema
- `src/config/index.ts` - Configuration
- `src/config/logger.ts` - Logging
- `src/server.ts` - Server startup and shutdown

## Task Reference

This module implements:
- **TASK-009: Create Database Connection Service (Prisma/PostgreSQL)** 
- **TASK-010: Create Redis Connection Service**

Both from the DevMetrics project specification.

