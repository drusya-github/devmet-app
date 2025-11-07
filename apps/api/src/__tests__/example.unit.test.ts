/**
 * Example Unit Test
 * Demonstrates how to write unit tests using the test utilities
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  createMockUser,
  createMockRepository,
  createMockCommit,
  createMockBatch,
  resetFactories,
} from './utils/factories';
import { createMockRedis, randomString } from './utils/test-helpers';

describe('Example Unit Tests', () => {
  beforeEach(() => {
    resetFactories();
  });

  describe('Mock Factories', () => {
    it('should create a mock user with default values', () => {
      const user = createMockUser();

      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('githubId');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('name');
      expect(user.email).toMatch(/^user\d+@example\.com$/);
    });

    it('should create a mock user with custom overrides', () => {
      const customEmail = 'custom@example.com';
      const user = createMockUser({ email: customEmail });

      expect(user.email).toBe(customEmail);
    });

    it('should create multiple mock users with unique IDs', () => {
      const users = createMockBatch(createMockUser, 5);

      expect(users).toHaveLength(5);
      const ids = users.map((u) => u.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });

    it('should create a mock repository with relations', () => {
      const org = { id: 'org-123' };
      const repo = createMockRepository({ orgId: org.id });

      expect(repo.orgId).toBe('org-123');
      expect(repo).toHaveProperty('githubId');
      expect(repo).toHaveProperty('name');
      expect(repo.syncStatus).toBe('ACTIVE');
    });

    it('should create a mock commit with realistic data', () => {
      const commit = createMockCommit();

      expect(commit).toHaveProperty('sha');
      expect(commit.sha).toHaveLength(40);
      expect(commit).toHaveProperty('message');
      expect(commit.additions).toBeGreaterThan(0);
      expect(commit.deletions).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Mock Redis Client', () => {
    it('should get and set values', async () => {
      const redis = createMockRedis();

      await redis.set!('key1', 'value1');
      const value = await redis.get!('key1');

      expect(value).toBe('value1');
      expect(redis.set).toHaveBeenCalledWith('key1', 'value1');
      expect(redis.get).toHaveBeenCalledWith('key1');
    });

    it('should handle key expiration', async () => {
      const redis = createMockRedis();

      await redis.set!('key1', 'value1', 'EX', 1);
      const ttl = await redis.ttl!('key1');

      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(1);
    });

    it('should delete keys', async () => {
      const redis = createMockRedis();

      await redis.set!('key1', 'value1');
      await redis.set!('key2', 'value2');
      const deleted = await redis.del!('key1', 'key2');

      expect(deleted).toBe(2);
      const value1 = await redis.get!('key1');
      const value2 = await redis.get!('key2');
      expect(value1).toBeNull();
      expect(value2).toBeNull();
    });

    it('should check if key exists', async () => {
      const redis = createMockRedis();

      await redis.set!('existing', 'value');
      const exists = await redis.exists!('existing');
      const notExists = await redis.exists!('non-existing');

      expect(exists).toBe(1);
      expect(notExists).toBe(0);
    });
  });

  describe('Helper Functions', () => {
    it('should generate random strings', () => {
      const str1 = randomString(10);
      const str2 = randomString(10);

      expect(str1).toHaveLength(10);
      expect(str2).toHaveLength(10);
      expect(str1).not.toBe(str2);
    });

    it('should generate sequential IDs', () => {
      resetFactories();
      const user1 = createMockUser();
      const user2 = createMockUser();

      expect(user1.email).toMatch(/user1@/);
      expect(user2.email).toMatch(/user2@/);
    });
  });

  describe('Data Validation', () => {
    it('should validate user data structure', () => {
      const user = createMockUser();

      // Required fields
      expect(user.id).toBeDefined();
      expect(user.githubId).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.name).toBeDefined();
      expect(user.accessToken).toBeDefined();

      // Timestamps
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);

      // Optional fields
      expect(user).toHaveProperty('avatarUrl');
      expect(user).toHaveProperty('refreshToken');
    });

    it('should validate repository data structure', () => {
      const repo = createMockRepository();

      expect(repo.id).toBeDefined();
      expect(repo.githubId).toBeDefined();
      expect(repo.name).toBeDefined();
      expect(repo.fullName).toBeDefined();
      expect(repo.orgId).toBeDefined();

      // Status fields
      expect(['PENDING', 'SYNCING', 'ACTIVE', 'ERROR', 'PAUSED']).toContain(repo.syncStatus);

      // Numeric fields
      expect(typeof repo.webhookRateLimit).toBe('number');
    });
  });

  describe('Business Logic Example', () => {
    it('should calculate total code changes in a commit', () => {
      const commit = createMockCommit({
        additions: 50,
        deletions: 20,
      });

      const totalChanges = commit.additions + commit.deletions;

      expect(totalChanges).toBe(70);
    });

    it('should determine if PR is large based on changes', () => {
      const smallPR = createMockCommit({
        additions: 50,
        deletions: 20,
      });

      const largePR = createMockCommit({
        additions: 500,
        deletions: 200,
      });

      const isLargePR = (commit: typeof smallPR) => {
        return commit.additions + commit.deletions > 500;
      };

      expect(isLargePR(smallPR)).toBe(false);
      expect(isLargePR(largePR)).toBe(true);
    });
  });
});
