/**
 * Integration tests for authentication routes
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import fastify from 'fastify';
import { authRoutes } from '../auth.routes';
import { authService } from '../auth.service';
import { generateTokenPair } from '../../../utils/jwt';
import { prisma } from '../../../database/prisma.client';

// Mock dependencies
jest.mock('../auth.service');
jest.mock('../../../database/prisma.client');
jest.mock('../../../config/logger');

describe('Authentication Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = fastify();
    await app.register(authRoutes);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /github', () => {
    it('should redirect to GitHub OAuth page', async () => {
      const mockAuthUrl = 'https://github.com/login/oauth/authorize?client_id=test&state=abc123';
      jest.spyOn(authService, 'initiateOAuth').mockResolvedValue(mockAuthUrl);

      const response = await app.inject({
        method: 'GET',
        url: '/github',
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe(mockAuthUrl);
      expect(authService.initiateOAuth).toHaveBeenCalled();
    });

    it('should handle redirect URL parameter', async () => {
      const mockAuthUrl = 'https://github.com/login/oauth/authorize?client_id=test&state=abc123';
      jest.spyOn(authService, 'initiateOAuth').mockResolvedValue(mockAuthUrl);

      const response = await app.inject({
        method: 'GET',
        url: '/github?redirectUrl=http://localhost:3000/dashboard',
      });

      expect(response.statusCode).toBe(302);
      expect(authService.initiateOAuth).toHaveBeenCalledWith('http://localhost:3000/dashboard');
    });

    it('should handle errors gracefully', async () => {
      jest.spyOn(authService, 'initiateOAuth').mockRejectedValue(new Error('OAuth failed'));

      const response = await app.inject({
        method: 'GET',
        url: '/github',
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal Server Error');
    });
  });

  describe('GET /callback', () => {
    it('should handle successful OAuth callback', async () => {
      const mockAuthResponse = {
        user: {
          id: 'user_123',
          githubId: BigInt(12345),
          username: 'testuser',
          email: 'test@example.com',
          name: 'Test User',
          avatarUrl: null,
          bio: null,
          location: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date(),
          organizations: [],
        },
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_456',
        expiresIn: '1h',
      };

      jest.spyOn(authService, 'handleCallback').mockResolvedValue(mockAuthResponse);

      const response = await app.inject({
        method: 'GET',
        url: '/callback?code=test_code&state=test_state',
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain('token=access_token_123');
      expect(response.headers.location).toContain('refreshToken=refresh_token_456');
    });

    it('should redirect to error page on failure', async () => {
      jest.spyOn(authService, 'handleCallback').mockRejectedValue(
        new Error('Invalid state parameter')
      );

      const response = await app.inject({
        method: 'GET',
        url: '/callback?code=test_code&state=invalid_state',
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain('/auth/error');
      expect(response.headers.location).toContain('error=');
    });

    it('should validate required query parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/callback',
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain('/auth/error');
    });
  });

  describe('GET /me', () => {
    it('should return current user with valid token', async () => {
      const mockUser = {
        id: 'user_123',
        githubId: BigInt(12345),
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        bio: null,
        location: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
        organizations: [],
      };

      jest.spyOn(authService, 'getCurrentUser').mockResolvedValue(mockUser);

      // Generate valid token
      const tokens = generateTokenPair({
        userId: 'user_123',
        githubId: BigInt(12345),
        email: 'test@example.com',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/me',
        headers: {
          authorization: `Bearer ${tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.username).toBe('testuser');
    });

    it('should return 401 without authorization header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/me',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 401 with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/me',
        headers: {
          authorization: 'Bearer invalid_token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Unauthorized');
    });
  });

  describe('POST /refresh', () => {
    it('should refresh tokens successfully', async () => {
      const mockResponse = {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        expiresIn: '1h',
      };

      jest.spyOn(authService, 'refreshAccessToken').mockResolvedValue(mockResponse);

      const response = await app.inject({
        method: 'POST',
        url: '/refresh',
        payload: {
          refreshToken: 'valid_refresh_token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBe('new_access_token');
    });

    it('should return 401 with invalid refresh token', async () => {
      jest.spyOn(authService, 'refreshAccessToken').mockRejectedValue(
        new Error('Invalid refresh token')
      );

      const response = await app.inject({
        method: 'POST',
        url: '/refresh',
        payload: {
          refreshToken: 'invalid_token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Unauthorized');
    });

    it('should validate request body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/refresh',
        payload: {},
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /logout', () => {
    it('should logout successfully with valid token', async () => {
      jest.spyOn(authService, 'logout').mockResolvedValue();

      // Generate valid token
      const tokens = generateTokenPair({
        userId: 'user_123',
        githubId: BigInt(12345),
        email: 'test@example.com',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/logout',
        headers: {
          authorization: `Bearer ${tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Logged out');
    });

    it('should return 401 without authorization', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/logout',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Unauthorized');
    });
  });

  describe('GET /status', () => {
    it('should return authenticated status with valid token', async () => {
      const tokens = generateTokenPair({
        userId: 'user_123',
        githubId: BigInt(12345),
        email: 'test@example.com',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/status',
        headers: {
          authorization: `Bearer ${tokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.authenticated).toBe(true);
      expect(body.userId).toBe('user_123');
    });

    it('should return not authenticated without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/status',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.authenticated).toBe(false);
    });

    it('should return not authenticated with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/status',
        headers: {
          authorization: 'Bearer invalid_token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.authenticated).toBe(false);
    });
  });
});

