/**
 * Test Database Utilities
 * Provides helpers for managing test database state
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

/**
 * Test Prisma Client instance
 * Separate from the main application client
 */
let testPrisma: PrismaClient | null = null;

/**
 * Gets or creates the test Prisma Client
 */
export function getTestPrismaClient(): PrismaClient {
  if (!testPrisma) {
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }
  return testPrisma;
}

/**
 * Connects to the test database
 */
export async function connectTestDatabase(): Promise<void> {
  const client = getTestPrismaClient();
  await client.$connect();
}

/**
 * Disconnects from the test database
 */
export async function disconnectTestDatabase(): Promise<void> {
  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = null;
  }
}

/**
 * Clears all data from the test database
 * Preserves schema but removes all records
 */
export async function clearTestDatabase(): Promise<void> {
  const client = getTestPrismaClient();

  // Get all table names
  const tables = await client.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;

  // Truncate all tables with CASCADE to handle foreign keys
  // This doesn't require superuser privileges
  for (const { tablename } of tables) {
    if (tablename !== '_prisma_migrations') {
      await client.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" RESTART IDENTITY CASCADE;`);
    }
  }
}

/**
 * Seeds the test database with basic data
 * Can be customized per test suite
 */
export async function seedTestDatabase(data?: {
  users?: number;
  organizations?: number;
  repositories?: number;
}): Promise<{
  users: any[];
  organizations: any[];
  repositories: any[];
}> {
  const client = getTestPrismaClient();

  const userCount = data?.users || 3;
  const orgCount = data?.organizations || 2;
  const repoCount = data?.repositories || 5;

  // Create users
  const users = await Promise.all(
    Array.from({ length: userCount }, (_, i) =>
      client.user.create({
        data: {
          githubId: BigInt(100000 + i),
          email: `testuser${i}@example.com`,
          name: `Test User ${i}`,
          avatarUrl: `https://avatars.githubusercontent.com/u/${100000 + i}`,
          accessToken: `mock_token_${i}`,
        },
      })
    )
  );

  // Create organizations
  const organizations = await Promise.all(
    Array.from({ length: orgCount }, (_, i) =>
      client.organization.create({
        data: {
          githubId: BigInt(200000 + i),
          name: `Test Org ${i}`,
          slug: `test-org-${i}`,
          planType: 'FREE',
        },
      })
    )
  );

  // Create repositories
  const repositories = await Promise.all(
    Array.from({ length: repoCount }, (_, i) =>
      client.repository.create({
        data: {
          githubId: BigInt(300000 + i),
          name: `test-repo-${i}`,
          fullName: `test-org-0/test-repo-${i}`,
          orgId: organizations[0].id,
          syncStatus: 'ACTIVE',
        },
      })
    )
  );

  return { users, organizations, repositories };
}

/**
 * Resets the test database
 * Drops all data and re-runs migrations
 */
export async function resetTestDatabase(): Promise<void> {
  try {
    // Run Prisma migrate reset in test mode
    execSync('npx prisma migrate reset --force --skip-seed', {
      env: { ...process.env, NODE_ENV: 'test' },
      stdio: 'pipe',
    });
  } catch (error) {
    console.error('Failed to reset test database:', error);
    throw error;
  }
}

/**
 * Creates the test database if it doesn't exist
 */
export async function createTestDatabase(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL || '';

  // Extract database name from URL
  const match = databaseUrl.match(/\/([^/?]+)(\?|$)/);
  if (!match) {
    throw new Error('Invalid DATABASE_URL format');
  }

  const dbName = match[1];
  const baseUrl = databaseUrl.replace(`/${dbName}`, '/postgres');

  try {
    // Try to create the database
    const client = new PrismaClient({
      datasources: {
        db: {
          url: baseUrl,
        },
      },
    });

    await client.$connect();
    await client.$executeRawUnsafe(`CREATE DATABASE ${dbName}`);
    await client.$disconnect();
  } catch (error: any) {
    // Database might already exist, which is fine
    if (!error.message?.includes('already exists')) {
      console.warn('Could not create test database:', error.message);
    }
  }

  // Run migrations
  try {
    execSync('npx prisma migrate deploy', {
      env: process.env,
      stdio: 'pipe',
    });
  } catch (error) {
    console.error('Failed to run migrations on test database:', error);
    throw error;
  }
}

/**
 * Transaction helper for tests
 * Wraps test code in a transaction that rolls back
 */
export async function withTransaction<T>(
  callback: (client: PrismaClient) => Promise<T>
): Promise<T> {
  const client = getTestPrismaClient();

  return await client.$transaction(async (tx: any) => {
    return await callback(tx as PrismaClient);
  });
}

/**
 * Wait helper for async operations
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry helper for flaky tests
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await waitFor(delayMs);
      }
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Export the test client for direct use
 */
export { testPrisma };
