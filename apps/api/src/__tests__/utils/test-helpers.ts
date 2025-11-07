/**
 * Test Helper Functions
 * Common utilities for testing
 */

import Redis from 'ioredis';

/**
 * Mock Redis Client for tests
 */
export function createMockRedis(): any {
  const storage = new Map<string, any>();
  const expirations = new Map<string, number>();

  return {
    get: jest.fn(async (key: string) => {
      const expiration = expirations.get(key);
      if (expiration && Date.now() > expiration) {
        storage.delete(key);
        expirations.delete(key);
        return null;
      }
      return storage.get(key) || null;
    }),

    set: jest.fn(async (key: string, value: any, ...args: any[]) => {
      storage.set(key, value);

      // Handle EX option
      const exIndex = args.findIndex((arg) => arg === 'EX');
      if (exIndex !== -1 && args[exIndex + 1]) {
        const seconds = args[exIndex + 1];
        expirations.set(key, Date.now() + seconds * 1000);
      }

      return 'OK' as const;
    }),

    del: jest.fn(async (...keys: string[]) => {
      let deleted = 0;
      for (const key of keys) {
        if (storage.has(key)) {
          storage.delete(key);
          expirations.delete(key);
          deleted++;
        }
      }
      return deleted;
    }),

    expire: jest.fn(async (key: string, seconds: number) => {
      if (storage.has(key)) {
        expirations.set(key, Date.now() + seconds * 1000);
        return 1;
      }
      return 0;
    }),

    exists: jest.fn(async (key: string) => {
      return storage.has(key) ? 1 : 0;
    }),

    ttl: jest.fn(async (key: string) => {
      const expiration = expirations.get(key);
      if (!expiration) return -1;
      const remaining = Math.floor((expiration - Date.now()) / 1000);
      return remaining > 0 ? remaining : -2;
    }),

    keys: jest.fn(async (pattern: string) => {
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
      return Array.from(storage.keys()).filter((key) => regex.test(key));
    }),

    flushall: jest.fn(async () => {
      storage.clear();
      expirations.clear();
      return 'OK' as const;
    }),

    ping: jest.fn(async () => 'PONG' as const),

    connect: jest.fn(async () => undefined),
    quit: jest.fn(async () => 'OK' as const),
    disconnect: jest.fn(async () => undefined),

    on: jest.fn(() => ({})),

    info: jest.fn(async () => 'used_memory_human:1M\r\n'),
  };
}

/**
 * Mock Fastify Request
 */
export function createMockRequest(overrides?: any) {
  return {
    headers: {},
    query: {},
    params: {},
    body: {},
    user: null,
    log: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    },
    ...overrides,
  };
}

/**
 * Mock Fastify Reply
 */
export function createMockReply() {
  const reply = {
    code: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis(),
    headers: jest.fn().mockReturnThis(),
    type: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
  };

  return reply;
}

/**
 * Mock GitHub API Response
 */
export function createMockGitHubResponse<T>(data: T, headers?: Record<string, string>) {
  return {
    data,
    status: 200,
    headers: {
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '4999',
      'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
      ...headers,
    },
  };
}

/**
 * Mock Octokit Instance
 */
export function createMockOctokit() {
  return {
    rest: {
      repos: {
        listForAuthenticatedUser: jest.fn(),
        get: jest.fn(),
        listCommits: jest.fn(),
        createWebhook: jest.fn(),
        deleteWebhook: jest.fn(),
      },
      pulls: {
        list: jest.fn(),
        get: jest.fn(),
        listCommits: jest.fn(),
        listFiles: jest.fn(),
      },
      issues: {
        listForRepo: jest.fn(),
        get: jest.fn(),
      },
      users: {
        getAuthenticated: jest.fn(),
        getByUsername: jest.fn(),
      },
      orgs: {
        listForAuthenticatedUser: jest.fn(),
      },
    },
    paginate: jest.fn(),
  };
}

/**
 * Mock Anthropic Claude Client
 */
export function createMockClaudeClient() {
  return {
    messages: {
      create: jest.fn().mockResolvedValue({
        id: 'msg_test123',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'This is a mock AI response for testing.',
          },
        ],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 100,
          output_tokens: 50,
        },
      }),
    },
  };
}

/**
 * Mock Bull Queue
 */
export function createMockQueue() {
  return {
    add: jest.fn().mockResolvedValue({ id: 'job_123' }),
    process: jest.fn(),
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
    getJob: jest.fn(),
    getJobs: jest.fn().mockResolvedValue([]),
    clean: jest.fn().mockResolvedValue([]),
  };
}

/**
 * Wait for condition to be true
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Compare objects ignoring specific fields
 */
export function compareObjectsIgnoring<T extends Record<string, any>>(
  obj1: T,
  obj2: T,
  ignoreFields: string[]
): boolean {
  const filtered1 = { ...obj1 };
  const filtered2 = { ...obj2 };

  for (const field of ignoreFields) {
    delete filtered1[field];
    delete filtered2[field];
  }

  return JSON.stringify(filtered1) === JSON.stringify(filtered2);
}

/**
 * Generate a random string
 */
export function randomString(length: number = 10): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
}

/**
 * Generate a random integer
 */
export function randomInt(min: number = 0, max: number = 100): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Mock JWT token
 */
export function createMockJWT(payload?: any): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const data = Buffer.from(
    JSON.stringify({
      userId: 'user_123',
      role: 'MEMBER',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...payload,
    })
  ).toString('base64');
  const signature = 'mock_signature';

  return `${header}.${data}.${signature}`;
}

/**
 * Extract data from paginated response
 */
export function extractPaginatedData<T>(response: { data: T[]; pagination?: any }): T[] {
  return response.data;
}

/**
 * Mock environment variables for test
 */
export function mockEnv(vars: Record<string, string>): () => void {
  const originalEnv = { ...process.env };

  Object.assign(process.env, vars);

  // Return cleanup function
  return () => {
    process.env = originalEnv;
  };
}

/**
 * Suppress console output during test
 */
export function suppressConsole(): () => void {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
  };

  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
  console.info = jest.fn();

  // Return cleanup function
  return () => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
  };
}

/**
 * Create a mock file for upload testing
 */
export function createMockFile(
  filename: string = 'test.txt',
  content: string = 'test content',
  mimetype: string = 'text/plain'
) {
  return {
    filename,
    mimetype,
    encoding: '7bit',
    data: Buffer.from(content),
    size: content.length,
  };
}

/**
 * Assert async function throws
 */
export async function expectAsyncThrow(
  fn: () => Promise<any>,
  errorMessage?: string | RegExp
): Promise<void> {
  let thrown = false;

  try {
    await fn();
  } catch (error) {
    thrown = true;
    if (errorMessage) {
      if (typeof errorMessage === 'string') {
        expect((error as Error).message).toContain(errorMessage);
      } else {
        expect((error as Error).message).toMatch(errorMessage);
      }
    }
  }

  if (!thrown) {
    throw new Error('Expected function to throw an error, but it did not');
  }
}
