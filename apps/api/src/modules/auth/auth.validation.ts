/**
 * Zod validation schemas for authentication endpoints
 */

import { z } from 'zod';

/**
 * Login request schema
 */
export const loginRequestSchema = z.object({
  redirectUrl: z.string().url().optional(),
});

/**
 * OAuth callback query schema
 */
export const oauthCallbackQuerySchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
});

/**
 * Refresh token request schema
 */
export const refreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

/**
 * Update profile request schema
 */
export const updateProfileRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
});

/**
 * Type exports for validated data
 */
export type LoginRequestInput = z.infer<typeof loginRequestSchema>;
export type OAuthCallbackQueryInput = z.infer<typeof oauthCallbackQuerySchema>;
export type RefreshTokenRequestInput = z.infer<typeof refreshTokenRequestSchema>;
export type UpdateProfileRequestInput = z.infer<typeof updateProfileRequestSchema>;

