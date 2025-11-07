/**
 * Unit tests for logger functionality
 * Tests sensitive data redaction and logging behavior
 */

import { logger } from '../src/config/logger';
import winston from 'winston';
import path from 'path';
import fs from 'fs';

describe('Logger', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spy on the logger's log method
    logSpy = jest.spyOn(logger, 'log');
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  describe('Basic Logging', () => {
    it('should log info messages', () => {
      logger.info('Test info message');
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
          message: 'Test info message',
        })
      );
    });

    it('should log error messages', () => {
      logger.error('Test error message');
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          message: 'Test error message',
        })
      );
    });

    it('should log warn messages', () => {
      logger.warn('Test warn message');
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'warn',
          message: 'Test warn message',
        })
      );
    });

    it('should log debug messages', () => {
      logger.debug('Test debug message');
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'debug',
          message: 'Test debug message',
        })
      );
    });

    it('should include metadata in logs', () => {
      logger.info('Test with metadata', { userId: 123, action: 'login' });
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
          message: 'Test with metadata',
          userId: 123,
          action: 'login',
        })
      );
    });
  });

  describe('Sensitive Data Redaction', () => {
    it('should redact password fields', () => {
      const sensitiveData = {
        username: 'testuser',
        password: 'supersecret123',
        email: 'test@example.com',
      };

      logger.info('User data', sensitiveData);

      const logCall = logSpy.mock.calls[0][0];
      expect(logCall.password).not.toBe('supersecret123');
      expect(logCall.password).toBe('[REDACTED]');
      expect(logCall.username).toBe('testuser');
      expect(logCall.email).toBe('test@example.com');
    });

    it('should redact token fields', () => {
      const sensitiveData = {
        userId: 123,
        token: 'abc123xyz789secrettoken',
        accessToken: 'access_token_here',
      };

      logger.info('Auth data', sensitiveData);

      const logCall = logSpy.mock.calls[0][0];
      expect(logCall.token).toMatch(/ab\*\*\*en/); // Shows first 2 and last 2 chars
      expect(logCall.accessToken).toMatch(/ac\*\*\*re/);
      expect(logCall.userId).toBe(123);
    });

    it('should redact API keys', () => {
      const sensitiveData = {
        apiKey: 'sk_test_1234567890abcdef',
        api_key: 'another_secret_key',
      };

      logger.info('API credentials', sensitiveData);

      const logCall = logSpy.mock.calls[0][0];
      expect(logCall.apiKey).not.toBe('sk_test_1234567890abcdef');
      expect(logCall.api_key).not.toBe('another_secret_key');
    });

    it('should redact authorization headers', () => {
      const requestData = {
        method: 'POST',
        url: '/api/auth',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        },
      };

      logger.info('HTTP Request', requestData);

      const logCall = logSpy.mock.calls[0][0];
      expect(logCall.headers.authorization).not.toBe('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(logCall.method).toBe('POST');
      expect(logCall.url).toBe('/api/auth');
    });

    it('should redact nested sensitive data', () => {
      const nestedData = {
        user: {
          id: 123,
          name: 'John Doe',
          credentials: {
            password: 'secret123',
            githubToken: 'ghp_1234567890abcdef',
          },
        },
        requestId: 'req-123',
      };

      logger.info('Nested data', nestedData);

      const logCall = logSpy.mock.calls[0][0];
      expect(logCall.user.credentials.password).toBe('[REDACTED]');
      expect(logCall.user.credentials.githubToken).not.toBe('ghp_1234567890abcdef');
      expect(logCall.user.name).toBe('John Doe');
      expect(logCall.requestId).toBe('req-123');
    });

    it('should redact sensitive fields in arrays', () => {
      const arrayData = {
        users: [
          { id: 1, name: 'Alice', password: 'alicepass' },
          { id: 2, name: 'Bob', password: 'bobpass' },
        ],
      };

      logger.info('User list', arrayData);

      const logCall = logSpy.mock.calls[0][0];
      expect(logCall.users[0].password).toBe('[REDACTED]');
      expect(logCall.users[1].password).toBe('[REDACTED]');
      expect(logCall.users[0].name).toBe('Alice');
      expect(logCall.users[1].name).toBe('Bob');
    });

    it('should redact multiple sensitive field types', () => {
      const multiSensitive = {
        username: 'testuser',
        password: 'pass123',
        token: 'token123',
        secret: 'secret123',
        apiKey: 'key123',
        sessionSecret: 'session123',
        privateKey: 'private123',
      };

      logger.info('Multi sensitive', multiSensitive);

      const logCall = logSpy.mock.calls[0][0];
      expect(logCall.password).toBe('[REDACTED]');
      expect(logCall.token).toBe('[REDACTED]');
      expect(logCall.secret).toBe('[REDACTED]');
      expect(logCall.apiKey).toBe('[REDACTED]');
      expect(logCall.sessionSecret).not.toBe('session123');
      expect(logCall.privateKey).not.toBe('private123');
      expect(logCall.username).toBe('testuser');
    });

    it('should handle null and undefined values', () => {
      const dataWithNulls = {
        username: 'testuser',
        password: null,
        token: undefined,
        active: true,
      };

      logger.info('Data with nulls', dataWithNulls);

      const logCall = logSpy.mock.calls[0][0];
      expect(logCall.username).toBe('testuser');
      expect(logCall.active).toBe(true);
      // Null/undefined should be handled gracefully
    });

    it('should not redact non-sensitive fields', () => {
      const normalData = {
        userId: 123,
        username: 'testuser',
        email: 'test@example.com',
        createdAt: '2024-01-01',
        isActive: true,
        roles: ['user', 'admin'],
      };

      logger.info('Normal data', normalData);

      const logCall = logSpy.mock.calls[0][0];
      expect(logCall.userId).toBe(123);
      expect(logCall.username).toBe('testuser');
      expect(logCall.email).toBe('test@example.com');
      expect(logCall.createdAt).toBe('2024-01-01');
      expect(logCall.isActive).toBe(true);
      expect(logCall.roles).toEqual(['user', 'admin']);
    });
  });

  describe('Request ID Tracking', () => {
    it('should include requestId in log metadata', () => {
      const requestId = 'req-abc-123';
      logger.info('Request received', { requestId, method: 'GET', url: '/api/users' });

      const logCall = logSpy.mock.calls[0][0];
      expect(logCall.requestId).toBe(requestId);
      expect(logCall.method).toBe('GET');
      expect(logCall.url).toBe('/api/users');
    });

    it('should maintain requestId across multiple log entries', () => {
      const requestId = 'req-xyz-789';
      
      logger.info('Request start', { requestId });
      logger.info('Processing request', { requestId });
      logger.info('Request complete', { requestId });

      expect(logSpy).toHaveBeenCalledTimes(3);
      expect(logSpy.mock.calls[0][0].requestId).toBe(requestId);
      expect(logSpy.mock.calls[1][0].requestId).toBe(requestId);
      expect(logSpy.mock.calls[2][0].requestId).toBe(requestId);
    });
  });

  describe('Error Logging', () => {
    it('should log error objects with stack traces', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', { error: error.message, stack: error.stack });

      const logCall = logSpy.mock.calls[0][0];
      expect(logCall.error).toBe('Test error');
      expect(logCall.stack).toBeDefined();
      expect(logCall.stack).toContain('Error: Test error');
    });

    it('should include context with errors', () => {
      const error = new Error('Database connection failed');
      logger.error('DB Error', {
        error: error.message,
        stack: error.stack,
        database: 'postgres',
        retries: 3,
      });

      const logCall = logSpy.mock.calls[0][0];
      expect(logCall.error).toBe('Database connection failed');
      expect(logCall.database).toBe('postgres');
      expect(logCall.retries).toBe(3);
    });
  });

  describe('Log Transports', () => {
    it('should have console transport configured', () => {
      const transports = logger.transports;
      const consoleTransport = transports.find(
        (t) => t instanceof winston.transports.Console
      );
      expect(consoleTransport).toBeDefined();
    });

    it('should have file transports in non-test environment', () => {
      // This test checks configuration, actual file transports
      // may be disabled in test environment
      if (process.env.NODE_ENV !== 'test') {
        const transports = logger.transports;
        const fileTransports = transports.filter(
          (t) => t instanceof winston.transports.File
        );
        expect(fileTransports.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance', () => {
    it('should handle high-frequency logging without errors', () => {
      const iterations = 100;
      
      expect(() => {
        for (let i = 0; i < iterations; i++) {
          logger.info(`Log message ${i}`, { iteration: i });
        }
      }).not.toThrow();

      expect(logSpy).toHaveBeenCalledTimes(iterations);
    });

    it('should handle deeply nested objects without infinite recursion', () => {
      const deepObject = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  level6: {
                    level7: {
                      level8: {
                        level9: {
                          level10: {
                            data: 'deep data',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      expect(() => {
        logger.info('Deep object', deepObject);
      }).not.toThrow();
    });
  });
});

