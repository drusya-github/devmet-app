/**
 * TypeScript interfaces and types for authentication module
 */

import { User, Organization, UserOrganization } from '@prisma/client';

/**
 * GitHub user profile from OAuth response
 */
export interface GitHubUser {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  hireable: boolean | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

/**
 * GitHub OAuth token response
 */
export interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
}

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
 */
export interface PublicUser {
  id: string;
  githubId: string | null; // Changed from bigint to string for JSON serialization
  username: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  organizations?: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
  }>;
}

/**
 * Authentication response with tokens
 */
export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

/**
 * Token refresh response
 */
export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

/**
 * OAuth state parameter stored in Redis
 */
export interface OAuthState {
  state: string;
  redirectUrl?: string;
  createdAt: number;
}

/**
 * Login request body
 */
export interface LoginRequest {
  redirectUrl?: string;
}

/**
 * OAuth callback query parameters
 */
export interface OAuthCallbackQuery {
  code: string;
  state: string;
}

/**
 * Refresh token request body
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Update profile request body
 */
export interface UpdateProfileRequest {
  name?: string;
  bio?: string;
  location?: string;
}

