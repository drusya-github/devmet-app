/**
 * Centralized configuration management with Zod validation
 * Loads and validates all environment variables with type safety
 */

import dotenv from 'dotenv';
import { z } from 'zod';
import { AppConfig } from '../types/server';

// Load environment variables
dotenv.config();

/**
 * Zod schema for environment variables
 * Provides comprehensive validation with helpful error messages
 */
const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development')
    .describe('Application environment'),

  PORT: z
    .string()
    .default('3001')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(65535))
    .describe('Server port number (1-65535)'),

  HOST: z.string().default('0.0.0.0').describe('Server host address'),

  // Database Configuration
  DATABASE_URL: z
    .string()
    .url()
    .startsWith('postgresql://')
    .describe('PostgreSQL database connection URL (required)'),

  // Redis Configuration
  REDIS_URL: z.string().url().startsWith('redis://').optional().default('redis://localhost:6379').describe('Redis connection URL'),
  REDIS_HOST: z.string().default('localhost').describe('Redis host'),
  REDIS_PORT: z.string().default('6379').transform((val) => parseInt(val, 10)).pipe(z.number().int().positive()).describe('Redis port'),

  // JWT Configuration
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters for security')
    .describe('Secret key for JWT token signing (min 32 characters)'),

  JWT_EXPIRES_IN: z
    .string()
    .default('1h')
    .describe('JWT token expiration time (e.g., "1h", "24h", "30m")'),

  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters for security')
    .describe('Secret key for refresh token signing (min 32 characters)'),

  JWT_REFRESH_EXPIRES_IN: z
    .string()
    .default('7d')
    .describe('JWT refresh token expiration time (e.g., "7d", "30d")'),

  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters for security')
    .optional()
    .default('')
    .describe('Secret key for session encryption (min 32 characters)'),

  // GitHub Configuration
  GITHUB_CLIENT_ID: z.string().min(1, 'GITHUB_CLIENT_ID is required').describe('GitHub OAuth App Client ID'),

  GITHUB_CLIENT_SECRET: z
    .string()
    .min(1, 'GITHUB_CLIENT_SECRET is required')
    .describe('GitHub OAuth App Client Secret'),

  GITHUB_APP_ID: z
    .string()
    .optional()
    .default('')
    .describe('GitHub App ID (optional)'),

  GITHUB_REDIRECT_URI: z
    .string()
    .url()
    .default('http://localhost:3001/api/auth/callback')
    .describe('GitHub OAuth redirect URI'),

  GITHUB_OAUTH_SCOPES: z
    .string()
    .default('repo,user:email,read:org')
    .describe('GitHub OAuth scopes (comma-separated)'),

  GITHUB_WEBHOOK_SECRET: z
    .string()
    .min(16, 'GITHUB_WEBHOOK_SECRET should be at least 16 characters')
    .describe('Secret for verifying GitHub webhook signatures (min 16 characters)'),

  GITHUB_WEBHOOK_PROXY_URL: z
    .string()
    .url()
    .optional()
    .default('')
    .describe('Webhook proxy URL for local development (e.g., smee.io)'),

  // Encryption Configuration
  ENCRYPTION_KEY: z
    .string()
    .min(64, 'ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
    .describe('Encryption key for sensitive data (64 hex chars)'),

  ENCRYPTION_ALGORITHM: z
    .string()
    .default('aes-256-gcm')
    .describe('Encryption algorithm'),

  // API URLs
  API_URL: z
    .string()
    .url()
    .default('http://localhost:3001')
    .describe('API server URL'),

  // AI Configuration
  ANTHROPIC_API_KEY: z
    .string()
    .optional()
    .default('')
    .describe('Anthropic Claude API key (optional)'),

  // CORS and Frontend
  FRONTEND_URL: z
    .string()
    .url()
    .default('http://localhost:3000')
    .describe('Frontend application URL'),

  CORS_ORIGIN: z.string().default('http://localhost:3000').describe('Allowed CORS origin'),

  // Rate Limiting
  RATE_LIMIT_MAX_REQUESTS: z
    .string()
    .default('100')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive())
    .describe('Maximum requests per time window'),

  RATE_LIMIT_WINDOW_MS: z
    .string()
    .default('60000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive())
    .describe('Rate limit time window in milliseconds'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info').describe('Logging level'),

  LOG_FILE_PATH: z.string().default('./logs').describe('Directory path for log files'),
});

/**
 * Type for validated environment variables
 */
type ValidatedEnv = z.infer<typeof envSchema>;

/**
 * Validates environment variables using Zod schema
 * Provides detailed error messages for any validation failures
 */
function validateAndParseEnv(): ValidatedEnv {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // In test environment, don't exit process, just throw the error
      const isTest = process.env.NODE_ENV === 'test';
      
      if (!isTest) {
        console.error('\n❌ Configuration Validation Failed!\n');
        console.error('The following environment variables have issues:\n');

        const zodError = error as z.ZodError<ValidatedEnv>;
        zodError.issues.forEach((err) => {
          const field = err.path.join('.');
          const message = err.message;
          const value = process.env[err.path[0] as string];

          console.error(`  🔴 ${field}:`);
          console.error(`     Problem: ${message}`);
          if (value) {
            console.error(`     Current: "${value}"`);
          } else {
            console.error(`     Current: <not set>`);
          }
          console.error('');
        });

        console.error('💡 Tips:');
        console.error('  - Check your .env file exists in the project root');
        console.error('  - Ensure all required variables are set');
        console.error('  - Verify URL formats include protocol (http://, redis://, etc.)');
        console.error('  - Secrets should be at least 32 characters long\n');

        process.exit(1);
      }
    }
    throw error;
  }
}

// Validate and parse environment variables
const env = validateAndParseEnv();

/**
 * Application configuration object
 * Exported singleton configuration with type safety
 */
export const config: AppConfig = {
  server: {
    port: env.PORT,
    host: env.HOST,
    nodeEnv: env.NODE_ENV,
    corsOrigin: env.CORS_ORIGIN,
    logLevel: env.LOG_LEVEL,
    logFilePath: env.LOG_FILE_PATH,
  },
  database: {
    url: env.DATABASE_URL,
  },
  redis: {
    url: env.REDIS_URL,
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
  },
  rateLimit: {
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    timeWindowMs: env.RATE_LIMIT_WINDOW_MS,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  github: {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
    appId: env.GITHUB_APP_ID,
    redirectUri: env.GITHUB_REDIRECT_URI,
    scopes: env.GITHUB_OAUTH_SCOPES,
    webhookSecret: env.GITHUB_WEBHOOK_SECRET,
    webhookProxyUrl: env.GITHUB_WEBHOOK_PROXY_URL,
  },
  encryption: {
    key: env.ENCRYPTION_KEY,
    algorithm: env.ENCRYPTION_ALGORITHM,
  },
  apiUrl: env.API_URL,
  anthropicApiKey: env.ANTHROPIC_API_KEY,
  sessionSecret: env.SESSION_SECRET,
  frontendUrl: env.FRONTEND_URL,
};

/**
 * Check if running in development mode
 */
export const isDevelopment = config.server.nodeEnv === 'development';

/**
 * Check if running in production mode
 */
export const isProduction = config.server.nodeEnv === 'production';

/**
 * Check if running in test mode
 */
export const isTest = config.server.nodeEnv === 'test';

export default config;
