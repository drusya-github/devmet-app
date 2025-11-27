/**
 * Shared helper utilities for webhook processors
 * Provides common functionality across all event processors
 */
import { prisma } from '../../../database/prisma.client';
import { logger } from '../../../config/logger';
import type { RepositoryLookup, AuthorLookup } from './processors.types';

/**
 * Find repository by GitHub ID
 * Returns null if not found (not an error - just means repo not connected)
 */
export async function findRepository(
  githubId: number
): Promise<RepositoryLookup | null> {
  try {
    const repo = await prisma.repository.findFirst({
      where: { githubId: BigInt(githubId) },
      select: {
        id: true,
        githubId: true,
        name: true,
        fullName: true,
        organizationId: true,
      },
    });

    return repo;
  } catch (error) {
    logger.error('Failed to lookup repository', {
      githubId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error; // Throw to trigger retry
  }
}

/**
 * Find or create author (GitHub user -> our User)
 * Returns null if user cannot be found or created
 * This is not an error - just means the user hasn't authenticated yet
 */
export async function findOrCreateAuthor(
  username?: string,
  email?: string,
  name?: string
): Promise<AuthorLookup | null> {
  // Need at least username or email
  if (!username && !email) {
    logger.debug('Cannot find/create author without username or email');
    return null;
  }

  try {
    // Try to find by email first (most reliable)
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: { email },
        select: { id: true, githubId: true, email: true, name: true },
      });

      if (existingUser) {
        logger.debug('Found author by email', { email, userId: existingUser.id });
        return existingUser;
      }
    }

    // Try to find by name (fallback)
    if (username || name) {
      const searchName = username || name;
      const existingUser = await prisma.user.findFirst({
        where: { 
          name: {
            contains: searchName,
            mode: 'insensitive',
          }
        },
        select: { id: true, githubId: true, email: true, name: true },
      });

      if (existingUser) {
        logger.debug('Found author by name', { name: searchName, userId: existingUser.id });
        return existingUser;
      }
    }

    // User not found - this is expected for users who haven't authenticated
    logger.debug('Author not found in database', {
      username,
      email,
      name,
      note: 'User will be linked when they authenticate via OAuth',
    });

    return null;
  } catch (error) {
    logger.error('Failed to lookup author', {
      username,
      email,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Don't throw - return null to allow processing to continue
    return null;
  }
}

/**
 * Calculate time difference in hours between two dates
 */
export function calculateHoursDiff(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  return Math.round(diffMs / (1000 * 60 * 60));
}

/**
 * Calculate time difference in minutes between two dates
 */
export function calculateMinutesDiff(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  return Math.round(diffMs / (1000 * 60));
}

/**
 * Safe string truncation for database fields
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string | undefined): string | undefined {
  if (!email) return undefined;
  
  const trimmed = email.trim().toLowerCase();
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return emailRegex.test(trimmed) ? trimmed : undefined;
}

/**
 * Extract GitHub username from various formats
 */
export function extractUsername(input: string | undefined): string | undefined {
  if (!input) return undefined;
  
  // Remove @ symbol if present
  const cleaned = input.replace('@', '').trim();
  
  // Remove GitHub URL if present
  if (cleaned.includes('github.com/')) {
    const parts = cleaned.split('github.com/');
    return parts[1]?.split('/')[0] || undefined;
  }
  
  return cleaned || undefined;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check if a value is a valid GitHub ID
 */
export function isValidGithubId(value: any): boolean {
  if (typeof value === 'number') {
    return value > 0;
  }
  if (typeof value === 'bigint') {
    return value > 0n;
  }
  if (typeof value === 'string') {
    const num = parseInt(value, 10);
    return !isNaN(num) && num > 0;
  }
  return false;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        logger.debug('Retrying after error', {
          attempt: attempt + 1,
          maxRetries,
          delayMs: delay,
          error: lastError.message,
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}
