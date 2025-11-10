/**
 * Zod validation schemas for user profile endpoints
 */

import { z } from 'zod';

/**
 * Update profile request schema
 * Only allows updating mutable fields
 */
export const updateProfileRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  location: z.string().max(100, 'Location must be less than 100 characters').optional(),
  avatarUrl: z.string().url('Avatar URL must be a valid URL').optional(),
});

/**
 * Update preferences request schema
 * Preferences are stored as JSON
 */
export const updatePreferencesRequestSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  timezone: z.string().optional(),
  language: z.string().length(2, 'Language must be a 2-letter code').optional(),
  emailNotifications: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
}).passthrough(); // Allow additional fields for extensibility

/**
 * Update notification preferences request schema
 */
export const updateNotificationPreferencesRequestSchema = z.object({
  mutedTypes: z.array(z.string()).optional(),
  quietHours: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format'),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format'),
  }).optional(),
  channels: z.object({
    email: z.boolean().optional(),
    slack: z.boolean().optional(),
    inApp: z.boolean().optional(),
  }).optional(),
}).passthrough(); // Allow additional fields for extensibility

/**
 * Type exports for validated data
 */
export type UpdateProfileRequestInput = z.infer<typeof updateProfileRequestSchema>;
export type UpdatePreferencesRequestInput = z.infer<typeof updatePreferencesRequestSchema>;
export type UpdateNotificationPreferencesRequestInput = z.infer<typeof updateNotificationPreferencesRequestSchema>;

