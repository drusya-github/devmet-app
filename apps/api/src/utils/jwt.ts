/**
 * JWT utility functions for token signing and verification
 * Provides helper methods for working with JSON Web Tokens
 */

import jwt, { JwtPayload, SignOptions, VerifyOptions } from 'jsonwebtoken';
import { config } from '../config';

/**
 * JWT payload interface for access tokens
 */
export interface JWTPayload {
  userId: string;
  githubId: bigint | number;
  email: string | null;
}

/**
 * JWT payload interface for refresh tokens
 */
export interface RefreshTokenPayload {
  userId: string;
  type: 'refresh';
}

/**
 * Sign a JWT access token
 * @param payload - Token payload containing user information
 * @param options - Optional JWT sign options (override defaults)
 * @returns Signed JWT token string
 */
export function signAccessToken(
  payload: JWTPayload,
  options?: Omit<SignOptions, 'expiresIn' | 'issuer' | 'audience'>
): string {
  const signOptions: SignOptions = {
    expiresIn: config.jwt.expiresIn,
    issuer: 'devmetrics-api',
    audience: 'devmetrics-web',
    ...options,
  } as SignOptions;

  return jwt.sign(
    {
      ...payload,
      githubId: payload.githubId.toString(), // Convert bigint to string for JSON
    },
    config.jwt.secret,
    signOptions
  );
}

/**
 * Sign a JWT refresh token
 * @param payload - Minimal payload for refresh token
 * @param options - Optional JWT sign options
 * @returns Signed refresh token string
 */
export function signRefreshToken(
  payload: RefreshTokenPayload,
  options?: Omit<SignOptions, 'expiresIn' | 'issuer' | 'audience'>
): string {
  const signOptions: SignOptions = {
    expiresIn: config.jwt.refreshExpiresIn,
    issuer: 'devmetrics-api',
    audience: 'devmetrics-web',
    ...options,
  } as SignOptions;

  return jwt.sign(payload, config.jwt.refreshSecret, signOptions);
}

/**
 * Verify and decode a JWT access token
 * @param token - JWT token string to verify
 * @param options - Optional verification options
 * @returns Decoded token payload
 * @throws JsonWebTokenError if token is invalid
 * @throws TokenExpiredError if token is expired
 */
export function verifyAccessToken(
  token: string,
  options?: VerifyOptions
): JWTPayload & JwtPayload {
  const defaultOptions: VerifyOptions = {
    issuer: 'devmetrics-api',
    audience: 'devmetrics-web',
  };

  const decoded = jwt.verify(token, config.jwt.secret, {
    ...defaultOptions,
    ...options,
  }) as JWTPayload & JwtPayload;

  // Convert githubId back to bigint if it's a string
  if (typeof decoded.githubId === 'string') {
    decoded.githubId = BigInt(decoded.githubId);
  }

  return decoded;
}

/**
 * Verify and decode a JWT refresh token
 * @param token - Refresh token string to verify
 * @param options - Optional verification options
 * @returns Decoded refresh token payload
 * @throws JsonWebTokenError if token is invalid
 * @throws TokenExpiredError if token is expired
 */
export function verifyRefreshToken(
  token: string,
  options?: VerifyOptions
): RefreshTokenPayload & JwtPayload {
  const defaultOptions: VerifyOptions = {
    issuer: 'devmetrics-api',
    audience: 'devmetrics-web',
  };

  return jwt.verify(token, config.jwt.refreshSecret, {
    ...defaultOptions,
    ...options,
  }) as RefreshTokenPayload & JwtPayload;
}

/**
 * Decode a JWT token without verification
 * Useful for debugging or reading token claims without validating
 * @param token - JWT token string to decode
 * @returns Decoded token payload or null if invalid format
 */
export function decodeToken(token: string): JwtPayload | null {
  return jwt.decode(token) as JwtPayload | null;
}

/**
 * Check if a token is expired
 * @param token - JWT token string to check
 * @returns true if token is expired, false otherwise
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    return Date.now() >= decoded.exp * 1000;
  } catch {
    return true;
  }
}

/**
 * Generate both access and refresh tokens for a user
 * @param payload - User payload for access token
 * @returns Object containing both access and refresh tokens
 * 
 */
export function generateAccessToken(payload: JWTPayload): string {
  return signAccessToken(payload);
}
export function generateTokenPair(payload: JWTPayload): {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
} {
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({
    userId: payload.userId,
    type: 'refresh',
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: config.jwt.expiresIn,
  };
}

/**
 * Extract token from Authorization header
 * @param authHeader - Authorization header value (e.g., "Bearer <token>")
 * @returns Token string or null if invalid format
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

