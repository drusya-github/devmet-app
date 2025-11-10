/**
 * TypeScript interfaces and types for users module
 */

import { User, Organization, UserOrganization } from '@prisma/client';

/**
 * User with organization relationships
 */
export type UserWithOrganizations = User & {
  organizations: (UserOrganization & {
    organization: Organization;
  })[];
};

/**
 * Sanitized user data (no sensitive fields)
 * Used for API responses
 */
export interface PublicUser {
  id: string;
  githubId: string | null; // Changed from bigint to string for JSON serialization
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  preferences: Record<string, any> | null;
  notificationPreferences: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  organizations?: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
    joinedAt: Date;
  }>;
}

/**
 * User organization response
 */
export interface UserOrganizationResponse {
  id: string;
  name: string;
  slug: string;
  role: string;
  joinedAt: Date;
  githubId: bigint | null;
  planType: string;
}

/**
 * Update profile request
 */
export interface UpdateProfileRequest {
  name?: string;
  bio?: string;
  location?: string;
  avatarUrl?: string;
}

/**
 * Update preferences request
 */
export interface UpdatePreferencesRequest {
  theme?: 'light' | 'dark' | 'auto';
  timezone?: string;
  language?: string;
  emailNotifications?: boolean;
  weeklyDigest?: boolean;
  [key: string]: any; // Allow extensibility
}

/**
 * Update notification preferences request
 */
export interface UpdateNotificationPreferencesRequest {
  mutedTypes?: string[];
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
  };
  channels?: {
    email?: boolean;
    slack?: boolean;
    inApp?: boolean;
  };
  [key: string]: any; // Allow extensibility
}

