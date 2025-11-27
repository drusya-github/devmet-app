# DevMetrics API Testing Guide

This directory contains the complete testing framework for the DevMetrics API, including unit tests, integration tests, mock factories, and testing utilities.

## 📁 Directory Structure

```
src/__tests__/
├── README.md                      # This file
├── utils/                         # Test utilities
│   ├── index.ts                  # Central export
│   ├── factories.ts              # Mock data factories
│   ├── test-db.ts               # Database test helpers
│   └── test-helpers.ts          # General test utilities
├── example.unit.test.ts         # Example unit test
└── example.integration.test.ts  # Example integration test
```

## 🚀 Quick Start

### 1. Set Up Test Database

Create a separate test database to avoid interfering with development data:

```bash
# Connect to PostgreSQL
psql postgres

# Create test database
CREATE DATABASE devmetrics_test;

# Grant permissions (if not already done)
GRANT ALL PRIVILEGES ON DATABASE devmetrics_test TO devmetrics_user;
```

### 2. Create Test Environment File

Create `.env.test` in the `apps/api` directory:

```bash
# Environment
NODE_ENV=test

# Database
DATABASE_URL=postgresql://devmetrics_user:devpass123@localhost:5432/devmetrics_test

# Redis
REDIS_URL=redis://localhost:6379/1

# JWT
JWT_SECRET=test_jwt_secret_key_for_testing_only
JWT_EXPIRES_IN=1h

# Other variables...
```

### 3. Run Database Migrations

```bash
cd apps/api
npm run db:migrate
```

### 4. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📝 Writing Tests

### Unit Tests

Unit tests focus on testing individual functions or components in isolation.

```typescript
import { describe, it, expect } from '@jest/globals';
import { createMockUser } from './utils/factories';

describe('User Service', () => {
  it('should create a user', () => {
    const user = createMockUser({ email: 'test@example.com' });
    
    expect(user.email).toBe('test@example.com');
    expect(user).toHaveProperty('id');
  });
});
```

### Integration Tests

Integration tests test the interaction between components, including database operations.

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  getTestPrismaClient,
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from './utils/test-db';

describe('User Repository Integration', () => {
  let prisma: ReturnType<typeof getTestPrismaClient>;

  beforeAll(async () => {
    await connectTestDatabase();
    prisma = getTestPrismaClient();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  it('should create a user in the database', async () => {
    const user = await prisma.user.create({
      data: {
        githubId: BigInt(12345),
        email: 'test@example.com',
        name: 'Test User',
        accessToken: 'mock_token',
      },
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe('test@example.com');
  });
});
```

## 🛠 Test Utilities

### Mock Factories

Create realistic test data quickly:

```typescript
import {
  createMockUser,
  createMockOrganization,
  createMockRepository,
  createMockCommit,
  createMockPullRequest,
  createMockBatch,
} from './utils/factories';

// Create a single mock user
const user = createMockUser();

// Create with overrides
const admin = createMockUser({ 
  email: 'admin@example.com',
  name: 'Admin User'
});

// Create multiple instances
const users = createMockBatch(createMockUser, 5);
```

### Database Helpers

Manage test database state:

```typescript
import {
  getTestPrismaClient,
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
  seedTestDatabase,
  withTransaction,
} from './utils/test-db';

// Get test database client
const prisma = getTestPrismaClient();

// Clear all data
await clearTestDatabase();

// Seed with basic data
const { users, organizations, repositories } = await seedTestDatabase({
  users: 3,
  organizations: 2,
  repositories: 5,
});

// Run test in transaction (auto-rollback)
await withTransaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  // ... test code ...
});
```

### Mock Helpers

Create mock objects for testing:

```typescript
import {
  createMockRedis,
  createMockRequest,
  createMockReply,
  createMockOctokit,
  createMockClaudeClient,
  createMockJWT,
} from './utils/test-helpers';

// Mock Redis client
const redis = createMockRedis();
await redis.set('key', 'value');
const value = await redis.get('key');

// Mock Fastify request/reply
const request = createMockRequest({
  headers: { authorization: 'Bearer token' },
  params: { id: '123' },
});
const reply = createMockReply();

// Mock GitHub client
const octokit = createMockOctokit();
octokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({
  data: [/* repo data */],
});
```

## 📊 Coverage Requirements

The project enforces minimum coverage thresholds:

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

To check coverage:

```bash
npm run test:coverage
```

View the HTML coverage report:

```bash
open coverage/lcov-report/index.html
```

## 🎯 Best Practices

### 1. Test Organization

```typescript
describe('Feature Name', () => {
  describe('Subfeature or Method', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = doSomething(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### 2. Use Descriptive Test Names

❌ Bad:
```typescript
it('works', () => { ... });
```

✅ Good:
```typescript
it('should return 401 when user is not authenticated', () => { ... });
```

### 3. Clean Up After Tests

```typescript
beforeEach(async () => {
  await clearTestDatabase();
  resetFactories();
});

afterAll(async () => {
  await disconnectTestDatabase();
});
```

### 4. Mock External Dependencies

```typescript
// Mock external API calls
jest.mock('@octokit/rest');

// Mock internal modules
jest.mock('../services/github.service');
```

### 5. Test Edge Cases

```typescript
describe('User validation', () => {
  it('should accept valid email', () => { ... });
  it('should reject invalid email', () => { ... });
  it('should reject empty email', () => { ... });
  it('should reject null email', () => { ... });
  it('should reject email with special characters', () => { ... });
});
```

## 🔧 Debugging Tests

### Run Specific Test File

```bash
npm test -- example.unit.test.ts
```

### Run Tests Matching Pattern

```bash
npm test -- --testNamePattern="User Service"
```

### Run in Debug Mode

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then attach your debugger to the Node process.

### View Test Output

```bash
npm test -- --verbose
```

## 🚨 Common Issues

### Issue: Database connection fails

**Solution**: Ensure PostgreSQL is running and the test database exists:

```bash
brew services start postgresql@15
psql -U devmetrics_user -d devmetrics_test -h localhost
```

### Issue: Redis connection fails

**Solution**: Ensure Redis is running:

```bash
brew services start redis
redis-cli ping  # Should return PONG
```

### Issue: Tests timeout

**Solution**: Increase test timeout in jest.config.js or per-test:

```typescript
it('slow test', async () => {
  // test code
}, 30000); // 30 second timeout
```

### Issue: Flaky tests

**Solution**: Use retry helper:

```typescript
import { retry } from './utils/test-db';

it('potentially flaky test', async () => {
  await retry(async () => {
    // test code that might fail occasionally
  }, 3, 1000); // 3 attempts, 1 second delay
});
```

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing/integration-testing)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## 🤝 Contributing

When adding new features, please:

1. Write unit tests for business logic
2. Write integration tests for database operations
3. Aim for >70% code coverage
4. Add mock factories for new models
5. Update this README if adding new test utilities

---

**Happy Testing! 🎉**

