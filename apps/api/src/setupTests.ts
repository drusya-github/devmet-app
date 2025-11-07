/**
 * Global Test Setup Configuration
 * Runs before all tests to set up the test environment
 *
 * This file is automatically loaded by Jest before running tests
 * based on the setupFilesAfterEnv configuration in jest.config.js
 */

import { config } from 'dotenv';
import path from 'path';

// Load test environment variables
config({ path: path.resolve(__dirname, '../.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';

// Set test database URL if not already set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    'postgresql://devmetrics_user:devpass123@localhost:5432/devmetrics_test';
}

// Set test Redis URL if not already set
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379/1'; // Use DB 1 for tests
}

// Mock logger to prevent console spam during tests
jest.mock('./config/logger', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };

  return {
    logger: mockLogger,
  };
});

// Global test timeout (can be overridden per test)
jest.setTimeout(30000); // 30 seconds

// Suppress console.log during tests (optional, uncomment if needed)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };

/**
 * Global test lifecycle hooks
 */

// Runs before all test suites
beforeAll(async () => {
  // Setup code that runs once before all tests
  // e.g., initialize test database, start mock servers
});

// Runs after all test suites
afterAll(async () => {
  // Cleanup code that runs once after all tests
  // e.g., close database connections, stop mock servers
});

// Runs before each test
beforeEach(() => {
  // Setup code that runs before each test
  // e.g., reset mocks, clear test data
  jest.clearAllMocks();
});

// Runs after each test
afterEach(() => {
  // Cleanup code that runs after each test
  // e.g., restore mocks, clean up test data
});

/**
 * Custom Jest matchers (optional extensions)
 */

// Example: Add custom matcher for database records
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid UUID`
          : `Expected ${received} to be a valid UUID`,
    };
  },

  toBeISO8601Date(received: string | Date) {
    const dateString = received instanceof Date ? received.toISOString() : received;
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
    const pass = iso8601Regex.test(dateString);

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${dateString} not to be a valid ISO8601 date`
          : `Expected ${dateString} to be a valid ISO8601 date`,
    };
  },
});

// TypeScript declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeISO8601Date(): R;
    }
  }
}

export {};
