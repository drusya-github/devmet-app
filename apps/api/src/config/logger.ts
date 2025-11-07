/**
 * Winston logger configuration
 * Provides structured logging with multiple transports
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { config } from './index';

// Ensure logs directory exists
const logsDir = path.resolve(process.cwd(), config.server.logFilePath);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * List of sensitive field names that should be redacted in logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'secret',
  'apiKey',
  'api_key',
  'authorization',
  'jwt',
  'githubToken',
  'github_token',
  'anthropicApiKey',
  'anthropic_api_key',
  'sessionSecret',
  'session_secret',
  'clientSecret',
  'client_secret',
  'webhookSecret',
  'webhook_secret',
  'apiSecret',
  'api_secret',
  'privateKey',
  'private_key',
  'creditCard',
  'credit_card',
  'ccv',
  'cvv',
  'ssn',
  'socialSecurity',
  'social_security',
];

/**
 * Recursively redact sensitive data from an object
 */
function redactObject(obj: any, depth = 0): any {
  // Prevent infinite recursion
  if (depth > 10) return '[MAX_DEPTH_REACHED]';

  // Handle null and undefined
  if (obj === null || obj === undefined) return obj;

  // Handle non-objects
  if (typeof obj !== 'object') return obj;

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, depth + 1));
  }

  // Handle objects
  const redacted: any = {};

  for (const key in obj) {
    // Check if key is sensitive (case-insensitive)
    const isSensitive = SENSITIVE_FIELDS.some((field) =>
      key.toLowerCase().includes(field.toLowerCase())
    );

    if (isSensitive) {
      // Redact the value but show partial info for debugging
      const value = obj[key];
      if (typeof value === 'string' && value.length > 0) {
        // Show first 2 and last 2 characters for strings longer than 8 chars
        if (value.length > 8) {
          redacted[key] = `${value.substring(0, 2)}***${value.substring(value.length - 2)}`;
        } else {
          redacted[key] = '[REDACTED]';
        }
      } else {
        redacted[key] = '[REDACTED]';
      }
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      // Recursively redact nested objects
      redacted[key] = redactObject(obj[key], depth + 1);
    } else {
      redacted[key] = obj[key];
    }
  }

  return redacted;
}

/**
 * Winston format to automatically redact sensitive data
 */
const redactSensitiveData = winston.format((info) => {
  // Create a shallow copy to avoid mutating original
  const redacted = { ...info };

  // List of Winston internal fields that should not be recursively redacted
  const internalFields = ['level', 'message', 'timestamp', 'splat', Symbol.for('level')];

  // Process all fields in the info object
  for (const key in redacted) {
    // Skip Winston's internal fields and symbols
    if (internalFields.includes(key) || typeof key === 'symbol') {
      continue;
    }

    const value = redacted[key];

    // Check if this field is sensitive
    const isSensitive = SENSITIVE_FIELDS.some((field) =>
      key.toLowerCase().includes(field.toLowerCase())
    );

    if (isSensitive) {
      // Redact sensitive field value
      if (typeof value === 'string' && value.length > 0) {
        if (value.length > 8) {
          redacted[key] = `${value.substring(0, 2)}***${value.substring(value.length - 2)}`;
        } else {
          redacted[key] = '[REDACTED]';
        }
      } else {
        redacted[key] = '[REDACTED]';
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively redact nested objects and arrays
      redacted[key] = redactObject(value);
    }
  }

  return redacted;
})();

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  redactSensitiveData, // Add redaction before converting to JSON
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  redactSensitiveData, // Add redaction for console output too
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}] ${message}`;

    // Add metadata if present
    const metaStr = JSON.stringify(metadata);
    if (metaStr !== '{}') {
      msg += ` ${metaStr}`;
    }

    return msg;
  })
);

// Define transports
const transports: winston.transport[] = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: config.server.nodeEnv === 'development' ? consoleFormat : logFormat,
  })
);

// File transports (disabled in test environment)
if (config.server.nodeEnv !== 'test') {
  // Combined log file (all logs)
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Error log file (errors only)
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Access log file (HTTP requests)
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'access.log'),
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  level: config.server.logLevel,
  format: logFormat,
  transports,
  exitOnError: false,
});

/**
 * Stream for Morgan HTTP logger middleware
 */
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

/**
 * Log HTTP request
 */
export function logRequest(req: any, res: any): void {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    statusCode: res.statusCode,
  });
}

/**
 * Log error with context
 */
export function logError(error: Error, context?: Record<string, any>): void {
  logger.error(error.message, {
    stack: error.stack,
    ...context,
  });
}

export default logger;
