/**
 * Encryption utility functions for securely storing sensitive data
 * Uses AES-256-GCM for authenticated encryption
 */

import crypto from 'crypto';
import { config } from '../config';

/**
 * Encrypted data interface
 * Contains the encrypted content, IV, and auth tag
 */
interface EncryptedData {
  encrypted: string; // Base64 encoded encrypted data
  iv: string; // Base64 encoded initialization vector
  authTag: string; // Base64 encoded authentication tag
}

/**
 * Encrypt a string value using AES-256-GCM
 * @param plaintext - The string to encrypt
 * @returns Encrypted data object with IV and auth tag
 * @throws Error if encryption fails
 */
export function encrypt(plaintext: string): EncryptedData {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty string');
  }

  // Generate random initialization vector
  const iv = crypto.randomBytes(16);

  // Convert encryption key from hex to buffer
  const key = Buffer.from(config.encryption.key, 'hex');

  // Create cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  // Encrypt the data
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  // Get authentication tag
  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/**
 * Decrypt an encrypted data object using AES-256-GCM
 * @param encryptedData - The encrypted data object containing encrypted content, IV, and auth tag
 * @returns Decrypted plaintext string
 * @throws Error if decryption fails or authentication fails
 */
export function decrypt(encryptedData: EncryptedData): string {
  if (!encryptedData || !encryptedData.encrypted || !encryptedData.iv || !encryptedData.authTag) {
    throw new Error('Invalid encrypted data format');
  }

  // Convert from base64
  const iv = Buffer.from(encryptedData.iv, 'base64');
  const authTag = Buffer.from(encryptedData.authTag, 'base64');
  const key = Buffer.from(config.encryption.key, 'hex');

  // Create decipher
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  // Decrypt the data
  let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Encrypt a string and return as a JSON string
 * Convenience method for storing in database as a single string field
 * @param plaintext - The string to encrypt
 * @returns JSON string containing encrypted data
 */
export function encryptToString(plaintext: string): string {
  const encrypted = encrypt(plaintext);
  return JSON.stringify(encrypted);
}

/**
 * Decrypt a JSON string containing encrypted data
 * Convenience method for decrypting from database
 * @param encryptedString - JSON string containing encrypted data
 * @returns Decrypted plaintext string
 * @throws Error if JSON parsing or decryption fails
 */
export function decryptFromString(encryptedString: string): string {
  try {
    const encryptedData = JSON.parse(encryptedString) as EncryptedData;
    return decrypt(encryptedData);
  } catch (error) {
    throw new Error('Failed to decrypt: Invalid encrypted data format');
  }
}

/**
 * Hash a string using SHA-256
 * Useful for hashing API keys or tokens for comparison without storing plaintext
 * @param value - The string to hash
 * @returns Hex-encoded SHA-256 hash
 */
export function hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Compare a plaintext value with a hash
 * Timing-safe comparison to prevent timing attacks
 * @param plaintext - The plaintext value to compare
 * @param hash - The hash to compare against
 * @returns true if they match, false otherwise
 */
export function compareHash(plaintext: string, hashedValue: string): boolean {
  const plaintextHash = hash(plaintext);
  try {
    return crypto.timingSafeEqual(Buffer.from(plaintextHash), Buffer.from(hashedValue));
  } catch {
    return false;
  }
}

/**
 * Generate a cryptographically secure random token
 * @param length - Length in bytes (default: 32)
 * @returns Hex-encoded random token
 */
export function generateRandomToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a random secret suitable for JWT or webhooks
 * @returns Hex-encoded 32-byte random secret
 */
export function generateSecret(): string {
  return generateRandomToken(32);
}

/**
 * Encrypt GitHub access token for storage
 * Wrapper around encrypt with specific use case
 * @param accessToken - GitHub access token to encrypt
 * @returns Encrypted data as JSON string
 */
export function encryptGitHubToken(accessToken: string): string {
  return encryptToString(accessToken);
}

/**
 * Decrypt GitHub access token from storage
 * Wrapper around decrypt with specific use case
 * @param encryptedToken - Encrypted token JSON string from database
 * @returns Decrypted GitHub access token
 */
export function decryptGitHubToken(encryptedToken: string): string {
  return decryptFromString(encryptedToken);
}

