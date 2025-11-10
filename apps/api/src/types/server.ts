/**
 * TypeScript type definitions for server configuration
 */

import { FastifyInstance } from 'fastify';

/**
 * Server configuration interface
 */
export interface ServerConfig {
  port: number;
  host: string;
  nodeEnv: string;
  corsOrigin: string;
  logLevel: string;
  logFilePath: string;
}

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  url: string;
}

/**
 * Redis configuration interface
 */
export interface RedisConfig {
  url: string;
  host: string;
  port: number;
}

/**
 * Rate limit configuration interface
 */
export interface RateLimitConfig {
  maxRequests: number;
  timeWindowMs: number;
}

/**
 * JWT configuration interface
 */
export interface JWTConfig {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

/**
 * GitHub OAuth configuration interface
 */
export interface GitHubConfig {
  clientId: string;
  clientSecret: string;
  appId: string;
  redirectUri: string;
  scopes: string;
  webhookSecret: string;
  webhookProxyUrl: string;
}

/**
 * Encryption configuration interface
 */
export interface EncryptionConfig {
  key: string;
  algorithm: string;
}

/**
 * Complete application configuration interface
 */
export interface AppConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  rateLimit: RateLimitConfig;
  jwt: JWTConfig;
  github: GitHubConfig;
  encryption: EncryptionConfig;
  apiUrl: string;
  anthropicApiKey: string;
  sessionSecret: string;
  frontendUrl: string;
}

/**
 * Extended Fastify instance type with app config
 */
export interface AppFastifyInstance extends FastifyInstance {
  config?: AppConfig;
}

/**
 * Health check response interface
 */
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  environment: string;
  version: string;
  database?: 'connected' | 'disconnected';
  redis?: 'connected' | 'disconnected';
  uptime?: number;
  latency?: number;
  redisLatency?: number;
  message?: string;
}

/**
 * API info response interface
 */
export interface ApiInfoResponse {
  name: string;
  version: string;
  description: string;
  environment: string;
  endpoints: {
    health: string;
    api: string;
    docs?: string;
  };
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  timestamp: string;
  path?: string;
  validation?: Array<{
    field: string;
    message: string;
  }>;
}
