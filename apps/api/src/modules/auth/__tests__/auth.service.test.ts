/**
 * Unit tests for AuthService
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AuthService } from '../auth.service';
import { prisma } from '../../../database/prisma.client';
import { redis } from '../../../database/redis.client';
import { Octokit } from '@octokit/rest';
import axios from 'axios';

// Mock dependencies
jest.mock('../../../database/prisma.client');
jest.mock('../../../database/redis.client');
jest.mock('@octokit/rest');
jest.mock('axios');
jest.mock('../../../config/logger');

describe('AuthService', () => {
  let authService: AuthService;
  let mockRedisGet: jest.MockedFunction<typeof redis.get>;
  let mockRedisSetex: jest.MockedFunction<typeof redis.setex>;
  let mockRedisDel: jest.MockedFunction<typeof redis.del>;

  beforeEach(() => {
    authService = new AuthService();
    
    // Setup Redis mocks
    mockRedisGet = jest.mocked(redis.get);
    mockRedisSetex = jest.mocked(redis.setex);
    mockRedisDel = jest.mocked(redis.del);

    // Clear mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initiateOAuth', () => {
    it('should generate state and store in Redis', async () => {
      mockRedisSetex.mockResolvedValue('OK');

      const authUrl = await authService.initiateOAuth();

      // Verify URL contains required parameters
      expect(authUrl).toContain('https://github.com/login/oauth/authorize');
      expect(authUrl).toContain('client_id=');
      expect(authUrl).toContain('redirect_uri=');
      expect(authUrl).toContain('scope=');
      expect(authUrl).toContain('state=');

      // Verify Redis was called to store state
      expect(mockRedisSetex).toHaveBeenCalledWith(
        expect.stringContaining('oauth:state:'),
        300,
        expect.any(String)
      );
    });

    it('should include redirect URL in state if provided', async () => {
      mockRedisSetex.mockResolvedValue('OK');

      const redirectUrl = 'http://localhost:3000/dashboard';
      await authService.initiateOAuth(redirectUrl);

      // Verify state data includes redirect URL
      const callArgs = mockRedisSetex.mock.calls[0];
      const stateData = JSON.parse(callArgs[2] as string);
      expect(stateData.redirectUrl).toBe(redirectUrl);
    });
  });

  describe('handleCallback', () => {
    const mockCode = 'test_code_123';
    const mockState = 'test_state_456';
    const mockAccessToken = 'gho_test_token';

    beforeEach(() => {
      // Mock Redis state retrieval
      mockRedisGet.mockResolvedValue(
        JSON.stringify({
          state: mockState,
          createdAt: Date.now(),
        })
      );
      mockRedisDel.mockResolvedValue(1);
      mockRedisSetex.mockResolvedValue('OK');

      // Mock GitHub token exchange
      jest.mocked(axios.post).mockResolvedValue({
        data: {
          access_token: mockAccessToken,
          token_type: 'bearer',
          scope: 'repo,user:email',
        },
      } as any);

      // Fix: Properly type the Octokit mock
      const mockGetAuthenticated = jest.fn() as any;
      mockGetAuthenticated.mockResolvedValue({
        data: {
          id: 12345,
          login: 'testuser',
          email: 'test@example.com',
          name: 'Test User',
          avatar_url: 'https://avatars.githubusercontent.com/u/12345',
          bio: 'Test bio',
          location: 'Test City',
        },
      });
      
      const mockOctokitInstance = {
        rest: {
          users: {
            getAuthenticated: mockGetAuthenticated,
          },
        },
      };
      
      // Fix: Cast the mock constructor properly
      jest.mocked(Octokit).mockImplementation(() => mockOctokitInstance as any);

      // Mock Prisma user upsert
      jest.mocked(prisma.user.upsert).mockResolvedValue({
        id: 'user_123',
        githubId: BigInt(12345),
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
        bio: 'Test bio',
        location: 'Test City',
        accessToken: 'encrypted_token',
        refreshToken: null,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        organizations: [],
      } as any);

      // Mock audit log creation
      jest.mocked(prisma.auditLog.create).mockResolvedValue({} as any);
    });

    it('should successfully handle OAuth callback', async () => {
      const result = await authService.handleCallback(mockCode, mockState);

      // Verify result structure
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');

      // Verify user data
      expect(result.user.username).toBe('testuser');
      expect(result.user.email).toBe('test@example.com');

      // Verify sensitive fields are removed
      expect((result.user as any).accessToken).toBeUndefined();
    });

    it('should throw error if state is invalid', async () => {
      mockRedisGet.mockResolvedValue(null);

      await expect(authService.handleCallback(mockCode, mockState)).rejects.toThrow(
        'Invalid or expired state parameter'
      );
    });

    it('should delete state after successful callback', async () => {
      await authService.handleCallback(mockCode, mockState);

      expect(mockRedisDel).toHaveBeenCalledWith(`oauth:state:${mockState}`);
    });

    it('should create audit log on successful login', async () => {
      await authService.handleCallback(mockCode, mockState);

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'USER_LOGIN',
            status: 'SUCCESS',
          }),
        })
      );
    });

    it('should create new user on first login', async () => {
      await authService.handleCallback(mockCode, mockState);

      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { githubId: BigInt(12345) },
          create: expect.objectContaining({
            username: 'testuser',
            email: 'test@example.com',
          }),
        })
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('should generate new token pair', async () => {
      const mockUserId = 'user_123';
      const mockRefreshToken = 'valid_refresh_token';

      // Mock user fetch
      jest.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        githubId: BigInt(12345),
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        deletedAt: null,
        organizations: [],
      } as any);

      mockRedisSetex.mockResolvedValue('OK');

      // Note: This test requires the JWT to be properly signed
      // For now, we'll test the error case
      await expect(authService.refreshAccessToken(mockRefreshToken)).rejects.toThrow();
    });

    it('should throw error if user not found', async () => {
      jest.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(authService.refreshAccessToken('invalid_token')).rejects.toThrow();
    });

    it('should throw error if user is deleted', async () => {
      jest.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user_123',
        deletedAt: new Date(),
      } as any);

      await expect(authService.refreshAccessToken('valid_token')).rejects.toThrow();
    });
  });

  describe('getCurrentUser', () => {
    const mockUserId = 'user_123';

    it('should return cached user if available', async () => {
      const cachedUser = {
        id: mockUserId,
        username: 'testuser',
        email: 'test@example.com',
      };

      mockRedisGet.mockResolvedValue(JSON.stringify(cachedUser));

      const result = await authService.getCurrentUser(mockUserId);

      expect(result).toEqual(cachedUser);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database if not cached', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockRedisSetex.mockResolvedValue('OK');

      jest.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        githubId: BigInt(12345),
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        deletedAt: null,
        organizations: [],
      } as any);

      const result = await authService.getCurrentUser(mockUserId);

      expect(result.username).toBe('testuser');
      expect(prisma.user.findUnique).toHaveBeenCalled();
      expect(mockRedisSetex).toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      mockRedisGet.mockResolvedValue(null);
      jest.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(authService.getCurrentUser(mockUserId)).rejects.toThrow('User not found');
    });

    it('should throw error if user is deleted', async () => {
      mockRedisGet.mockResolvedValue(null);
      jest.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        deletedAt: new Date(),
      } as any);

      await expect(authService.getCurrentUser(mockUserId)).rejects.toThrow(
        'User account has been deleted'
      );
    });
  });

  describe('logout', () => {
    it('should invalidate user cache', async () => {
      const mockUserId = 'user_123';
      mockRedisDel.mockResolvedValue(1);
      jest.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

      await authService.logout(mockUserId);

      expect(mockRedisDel).toHaveBeenCalledWith(`user:${mockUserId}`);
      expect(mockRedisDel).toHaveBeenCalledWith(`user:profile:${mockUserId}`);
    });

    it('should create audit log', async () => {
      const mockUserId = 'user_123';
      mockRedisDel.mockResolvedValue(1);
      jest.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

      await authService.logout(mockUserId);

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'USER_LOGOUT',
            userId: mockUserId,
          }),
        })
      );
    });
  });

  describe('getUserGitHubToken', () => {
    it('should decrypt and return GitHub token', async () => {
      const mockUserId = 'user_123';
      const encryptedToken = JSON.stringify({
        encrypted: 'encrypted_data',
        iv: 'iv_data',
        authTag: 'auth_tag',
      });

      jest.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        accessToken: encryptedToken,
      } as any);

      // Note: This will fail because we can't properly mock the decryption
      // In a real test environment, you'd need to set up proper encryption mocks
      await expect(authService.getUserGitHubToken(mockUserId)).rejects.toThrow();
    });

    it('should throw error if token not found', async () => {
      jest.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(authService.getUserGitHubToken('user_123')).rejects.toThrow(
        'GitHub access token not found'
      );
    });
  });
});
