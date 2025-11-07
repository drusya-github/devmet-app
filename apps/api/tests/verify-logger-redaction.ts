#!/usr/bin/env ts-node
/**
 * Manual test script to verify logger redaction is working correctly
 * Run this script to see redaction in action
 * 
 * Usage: npx ts-node tests/verify-logger-redaction.ts
 */

import { logger } from '../src/config/logger';
import { createInterface } from 'readline';

console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║                                                       ║');
console.log('║    Logger Sensitive Data Redaction Test              ║');
console.log('║                                                       ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

console.log('This script demonstrates how sensitive data is automatically redacted in logs.\n');

// Test 1: Basic password redaction
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 1: Basic Password Redaction');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('Input data:');
const userData = {
  username: 'johndoe',
  email: 'john@example.com',
  password: 'SuperSecret123!',
  role: 'admin',
};
console.log(JSON.stringify(userData, null, 2));

console.log('\nLogged output (check console below):');
logger.info('User login attempt', userData);

// Test 2: Token redaction
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 2: Token Redaction');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('Input data:');
const authData = {
  userId: 12345,
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ',
  refreshToken: 'def502001a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7',
  expiresIn: 3600,
};
console.log(JSON.stringify(authData, null, 2));

console.log('\nLogged output (check console below):');
logger.info('User authenticated', authData);

// Test 3: Nested sensitive data
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 3: Nested Sensitive Data Redaction');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('Input data:');
const requestData = {
  method: 'POST',
  url: '/api/auth/login',
  headers: {
    'content-type': 'application/json',
    'user-agent': 'Mozilla/5.0',
    'authorization': 'Bearer test_token_1234567890abcdefghijklmnop',
  },
  body: {
    username: 'alice',
    password: 'AlicePassword123!',
    rememberMe: true,
  },
  ip: '192.168.1.100',
};
console.log(JSON.stringify(requestData, null, 2));

console.log('\nLogged output (check console below):');
logger.info('HTTP Request received', requestData);

// Test 4: GitHub integration data
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 4: GitHub Integration Data');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('Input data:');
const githubData = {
  userId: 789,
  githubId: 'github_user_123',
  githubToken: 'ghp_AbCdEfGhIjKlMnOpQrStUvWxYz1234567890',
  repositories: [
    { id: 1, name: 'repo1', webhookSecret: 'webhook_secret_abc123xyz' },
    { id: 2, name: 'repo2', webhookSecret: 'webhook_secret_def456uvw' },
  ],
  integrationComplete: true,
};
console.log(JSON.stringify(githubData, null, 2));

console.log('\nLogged output (check console below):');
logger.info('GitHub integration configured', githubData);

// Test 5: API keys and secrets
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 5: API Keys and Secrets');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('Input data:');
const apiConfig = {
  service: 'anthropic',
  anthropicApiKey: 'sk-ant-api03-1234567890abcdefghijklmnopqrstuvwxyz',
  githubClientId: 'Iv1.1234567890abcdef',
  githubClientSecret: 'abcdef1234567890abcdef1234567890abcdef12',
  jwtSecret: 'super-secret-jwt-key-that-should-be-32-chars-minimum',
  sessionSecret: 'session-secret-key-for-cookie-encryption-secure',
  environment: 'production',
};
console.log(JSON.stringify(apiConfig, null, 2));

console.log('\nLogged output (check console below):');
logger.info('API configuration loaded', apiConfig);

// Test 6: Error with sensitive data
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 6: Error Logging with Sensitive Context');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('Input data:');
const errorContext = {
  error: 'Authentication failed',
  attemptedUsername: 'hacker',
  attemptedPassword: 'password123',
  token: 'invalid_token_abc123',
  ip: '10.0.0.50',
  timestamp: new Date().toISOString(),
};
console.log(JSON.stringify(errorContext, null, 2));

console.log('\nLogged output (check console below):');
logger.error('Failed login attempt', errorContext);

// Test 7: Request ID tracking
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 7: Request ID Tracking');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const requestId = 'req-' + Math.random().toString(36).substring(7);
console.log(`Request ID: ${requestId}\n`);

logger.info('Request started', {
  requestId,
  method: 'GET',
  url: '/api/users/123',
});

logger.info('Processing request', {
  requestId,
  operation: 'fetch_user_data',
  duration: 45,
});

logger.info('Request completed', {
  requestId,
  statusCode: 200,
  duration: 120,
});

// Test 8: Non-sensitive data (should pass through unchanged)
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 8: Non-Sensitive Data (Should NOT be Redacted)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('Input data:');
const normalData = {
  userId: 456,
  username: 'bobsmith',
  email: 'bob@example.com',
  firstName: 'Bob',
  lastName: 'Smith',
  role: 'developer',
  teams: ['backend', 'frontend'],
  createdAt: '2024-01-01T00:00:00Z',
  lastLogin: '2024-11-06T10:30:00Z',
  preferences: {
    theme: 'dark',
    notifications: true,
    language: 'en',
  },
};
console.log(JSON.stringify(normalData, null, 2));

console.log('\nLogged output (check console below):');
logger.info('User profile data', normalData);

// Summary
console.log('\n\n╔═══════════════════════════════════════════════════════╗');
console.log('║                                                       ║');
console.log('║    Test Complete!                                     ║');
console.log('║                                                       ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

console.log('✅ All tests executed successfully!');
console.log('\n📝 Review the log output above to verify:');
console.log('   1. Passwords are redacted as [REDACTED]');
console.log('   2. Long tokens show partial redaction (first 2 + last 2 chars)');
console.log('   3. Authorization headers are redacted');
console.log('   4. Nested sensitive data is redacted');
console.log('   5. API keys and secrets are redacted');
console.log('   6. Request IDs are preserved for tracking');
console.log('   7. Non-sensitive data remains unchanged');
console.log('\n💡 Check the log files in ./logs/ directory for file output\n');

// Optional: Check log files
console.log('🔍 Checking log files...\n');
const fs = require('fs');
const path = require('path');

const logsDir = path.resolve(process.cwd(), 'logs');

if (fs.existsSync(logsDir)) {
  const logFiles = ['combined.log', 'error.log', 'access.log'];
  
  logFiles.forEach(file => {
    const filePath = path.join(logsDir, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`   ${file}: ${(stats.size / 1024).toFixed(2)} KB`);
    }
  });
  
  console.log('\n   You can review these files to see redacted output in JSON format.');
} else {
  console.log('   ⚠️  Log directory not found (may be disabled in test environment)');
}

console.log('\n✨ Logger verification complete!\n');

