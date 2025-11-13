# DevMetrics - Sprint 2 Specification

**Project**: DevMetrics - Real-time Development Analytics Platform  
**Sprint**: Sprint 2 - Core Backend Features (Week 2)  
**Status**: 🚀 **READY TO START**  
**Start Date**: November 7, 2025  
**Target Completion**: November 14, 2025  
**Tasks**: 12 tasks (TASK-014 through TASK-025)  
**Estimated Time**: 45-55 hours

---

## 📋 Executive Summary

Sprint 2 focuses on building the core backend features that transform the infrastructure from Sprint 1 into a functional application. This sprint will implement:

- ✅ **Authentication System** - GitHub OAuth with JWT tokens
- ✅ **Repository Integration** - Connect and sync GitHub repositories
- ✅ **Webhook Processing** - Real-time event processing from GitHub
- ✅ **Metrics Calculation** - Developer, team, and repository analytics

By the end of Sprint 2, the backend will be able to:
- Authenticate users via GitHub OAuth
- Connect and track GitHub repositories
- Process webhooks in real-time
- Calculate and serve metrics via API

---

## 🎯 Sprint 2 Goals

### Primary Objectives
1. ✅ Implement complete GitHub OAuth authentication flow
2. ✅ Enable repository connection and management
3. ✅ Process GitHub webhooks asynchronously
4. ✅ Calculate and serve developer/team metrics
5. ✅ Build robust API endpoints for all features

### Success Criteria
- [ ] Users can authenticate with GitHub
- [ ] Users can connect their repositories
- [ ] Webhooks are received and processed correctly
- [ ] Metrics are calculated and accessible via API
- [ ] All endpoints have proper authentication/authorization
- [ ] Test coverage maintained at 70%+
- [ ] All critical paths have integration tests

### Dependencies from Sprint 1
- ✅ Database schema (User, Organization, Repository, Events, Metrics models)
- ✅ Prisma Client with connection service
- ✅ Redis for caching and queues
- ✅ Fastify server with middleware
- ✅ Winston logging system
- ✅ Jest testing framework with mock factories
- ✅ Seed data for development/testing

---

## 📊 Sprint 2 Overview

### Epic Breakdown

| Epic | Tasks | Estimated Time | Priority |
|------|-------|----------------|----------|
| 2.1: Authentication & User Management | 3 tasks | 13-16 hours | P0-Critical |
| 2.2: Repository Integration | 3 tasks | 14-20 hours | P0-Critical |
| 2.3: Webhook Processing | 3 tasks | 14-18 hours | P0-Critical |
| 2.4: Metrics Calculation | 3 tasks | 16-19 hours | P0-Critical |
| **Total** | **12 tasks** | **45-55 hours** | **100% P0** |

### Task Dependency Graph

```
TASK-014 (GitHub OAuth)
    ↓
TASK-015 (JWT Middleware) ──→ TASK-016 (User Profile)
    ↓
TASK-017 (Repository Listing)
    ↓
TASK-018 (Repository Connection)
    ↓
TASK-019 (Historical Import) ──→ TASK-020 (Webhook Endpoint)
                                      ↓
                                 TASK-021 (Webhook Queue)
                                      ↓
                                 TASK-022 (Event Processors)
                                      ↓
                                 TASK-023 (Metrics Service)
                                      ↓
                                 TASK-024 (Metrics API) ──→ TASK-025 (Metrics Jobs)
```

---

## EPIC 2.1: AUTHENTICATION & USER MANAGEMENT

### Overview
Implement a complete authentication system using GitHub OAuth 2.0 with JWT tokens for API access. This is the foundation for all user interactions with the platform.

---

### TASK-014: Implement GitHub OAuth Flow
**Priority**: P0-Critical | **Type**: `feature` | **Size**: `L` | **Estimated Time**: 6-8 hours

#### User Story
> As a developer, I want to sign up and log in using my GitHub account so that I don't need to create another password and the app can access my repositories.

#### Description
Implement the complete GitHub OAuth 2.0 flow including authorization redirect, callback handling, token exchange, user creation/update, and JWT token issuance.

#### Technical Requirements

**API Endpoints to Create:**
- `GET /api/auth/github` - Initiate OAuth flow
- `GET /api/auth/callback` - Handle GitHub callback
- `POST /api/auth/logout` - Logout user (invalidate session)
- `GET /api/auth/me` - Get current authenticated user
- `POST /api/auth/refresh` - Refresh JWT token

**GitHub OAuth Flow:**
1. User clicks "Login with GitHub"
2. Backend redirects to GitHub OAuth authorize URL
3. User authorizes the app on GitHub
4. GitHub redirects to callback URL with code
5. Backend exchanges code for access token
6. Backend fetches user profile from GitHub API
7. Backend creates/updates user in database
8. Backend issues JWT token
9. Backend redirects to frontend with token

#### Implementation Approaches

##### Approach 1: Simple OAuth Flow (Recommended for MVP)
```typescript
// src/modules/auth/auth.routes.ts
export async function authRoutes(fastify: FastifyInstance) {
  // Initiate OAuth
  fastify.get('/github', async (request, reply) => {
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo,user:email`;
    reply.redirect(authUrl);
  });

  // Handle callback
  fastify.get('/callback', async (request, reply) => {
    const { code } = request.query;
    
    // Exchange code for access token
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: config.github.clientId,
      client_secret: config.github.clientSecret,
      code,
    });
    
    const accessToken = tokenResponse.data.access_token;
    
    // Fetch user from GitHub
    const userResponse = await octokit.users.getAuthenticated();
    
    // Create/update user in database
    const user = await upsertUser(userResponse.data, accessToken);
    
    // Issue JWT
    const jwt = signJWT({ userId: user.id });
    
    // Redirect to frontend with token
    reply.redirect(`${config.frontendUrl}/auth/callback?token=${jwt}`);
  });
}
```

**Pros:**
- Simple, straightforward implementation
- Easy to understand and debug
- Minimal dependencies

**Cons:**
- Token in URL (less secure for refresh flow)
- No automatic token refresh
- Basic error handling

##### Approach 2: OAuth with Refresh Tokens (Recommended for Production)
```typescript
// src/modules/auth/auth.service.ts
export class AuthService {
  async exchangeCodeForTokens(code: string) {
    const response = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: config.github.clientId,
      client_secret: config.github.clientSecret,
      code,
    });
    
    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token, // If GitHub provides
      expiresIn: response.data.expires_in,
    };
  }
  
  async createOrUpdateUser(githubProfile: any, tokens: any) {
    // Encrypt tokens before storage
    const encryptedAccessToken = await encrypt(tokens.accessToken);
    const encryptedRefreshToken = tokens.refreshToken ? await encrypt(tokens.refreshToken) : null;
    
    const user = await prisma.user.upsert({
      where: { githubId: githubProfile.id },
      update: {
        name: githubProfile.name,
        email: githubProfile.email,
        avatarUrl: githubProfile.avatar_url,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        lastLoginAt: new Date(),
      },
      create: {
        githubId: githubProfile.id,
        username: githubProfile.login,
        email: githubProfile.email,
        name: githubProfile.name,
        avatarUrl: githubProfile.avatar_url,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
      },
    });
    
    return user;
  }
  
  issueJWT(user: User) {
    const payload = {
      userId: user.id,
      githubId: user.githubId,
      email: user.email,
    };
    
    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn, // 1h
    });
    
    const refreshToken = jwt.sign({ userId: user.id }, config.jwt.refreshSecret, {
      expiresIn: '7d',
    });
    
    return { accessToken, refreshToken };
  }
  
  async refreshAccessToken(refreshToken: string) {
    const payload = jwt.verify(refreshToken, config.jwt.refreshSecret);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    
    if (!user) throw new Error('User not found');
    
    return this.issueJWT(user);
  }
}
```

**Pros:**
- Secure token storage (encrypted)
- Automatic token refresh capability
- Better separation of concerns
- Production-ready

**Cons:**
- More complex implementation
- Requires encryption setup
- More code to test

##### Approach 3: OAuth with State Parameter (Most Secure)
```typescript
// Add CSRF protection with state parameter
export class AuthService {
  async initiateOAuth(sessionId: string) {
    // Generate random state
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state in Redis with expiration
    await redis.setex(`oauth:state:${state}`, 300, sessionId); // 5 min TTL
    
    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', config.github.clientId);
    authUrl.searchParams.set('redirect_uri', config.github.redirectUri);
    authUrl.searchParams.set('scope', 'repo,user:email,read:org');
    authUrl.searchParams.set('state', state);
    
    return authUrl.toString();
  }
  
  async handleCallback(code: string, state: string) {
    // Verify state
    const sessionId = await redis.get(`oauth:state:${state}`);
    if (!sessionId) {
      throw new AppError('Invalid or expired state', 401);
    }
    
    // Delete state (one-time use)
    await redis.del(`oauth:state:${state}`);
    
    // Continue with token exchange...
  }
}
```

**Pros:**
- CSRF protection with state parameter
- Most secure approach
- Prevents replay attacks
- Production-ready

**Cons:**
- Requires Redis for state storage
- Most complex implementation
- More moving parts

#### Recommended Implementation Strategy

**Phase 1: Basic OAuth (Days 1-2)**
1. Implement Approach 1 (Simple OAuth)
2. Get basic flow working end-to-end
3. Test with real GitHub account
4. Store access token (encrypted)

**Phase 2: Add JWT (Day 2)**
1. Issue JWT tokens after GitHub auth
2. Implement refresh token endpoint
3. Add token expiration handling

**Phase 3: Add Security (Day 3)**
1. Add state parameter for CSRF protection
2. Implement token encryption
3. Add rate limiting on auth endpoints
4. Add audit logging

#### Acceptance Criteria
- [ ] `GET /api/auth/github` redirects to GitHub OAuth page
- [ ] `GET /api/auth/callback` handles successful authorization
- [ ] User is created in database on first login
- [ ] User is updated on subsequent logins
- [ ] GitHub access token is stored encrypted
- [ ] JWT token is issued with userId, email, githubId
- [ ] JWT expires in 1 hour (configurable)
- [ ] Refresh token endpoint works correctly
- [ ] `GET /api/auth/me` returns current user info
- [ ] `POST /api/auth/logout` invalidates session
- [ ] CSRF protection with state parameter
- [ ] Error handling for OAuth failures (denied, network errors)
- [ ] Audit log created for login events
- [ ] Redirects to frontend with token
- [ ] Unit tests for auth service (70%+ coverage)
- [ ] Integration tests for OAuth flow

#### Testing Strategy

**Unit Tests:**
```typescript
describe('AuthService', () => {
  describe('createOrUpdateUser', () => {
    it('should create new user on first login', async () => {
      const githubProfile = createMockGitHubUser();
      const user = await authService.createOrUpdateUser(githubProfile, tokens);
      expect(user.githubId).toBe(githubProfile.id);
    });
    
    it('should update existing user on subsequent login', async () => {
      // Test update logic
    });
    
    it('should encrypt access token before storage', async () => {
      // Test encryption
    });
  });
  
  describe('issueJWT', () => {
    it('should generate valid JWT token', () => {
      const user = createMockUser();
      const { accessToken } = authService.issueJWT(user);
      const decoded = jwt.verify(accessToken, config.jwt.secret);
      expect(decoded.userId).toBe(user.id);
    });
  });
});
```

**Integration Tests:**
```typescript
describe('POST /api/auth/callback', () => {
  it('should create user and return JWT on successful OAuth', async () => {
    // Mock GitHub API responses
    mockOctokit.users.getAuthenticated.mockResolvedValue({
      data: { id: 12345, login: 'testuser', email: 'test@example.com' }
    });
    
    const response = await request(app)
      .get('/api/auth/callback')
      .query({ code: 'test_code', state: 'valid_state' })
      .expect(302); // Redirect
    
    // Verify user created
    const user = await prisma.user.findUnique({ where: { githubId: 12345 } });
    expect(user).toBeDefined();
  });
});
```

#### Security Considerations
- ✅ Store GitHub tokens encrypted (AES-256-GCM)
- ✅ Use state parameter for CSRF protection
- ✅ Validate redirect URI matches configured value
- ✅ Rate limit auth endpoints (10 req/min)
- ✅ Set short JWT expiration (1 hour)
- ✅ Use httpOnly cookies for tokens (alternative to localStorage)
- ✅ Implement refresh token rotation
- ✅ Log all authentication events
- ✅ Validate GitHub OAuth scopes requested

#### Files to Create/Modify
```
apps/api/src/modules/auth/
├── auth.routes.ts           # OAuth routes
├── auth.service.ts          # OAuth logic & JWT
├── auth.types.ts            # TypeScript interfaces
├── auth.validation.ts       # Zod schemas
└── __tests__/
    ├── auth.service.test.ts # Unit tests
    └── auth.routes.test.ts  # Integration tests

apps/api/src/utils/
├── encryption.ts            # Token encryption utilities
└── jwt.ts                   # JWT helpers
```

#### Environment Variables Needed
```env
# GitHub OAuth
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_REDIRECT_URI=http://localhost:3001/api/auth/callback
GITHUB_OAUTH_SCOPES=repo,user:email,read:org

# JWT
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=your_encryption_key_32_bytes
ENCRYPTION_ALGORITHM=aes-256-gcm

# Frontend
FRONTEND_URL=http://localhost:3000
```

#### GitHub OAuth App Setup
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in details:
   - Application name: DevMetrics (Dev)
   - Homepage URL: http://localhost:3000
   - Authorization callback URL: http://localhost:3001/api/auth/callback
4. Click "Register application"
5. Copy Client ID and generate Client Secret
6. Add to `.env` file

#### Dependencies
- ✅ `@octokit/rest` - Already installed
- ✅ `jsonwebtoken` - Already installed
- ✅ `axios` - Already installed
- ⚠️ May need: `crypto` (built-in Node.js module for encryption)

---

### TASK-015: Create JWT Authentication Middleware
**Priority**: P0-Critical | **Type**: `feature` | **Size**: `M` | **Estimated Time**: 3-4 hours

#### Description
Create middleware to verify JWT tokens and protect routes requiring authentication. This middleware will extract and validate JWT tokens, attach user information to requests, and handle authorization.

#### Technical Requirements

**Middleware Functions:**
1. `authenticate` - Verify JWT token (required)
2. `optionalAuthenticate` - Verify JWT if present (optional)
3. `requireRole` - Check user has required role
4. `requireOrganization` - Check user belongs to organization

#### Implementation Approaches

##### Approach 1: Basic JWT Middleware (Recommended for MVP)
```typescript
// src/middleware/auth.middleware.ts
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    // Extract token from header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify JWT
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });
    
    if (!user) {
      throw new AppError('User not found', 401);
    }
    
    // Attach user to request
    request.user = user;
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid token', 401);
    }
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token expired', 401);
    }
    throw error;
  }
}
```

**Pros:**
- Simple and straightforward
- Easy to understand
- Minimal dependencies

**Cons:**
- Database query on every request
- No caching
- Can be slow with many requests

##### Approach 2: Cached JWT Middleware (Recommended for Production)
```typescript
// src/middleware/auth.middleware.ts
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const token = extractToken(request);
  
  // Verify JWT
  const decoded = jwt.verify(token, config.jwt.secret);
  
  // Check cache first
  const cacheKey = `user:${decoded.userId}`;
  let user = await redis.get(cacheKey);
  
  if (user) {
    request.user = JSON.parse(user);
    return;
  }
  
  // Fetch from database
  user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: {
      organizations: {
        include: { organization: true },
      },
    },
  });
  
  if (!user) {
    throw new AppError('User not found', 401);
  }
  
  // Cache for 15 minutes
  await redis.setex(cacheKey, 900, JSON.stringify(user));
  
  request.user = user;
}
```

**Pros:**
- Much faster (cached)
- Reduces database load
- Production-ready

**Cons:**
- Cache invalidation complexity
- Stale data possible
- Requires Redis

##### Approach 3: Fastify Decorator Pattern (Most Fastify-Idiomatic)
```typescript
// src/middleware/auth.middleware.ts
import fp from 'fastify-plugin';

export default fp(async function (fastify: FastifyInstance) {
  // Decorate request with user property
  fastify.decorateRequest('user', null);
  
  // Register auth decorator
  fastify.decorate('authenticate', async function (
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const token = extractToken(request);
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Fetch and cache user
    const user = await getUserWithCache(decoded.userId);
    request.user = user;
  });
  
  // Register optional auth decorator
  fastify.decorate('optionalAuthenticate', async function (
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      const token = extractToken(request);
      if (token) {
        const decoded = jwt.verify(token, config.jwt.secret);
        const user = await getUserWithCache(decoded.userId);
        request.user = user;
      }
    } catch (error) {
      // Ignore auth errors for optional auth
      request.user = null;
    }
  });
  
  // Register role checker
  fastify.decorate('requireRole', function (roles: string[]) {
    return async function (request: FastifyRequest, reply: FastifyReply) {
      if (!request.user) {
        throw new AppError('Not authenticated', 401);
      }
      
      const hasRole = request.user.organizations.some((uo) =>
        roles.includes(uo.role)
      );
      
      if (!hasRole) {
        throw new AppError('Insufficient permissions', 403);
      }
    };
  });
});
```

**Usage:**
```typescript
// Protected route
fastify.get('/api/protected', {
  preHandler: [fastify.authenticate]
}, async (request, reply) => {
  return { user: request.user };
});

// Optional auth route
fastify.get('/api/public', {
  preHandler: [fastify.optionalAuthenticate]
}, async (request, reply) => {
  if (request.user) {
    return { message: 'Hello ' + request.user.name };
  }
  return { message: 'Hello guest' };
});

// Role-based route
fastify.get('/api/admin', {
  preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN'])]
}, async (request, reply) => {
  return { message: 'Admin area' };
});
```

**Pros:**
- Fastify-idiomatic
- Type-safe with decorators
- Reusable across routes
- Clean syntax

**Cons:**
- Requires understanding of Fastify decorators
- More setup code
- TypeScript types need augmentation

#### Recommended Implementation Strategy

**Phase 1: Basic Middleware (Day 1)**
1. Implement Approach 1 (Basic JWT)
2. Test with Postman/curl
3. Add to protected routes

**Phase 2: Add Caching (Day 1)**
1. Add Redis caching (Approach 2)
2. Implement cache invalidation
3. Performance testing

**Phase 3: Add Authorization (Day 2)**
1. Implement role-based access control
2. Implement organization-based access control
3. Add permission helpers

#### Acceptance Criteria
- [ ] `authenticate` middleware verifies JWT tokens
- [ ] Extracts token from Authorization header (Bearer scheme)
- [ ] Validates JWT signature and expiration
- [ ] Fetches user from database
- [ ] Attaches user object to request
- [ ] Returns 401 for missing token
- [ ] Returns 401 for invalid token
- [ ] Returns 401 for expired token
- [ ] Returns 401 if user not found
- [ ] `optionalAuthenticate` doesn't fail on missing token
- [ ] `requireRole` checks user has required role
- [ ] `requireOrganization` verifies user belongs to org
- [ ] Caches user data in Redis (15 min TTL)
- [ ] Cache invalidation on user update
- [ ] Proper error messages for all failure cases
- [ ] TypeScript types for request.user
- [ ] Unit tests for middleware (70%+ coverage)
- [ ] Integration tests for protected routes

#### Testing Strategy

**Unit Tests:**
```typescript
describe('authenticate middleware', () => {
  it('should attach user to request with valid token', async () => {
    const user = await createMockUser();
    const token = jwt.sign({ userId: user.id }, config.jwt.secret);
    
    const request = {
      headers: { authorization: `Bearer ${token}` },
    } as FastifyRequest;
    
    await authenticate(request, reply);
    
    expect(request.user).toBeDefined();
    expect(request.user.id).toBe(user.id);
  });
  
  it('should throw 401 for missing token', async () => {
    const request = { headers: {} } as FastifyRequest;
    
    await expect(authenticate(request, reply)).rejects.toThrow('No token provided');
  });
  
  it('should throw 401 for invalid token', async () => {
    const request = {
      headers: { authorization: 'Bearer invalid_token' },
    } as FastifyRequest;
    
    await expect(authenticate(request, reply)).rejects.toThrow('Invalid token');
  });
  
  it('should throw 401 for expired token', async () => {
    const token = jwt.sign({ userId: 1 }, config.jwt.secret, { expiresIn: '0s' });
    const request = {
      headers: { authorization: `Bearer ${token}` },
    } as FastifyRequest;
    
    await expect(authenticate(request, reply)).rejects.toThrow('Token expired');
  });
});
```

**Integration Tests:**
```typescript
describe('Protected Routes', () => {
  it('should access protected route with valid token', async () => {
    const user = await createTestUser();
    const token = signJWT({ userId: user.id });
    
    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    
    expect(response.body.id).toBe(user.id);
  });
  
  it('should return 401 for protected route without token', async () => {
    await request(app)
      .get('/api/users/me')
      .expect(401);
  });
});
```

#### Files to Create/Modify
```
apps/api/src/middleware/
├── auth.middleware.ts       # JWT verification
├── auth.middleware.test.ts  # Unit tests
└── README.md                # Middleware documentation

apps/api/src/types/
└── fastify.d.ts            # Type augmentation for request.user
```

#### TypeScript Type Augmentation
```typescript
// src/types/fastify.d.ts
import { User, Organization, UserOrganization } from '@prisma/client';

declare module 'fastify' {
  interface FastifyRequest {
    user?: User & {
      organizations: (UserOrganization & {
        organization: Organization;
      })[];
    };
  }
  
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    
    optionalAuthenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    
    requireRole: (roles: string[]) => (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}
```

---

### TASK-016: Implement User Profile Management
**Priority**: P1-High | **Type**: `feature` | **Size**: `M` | **Estimated Time**: 4 hours

#### User Story
> As a user, I want to view and update my profile information and delete my account if needed (GDPR compliance).

#### Description
Create API endpoints for users to manage their profile, update preferences, and delete their account with proper data cleanup.

#### Technical Requirements

**API Endpoints:**
- `GET /api/users/me` - Get current user profile
- `PATCH /api/users/me` - Update profile
- `DELETE /api/users/me` - Delete account (GDPR)
- `GET /api/users/me/organizations` - Get user's organizations
- `PATCH /api/users/me/preferences` - Update preferences

#### Implementation Approaches

##### Approach 1: Simple CRUD Service
```typescript
// src/modules/users/users.service.ts
export class UsersService {
  async getCurrentUser(userId: string) {
    return await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });
  }
  
  async updateProfile(userId: string, data: UpdateProfileDTO) {
    // Validate update data
    const validated = updateProfileSchema.parse(data);
    
    // Update user
    return await prisma.user.update({
      where: { id: userId },
      data: validated,
    });
  }
  
  async deleteAccount(userId: string) {
    // Soft delete or hard delete?
    await prisma.user.delete({
      where: { id: userId },
    });
  }
}
```

##### Approach 2: Service with Validation and Audit (Recommended)
```typescript
// src/modules/users/users.service.ts
export class UsersService {
  async getCurrentUser(userId: string) {
    const cacheKey = `user:profile:${userId}`;
    
    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    // Fetch from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Remove sensitive fields
    const sanitized = this.sanitizeUser(user);
    
    // Cache for 15 minutes
    await redis.setex(cacheKey, 900, JSON.stringify(sanitized));
    
    return sanitized;
  }
  
  async updateProfile(userId: string, data: UpdateProfileDTO, ipAddress: string) {
    // Validate
    const validated = updateProfileSchema.parse(data);
    
    // Cannot update immutable fields
    const { githubId, email, ...updateData } = validated;
    
    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
    
    // Invalidate cache
    await redis.del(`user:profile:${userId}`);
    await redis.del(`user:${userId}`);
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'USER_PROFILE_UPDATED',
        resourceType: 'USER',
        resourceId: userId,
        ipAddress,
        metadata: { fields: Object.keys(updateData) },
      },
    });
    
    logger.info('User profile updated', { userId, fields: Object.keys(updateData) });
    
    return this.sanitizeUser(user);
  }
  
  async deleteAccount(userId: string, ipAddress: string) {
    // Fetch user with all data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        repositories: true,
        commits: true,
        pullRequests: true,
        issues: true,
        developerMetrics: true,
      },
    });
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Soft delete (mark as deleted but keep data)
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        email: null, // Anonymize PII
        name: 'Deleted User',
        avatarUrl: null,
        accessToken: null,
        refreshToken: null,
      },
    });
    
    // OR Hard delete (GDPR right to be forgotten)
    // await prisma.user.delete({
    //   where: { id: userId },
    // });
    
    // Clear all caches
    await redis.del(`user:${userId}`);
    await redis.del(`user:profile:${userId}`);
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'USER_ACCOUNT_DELETED',
        resourceType: 'USER',
        resourceId: userId,
        ipAddress,
        status: 'SUCCESS',
      },
    });
    
    logger.info('User account deleted', { userId });
  }
  
  sanitizeUser(user: User) {
    // Remove sensitive fields before sending to client
    const { accessToken, refreshToken, ...safe } = user;
    return safe;
  }
}
```

**Pros:**
- Complete implementation
- GDPR compliant
- Audit trail
- Cache invalidation
- Sanitized responses

**Cons:**
- More complex
- More code to maintain

#### Acceptance Criteria
- [ ] `GET /api/users/me` returns current user profile
- [ ] Response excludes sensitive fields (accessToken, refreshToken)
- [ ] `PATCH /api/users/me` updates allowed fields only
- [ ] Cannot update githubId or email directly
- [ ] Validates input with Zod schemas
- [ ] Returns 400 for invalid input
- [ ] Returns 404 if user not found
- [ ] `DELETE /api/users/me` soft deletes account
- [ ] Anonymizes PII on deletion (GDPR)
- [ ] Cascades deletion to related data (or keeps for analytics)
- [ ] Audit log created for all operations
- [ ] Cache invalidated on updates
- [ ] Rate limiting on endpoints
- [ ] Unit tests for user service (70%+ coverage)
- [ ] Integration tests for all endpoints

#### Files to Create/Modify
```
apps/api/src/modules/users/
├── users.routes.ts          # User endpoints
├── users.service.ts         # Business logic
├── users.validation.ts      # Zod schemas
├── users.types.ts           # TypeScript interfaces
└── __tests__/
    ├── users.service.test.ts
    └── users.routes.test.ts
```

#### Testing Strategy
```typescript
describe('UsersService', () => {
  describe('updateProfile', () => {
    it('should update allowed fields', async () => {
      const user = await createTestUser();
      const updated = await usersService.updateProfile(user.id, {
        name: 'New Name',
      });
      expect(updated.name).toBe('New Name');
    });
    
    it('should not update immutable fields', async () => {
      const user = await createTestUser();
      await expect(
        usersService.updateProfile(user.id, { githubId: 99999 })
      ).rejects.toThrow();
    });
  });
  
  describe('deleteAccount', () => {
    it('should soft delete user', async () => {
      const user = await createTestUser();
      await usersService.deleteAccount(user.id, '127.0.0.1');
      
      const deleted = await prisma.user.findUnique({ where: { id: user.id } });
      expect(deleted.deletedAt).not.toBeNull();
      expect(deleted.email).toBeNull();
    });
  });
});
```

---

## EPIC 2.2: REPOSITORY INTEGRATION

### Overview
Enable users to connect their GitHub repositories to DevMetrics for tracking. This includes listing available repositories, connecting them, and importing historical data.

---

### TASK-017: Implement Repository Listing from GitHub
**Priority**: P0-Critical | **Type**: `feature` | **Size**: `M` | **Estimated Time**: 4 hours

#### User Story
> As a user, I want to see a list of my GitHub repositories so that I can choose which ones to track.

#### Description
Fetch and display the user's GitHub repositories using the Octokit API, with caching and pagination support.

#### Implementation Approach
```typescript
// src/modules/repositories/repositories.service.ts
export class RepositoriesService {
  async listAvailableRepositories(
    userId: string,
    page: number = 1,
    perPage: number = 30
  ) {
    // Get user's GitHub token
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const githubToken = await decrypt(user.accessToken);
    
    // Check cache
    const cacheKey = `repos:available:${userId}:${page}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    // Initialize Octokit with user's token
    const octokit = new Octokit({ auth: githubToken });
    
    // Fetch repositories
    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      page,
      per_page: perPage,
      sort: 'updated',
      affiliation: 'owner,collaborator,organization_member',
    });
    
    // Get already connected repos
    const connectedRepos = await prisma.repository.findMany({
      where: { userId },
      select: { githubId: true },
    });
    const connectedIds = new Set(connectedRepos.map(r => r.githubId));
    
    // Filter out connected repos
    const available = repos.filter(repo => !connectedIds.has(repo.id));
    
    // Transform data
    const transformed = available.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      isPrivate: repo.private,
      updatedAt: repo.updated_at,
    }));
    
    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(transformed));
    
    return transformed;
  }
}
```

#### Acceptance Criteria
- [ ] `GET /api/repositories/available` returns user's GitHub repos
- [ ] Uses user's GitHub access token
- [ ] Returns both owned and accessible repos
- [ ] Includes repo metadata (name, description, language, stars, forks)
- [ ] Filters out already connected repos
- [ ] Pagination support (page, perPage query params)
- [ ] Caches results in Redis (5 min TTL)
- [ ] Handles GitHub API rate limits gracefully
- [ ] Returns 429 if rate limited
- [ ] Error handling for API failures
- [ ] Unit and integration tests

---

### TASK-017 Continued: Implementation Details

#### Multiple Implementation Approaches

##### Approach 1: Simple API Wrapper (MVP)
```typescript
export class RepositoriesService {
  async listAvailableRepositories(userId: string) {
    const user = await this.getUser(userId);
    const octokit = this.createOctokit(user.accessToken);
    
    const { data } = await octokit.repos.listForAuthenticatedUser({
      per_page: 100,
    });
    
    return data.map(this.transformRepo);
  }
}
```

**Pros**: Simple, easy to implement  
**Cons**: No caching, no pagination, no filtering

##### Approach 2: Cached with Pagination (Recommended)
```typescript
export class RepositoriesService {
  async listAvailableRepositories(
    userId: string,
    options: {
      page?: number;
      perPage?: number;
      type?: 'all' | 'owner' | 'member';
      sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    } = {}
  ) {
    const {
      page = 1,
      perPage = 30,
      type = 'all',
      sort = 'updated'
    } = options;
    
    // Check cache
    const cacheKey = `repos:available:${userId}:${type}:${sort}:${page}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug('Returning cached repositories', { userId, cacheKey });
      return JSON.parse(cached);
    }
    
    // Fetch from GitHub
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);
    
    const githubToken = await decrypt(user.accessToken);
    const octokit = new Octokit({ auth: githubToken });
    
    try {
      const { data: repos, headers } = await octokit.repos.listForAuthenticatedUser({
        page,
        per_page: perPage,
        type,
        sort,
      });
      
      // Check rate limit
      const remaining = parseInt(headers['x-ratelimit-remaining'] || '0');
      if (remaining < 100) {
        logger.warn('GitHub API rate limit low', { userId, remaining });
      }
      
      // Get connected repos
      const connected = await this.getConnectedRepoIds(userId);
      
      // Filter and transform
      const available = repos
        .filter(repo => !connected.has(BigInt(repo.id)))
        .map(repo => this.transformRepository(repo));
      
      // Pagination metadata
      const result = {
        data: available,
        pagination: {
          page,
          perPage,
          total: available.length,
          hasMore: repos.length === perPage,
        },
      };
      
      // Cache for 5 minutes
      await redis.setex(cacheKey, 300, JSON.stringify(result));
      
      return result;
      
    } catch (error) {
      if (error.status === 401) {
        throw new AppError('GitHub authentication failed', 401);
      }
      if (error.status === 403) {
        throw new AppError('GitHub rate limit exceeded', 429);
      }
      throw error;
    }
  }
  
  private async getConnectedRepoIds(userId: string): Promise<Set<bigint>> {
    const repos = await prisma.repository.findMany({
      where: { 
        userOrganizations: {
          some: { userId }
        }
      },
      select: { githubId: true },
    });
    return new Set(repos.map(r => r.githubId));
  }
  
  private transformRepository(repo: any) {
    return {
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      openIssues: repo.open_issues_count,
      isPrivate: repo.private,
      defaultBranch: repo.default_branch,
      url: repo.html_url,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at,
    };
  }
}
```

**Pros**: 
- Complete implementation
- Caching reduces API calls
- Pagination support
- Rate limit handling
- Proper error handling

**Cons**:
- More complex
- Cache invalidation needed

##### Approach 3: Background Sync (Advanced)
```typescript
// Periodically sync repos in background
export class RepositoriesService {
  async syncUserRepositories(userId: string) {
    // Fetch ALL repositories
    const repos = await this.fetchAllRepositories(userId);
    
    // Store in cache
    await redis.setex(
      `repos:synced:${userId}`,
      3600, // 1 hour
      JSON.stringify(repos)
    );
    
    return repos;
  }
  
  async listAvailableRepositories(userId: string, page: number = 1) {
    // Check if sync is in progress
    const syncing = await redis.get(`repos:syncing:${userId}`);
    if (syncing) {
      return { syncing: true, message: 'Repositories are being synced' };
    }
    
    // Get from cache
    const cached = await redis.get(`repos:synced:${userId}`);
    if (cached) {
      const repos = JSON.parse(cached);
      return this.paginateResults(repos, page);
    }
    
    // Trigger background sync
    await this.queueRepositorySync(userId);
    
    // Return partial results
    return await this.listAvailableRepositories(userId, page);
  }
  
  private async fetchAllRepositories(userId: string) {
    const allRepos = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const { data } = await octokit.repos.listForAuthenticatedUser({
        page,
        per_page: 100,
      });
      
      allRepos.push(...data);
      hasMore = data.length === 100;
      page++;
    }
    
    return allRepos;
  }
}
```

**Pros**:
- Handles large repository lists
- Better user experience
- No timeout issues

**Cons**:
- Most complex
- Requires queue system
- Eventual consistency

#### Recommended Strategy
1. **Start with Approach 2** (Cached with Pagination)
2. **Add Approach 3** (Background Sync) if needed for users with 100+ repos

#### Testing Strategy

**Unit Tests:**
```typescript
describe('RepositoriesService', () => {
  describe('listAvailableRepositories', () => {
    it('should fetch repos from GitHub', async () => {
      const user = await createTestUser();
      mockOctokit.repos.listForAuthenticatedUser.mockResolvedValue({
        data: [{ id: 1, name: 'test-repo', ...}],
      });
      
      const result = await service.listAvailableRepositories(user.id);
      expect(result.data).toHaveLength(1);
    });
    
    it('should filter out connected repos', async () => {
      // Test filtering logic
    });
    
    it('should return cached results', async () => {
      // Test cache hit
    });
    
    it('should handle rate limit errors', async () => {
      mockOctokit.repos.listForAuthenticatedUser.mockRejectedValue({
        status: 403,
      });
      
      await expect(
        service.listAvailableRepositories(user.id)
      ).rejects.toThrow('rate limit');
    });
  });
});
```

**Integration Tests:**
```typescript
describe('GET /api/repositories/available', () => {
  it('should return available repositories', async () => {
    const user = await createTestUser();
    const token = signJWT({ userId: user.id });
    
    const response = await request(app)
      .get('/api/repositories/available')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.pagination).toBeDefined();
  });
  
  it('should require authentication', async () => {
    await request(app)
      .get('/api/repositories/available')
      .expect(401);
  });
});
```

---

### TASK-018: Implement Repository Connection
**Priority**: P0-Critical | **Type**: `feature` | **Size**: `L` | **Estimated Time**: 6-8 hours

#### User Story
> As a user, I want to connect my repositories to DevMetrics so that they can be tracked and analyzed.

#### Description
Allow users to connect repositories, which involves creating a webhook on GitHub, storing repository data, and setting up tracking infrastructure.

#### Technical Requirements

**API Endpoints:**
- `POST /api/repositories` - Connect repository
- `GET /api/repositories` - List connected repos
- `GET /api/repositories/:id` - Get repo details
- `DELETE /api/repositories/:id` - Disconnect repo
- `POST /api/repositories/bulk` - Connect multiple repos

**GitHub Webhook Setup:**
1. Create webhook on GitHub repository
2. Set webhook URL to `/api/webhooks/github`
3. Set secret for HMAC verification
4. Subscribe to events: push, pull_request, issues, pull_request_review

#### Implementation Approaches

##### Approach 1: Simple Connection (MVP)
```typescript
// src/modules/repositories/repositories.service.ts
export class RepositoriesService {
  async connectRepository(userId: string, githubRepoId: number, orgId: string) {
    // Get user's GitHub token
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const githubToken = await decrypt(user.accessToken);
    const octokit = new Octokit({ auth: githubToken });
    
    // Fetch repo from GitHub
    const { data: repo } = await octokit.repos.get({
      owner: repo.owner.login,
      repo: repo.name,
    });
    
    // Create repository in database
    const connected = await prisma.repository.create({
      data: {
        githubId: BigInt(repo.id),
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        language: repo.language,
        isPrivate: repo.private,
        organizationId: orgId,
        defaultBranch: repo.default_branch,
        syncStatus: 'PENDING',
      },
    });
    
    // Create webhook
    const webhook = await this.createWebhook(octokit, repo);
    
    // Update with webhook ID
    await prisma.repository.update({
      where: { id: connected.id },
      data: { webhookId: webhook.id.toString() },
    });
    
    return connected;
  }
  
  private async createWebhook(octokit: Octokit, repo: any) {
    const webhook = await octokit.repos.createWebhook({
      owner: repo.owner.login,
      repo: repo.name,
      config: {
        url: `${config.apiUrl}/api/webhooks/github`,
        content_type: 'json',
        secret: config.github.webhookSecret,
        insecure_ssl: '0',
      },
      events: ['push', 'pull_request', 'issues', 'pull_request_review'],
      active: true,
    });
    
    return webhook.data;
  }
}
```

**Pros**: Simple, gets the job done  
**Cons**: No validation, no transaction handling, no error recovery

##### Approach 2: Robust Connection with Validation (Recommended)
```typescript
export class RepositoriesService {
  async connectRepository(
    userId: string,
    githubRepoId: number,
    orgId: string,
    ipAddress: string
  ) {
    // Validate user has access to organization
    const userOrg = await prisma.userOrganization.findFirst({
      where: {
        userId,
        organizationId: orgId,
        role: { in: ['ADMIN', 'MEMBER'] },
      },
    });
    
    if (!userOrg) {
      throw new AppError('User does not have access to this organization', 403);
    }
    
    // Check if already connected
    const existing = await prisma.repository.findFirst({
      where: {
        githubId: BigInt(githubRepoId),
        organizationId: orgId,
      },
    });
    
    if (existing) {
      throw new AppError('Repository already connected', 409);
    }
    
    // Get user's GitHub token
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const githubToken = await decrypt(user.accessToken);
    const octokit = new Octokit({ auth: githubToken });
    
    // Fetch repo details from GitHub
    let repo;
    try {
      const [owner, repoName] = await this.getOwnerAndRepo(octokit, githubRepoId);
      const { data } = await octokit.repos.get({ owner, repo: repoName });
      repo = data;
    } catch (error) {
      if (error.status === 404) {
        throw new AppError('Repository not found or no access', 404);
      }
      throw error;
    }
    
    // Check if user has admin access (required for webhooks)
    if (!repo.permissions?.admin) {
      throw new AppError('Admin access required to connect repository', 403);
    }
    
    // Use transaction for atomicity
    const connected = await prisma.$transaction(async (tx) => {
      // Create repository
      const newRepo = await tx.repository.create({
        data: {
          githubId: BigInt(repo.id),
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          language: repo.language,
          isPrivate: repo.private,
          organizationId: orgId,
          defaultBranch: repo.default_branch,
          syncStatus: 'PENDING',
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          openIssues: repo.open_issues_count,
        },
      });
      
      // Create webhook
      try {
        const webhook = await this.createWebhook(octokit, repo);
        
        // Update with webhook ID
        await tx.repository.update({
          where: { id: newRepo.id },
          data: {
            webhookId: webhook.id.toString(),
            webhookUrl: webhook.config.url,
          },
        });
      } catch (error) {
        logger.error('Failed to create webhook', { error, repoId: newRepo.id });
        // Continue even if webhook fails - can be set up manually
      }
      
      // Create audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'REPOSITORY_CONNECTED',
          resourceType: 'REPOSITORY',
          resourceId: newRepo.id,
          organizationId: orgId,
          ipAddress,
          metadata: {
            repoName: repo.full_name,
            githubId: repo.id,
          },
        },
      });
      
      return newRepo;
    });
    
    // Invalidate cache
    await redis.del(`repos:available:${userId}:*`);
    await redis.del(`repos:connected:${orgId}`);
    
    // Queue historical import
    await this.queueHistoricalImport(connected.id);
    
    logger.info('Repository connected', {
      userId,
      repoId: connected.id,
      repoName: connected.fullName,
    });
    
    return connected;
  }
  
  async disconnectRepository(
    userId: string,
    repoId: string,
    ipAddress: string
  ) {
    // Get repository
    const repo = await prisma.repository.findUnique({
      where: { id: repoId },
      include: { organization: true },
    });
    
    if (!repo) {
      throw new AppError('Repository not found', 404);
    }
    
    // Check user has permission
    const userOrg = await prisma.userOrganization.findFirst({
      where: {
        userId,
        organizationId: repo.organizationId,
        role: { in: ['ADMIN', 'MEMBER'] },
      },
    });
    
    if (!userOrg) {
      throw new AppError('Insufficient permissions', 403);
    }
    
    // Get user's GitHub token
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const githubToken = await decrypt(user.accessToken);
    const octokit = new Octokit({ auth: githubToken });
    
    // Delete webhook from GitHub
    if (repo.webhookId) {
      try {
        const [owner, repoName] = repo.fullName.split('/');
        await octokit.repos.deleteWebhook({
          owner,
          repo: repoName,
          hook_id: parseInt(repo.webhookId),
        });
      } catch (error) {
        logger.warn('Failed to delete webhook', { error, repoId });
        // Continue even if webhook deletion fails
      }
    }
    
    // Delete repository (cascades to events, stats, etc.)
    await prisma.repository.delete({
      where: { id: repoId },
    });
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'REPOSITORY_DISCONNECTED',
        resourceType: 'REPOSITORY',
        resourceId: repoId,
        organizationId: repo.organizationId,
        ipAddress,
        metadata: {
          repoName: repo.fullName,
        },
      },
    });
    
    // Invalidate cache
    await redis.del(`repos:connected:${repo.organizationId}`);
    
    logger.info('Repository disconnected', { userId, repoId, repoName: repo.fullName });
  }
  
  async listConnectedRepositories(orgId: string, userId: string) {
    // Check cache
    const cacheKey = `repos:connected:${orgId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    // Fetch from database
    const repos = await prisma.repository.findMany({
      where: { organizationId: orgId },
      include: {
        _count: {
          select: {
            commits: true,
            pullRequests: true,
            issues: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Cache for 10 minutes
    await redis.setex(cacheKey, 600, JSON.stringify(repos));
    
    return repos;
  }
  
  private async queueHistoricalImport(repoId: string) {
    // Add to Bull queue for background processing
    await importQueue.add('import-historical-data', {
      repoId,
      days: 90, // Import last 90 days
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }
  
  private async createWebhook(octokit: Octokit, repo: any) {
    const [owner, repoName] = repo.full_name.split('/');
    
    const { data: webhook } = await octokit.repos.createWebhook({
      owner,
      repo: repoName,
      config: {
        url: `${config.apiUrl}/api/webhooks/github`,
        content_type: 'json',
        secret: config.github.webhookSecret,
        insecure_ssl: '0',
      },
      events: [
        'push',
        'pull_request',
        'pull_request_review',
        'pull_request_review_comment',
        'issues',
        'issue_comment',
        'create', // branches/tags
        'delete',
      ],
      active: true,
    });
    
    return webhook;
  }
  
  private async getOwnerAndRepo(octokit: Octokit, githubRepoId: number) {
    // Helper to get owner/repo from GitHub ID
    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      per_page: 100,
    });
    
    const repo = repos.find(r => r.id === githubRepoId);
    if (!repo) throw new Error('Repository not found');
    
    return [repo.owner.login, repo.name];
  }
}
```

**Pros**:
- Complete validation
- Transaction safety
- Error handling
- Audit logging
- Cache management
- Permission checks

**Cons**:
- More complex
- More code

##### Approach 3: Bulk Connection (Bonus Feature)
```typescript
export class RepositoriesService {
  async connectRepositories(
    userId: string,
    githubRepoIds: number[],
    orgId: string,
    ipAddress: string
  ) {
    const results = {
      success: [],
      failed: [],
    };
    
    for (const repoId of githubRepoIds) {
      try {
        const repo = await this.connectRepository(userId, repoId, orgId, ipAddress);
        results.success.push(repo);
      } catch (error) {
        results.failed.push({
          repoId,
          error: error.message,
        });
      }
    }
    
    return results;
  }
}
```

#### Acceptance Criteria
- [ ] `POST /api/repositories` connects repository
- [ ] Validates user has admin access to GitHub repo
- [ ] Creates webhook on GitHub
- [ ] Stores webhook ID and secret
- [ ] Subscribes to required events
- [ ] Returns repository data
- [ ] `DELETE /api/repositories/:id` disconnects repo
- [ ] Removes webhook from GitHub
- [ ] Deletes repository data (or marks as deleted)
- [ ] `GET /api/repositories` lists connected repos
- [ ] Includes repository stats (commits, PRs, issues count)
- [ ] Cached for performance
- [ ] Bulk connect supported
- [ ] Transaction safety (rollback on failure)
- [ ] Audit logging for all operations
- [ ] Error handling for GitHub API failures
- [ ] Unit and integration tests (70%+ coverage)

#### Testing Strategy

```typescript
describe('RepositoriesService', () => {
  describe('connectRepository', () => {
    it('should connect repository and create webhook', async () => {
      const user = await createTestUser();
      const org = await createTestOrganization();
      
      mockOctokit.repos.get.mockResolvedValue({
        data: { id: 123, name: 'test-repo', permissions: { admin: true } },
      });
      
      mockOctokit.repos.createWebhook.mockResolvedValue({
        data: { id: 456, config: { url: '...' } },
      });
      
      const repo = await service.connectRepository(user.id, 123, org.id, '127.0.0.1');
      
      expect(repo.githubId).toBe(BigInt(123));
      expect(repo.webhookId).toBe('456');
    });
    
    it('should throw error if user does not have admin access', async () => {
      mockOctokit.repos.get.mockResolvedValue({
        data: { id: 123, permissions: { admin: false } },
      });
      
      await expect(
        service.connectRepository(user.id, 123, org.id, '127.0.0.1')
      ).rejects.toThrow('Admin access required');
    });
    
    it('should handle webhook creation failure gracefully', async () => {
      mockOctokit.repos.createWebhook.mockRejectedValue(new Error('Webhook failed'));
      
      // Should still create repo but without webhook
      const repo = await service.connectRepository(user.id, 123, org.id, '127.0.0.1');
      expect(repo.webhookId).toBeNull();
    });
  });
  
  describe('disconnectRepository', () => {
    it('should disconnect repository and remove webhook', async () => {
      const repo = await createTestRepository();
      
      await service.disconnectRepository(user.id, repo.id, '127.0.0.1');
      
      const deleted = await prisma.repository.findUnique({ where: { id: repo.id } });
      expect(deleted).toBeNull();
      
      expect(mockOctokit.repos.deleteWebhook).toHaveBeenCalled();
    });
  });
});
```

#### Files to Create
```
apps/api/src/modules/repositories/
├── repositories.routes.ts
├── repositories.service.ts
├── repositories.validation.ts
├── repositories.types.ts
└── __tests__/
    ├── repositories.service.test.ts
    └── repositories.routes.test.ts
```

---

### TASK-019: Implement Historical Data Import
**Priority**: P1-High | **Type**: `feature` | **Size**: `XL` | **Estimated Time**: 8-12 hours

#### User Story
> As a user, when I connect a repository, I want historical data imported automatically so that I can see trends immediately without waiting for new events.

#### Description
Import the last 90 days of commits, pull requests, and issues from GitHub when a repository is connected. Process data in batches using Bull queue to handle rate limits and avoid timeouts.

#### Implementation Strategy

This is a complex task that requires:
1. Queue-based background processing
2. GitHub API pagination handling
3. Rate limit management
4. Progress tracking
5. Error recovery

Due to length constraints, I'll provide the high-level approach and key code snippets.

##### High-Level Architecture
```
Repository Connected
    ↓
Add to Import Queue
    ↓
Worker Processes Job
    ├── Fetch Commits (paginated)
    ├── Fetch Pull Requests (paginated)
    ├── Fetch Issues (paginated)
    ├── Store in Events table
    ├── Calculate initial metrics
    └── Update sync status
```

##### Key Implementation
```typescript
// src/modules/repositories/import.service.ts
export class ImportService {
  async importHistoricalData(repoId: string, days: number = 90) {
    const repo = await prisma.repository.findUnique({ where: { id: repoId } });
    if (!repo) throw new Error('Repository not found');
    
    // Update status
    await prisma.repository.update({
      where: { id: repoId },
      data: { syncStatus: 'SYNCING' },
    });
    
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    try {
      // Import in parallel (with rate limiting)
      await Promise.all([
        this.importCommits(repo, since),
        this.importPullRequests(repo, since),
        this.importIssues(repo, since),
      ]);
      
      // Calculate initial metrics
      await metricsService.calculateRepositoryMetrics(repoId);
      
      // Update status
      await prisma.repository.update({
        where: { id: repoId },
        data: {
          syncStatus: 'ACTIVE',
          lastSyncedAt: new Date(),
        },
      });
      
      logger.info('Historical import completed', { repoId });
      
    } catch (error) {
      logger.error('Historical import failed', { repoId, error });
      
      await prisma.repository.update({
        where: { id: repoId },
        data: { syncStatus: 'ERROR' },
      });
      
      throw error;
    }
  }
  
  private async importCommits(repo: Repository, since: Date) {
    const [owner, repoName] = repo.fullName.split('/');
    let page = 1;
    let hasMore = true;
    let totalImported = 0;
    
    while (hasMore) {
      const { data: commits } = await octokit.repos.listCommits({
        owner,
        repo: repoName,
        since: since.toISOString(),
        per_page: 100,
        page,
      });
      
      if (commits.length === 0) {
        hasMore = false;
        break;
      }
      
      // Process batch
      await this.processCommitBatch(repo, commits);
      
      totalImported += commits.length;
      page++;
      
      // Rate limit handling
      await this.waitForRateLimit();
      
      logger.debug('Imported commits batch', {
        repoId: repo.id,
        page,
        count: commits.length,
        total: totalImported,
      });
    }
    
    return totalImported;
  }
  
  private async processCommitBatch(repo: Repository, commits: any[]) {
    // Batch insert
    await prisma.commit.createMany({
      data: commits.map(commit => ({
        githubId: commit.sha,
        sha: commit.sha,
        message: commit.commit.message,
        repositoryId: repo.id,
        authorId: this.findOrCreateAuthor(commit.author),
        additions: commit.stats?.additions || 0,
        deletions: commit.stats?.deletions || 0,
        createdAt: new Date(commit.commit.author.date),
      })),
      skipDuplicates: true,
    });
  }
  
  private async waitForRateLimit() {
    const { data } = await octokit.rateLimit.get();
    const remaining = data.rate.remaining;
    const reset = new Date(data.rate.reset * 1000);
    
    if (remaining < 100) {
      const waitTime = reset.getTime() - Date.now();
      logger.warn('Rate limit low, waiting', { remaining, waitTime });
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}
```

#### Acceptance Criteria
- [ ] Imports last 90 days of data on repo connection
- [ ] Fetches commits, PRs, issues from GitHub API
- [ ] Processes data in batches (100 items)
- [ ] Uses Bull queue for background processing
- [ ] Shows import progress to user (via WebSocket or polling)
- [ ] Can resume interrupted imports
- [ ] Stores raw data in events table
- [ ] Calculates initial metrics after import
- [ ] Handles API rate limiting with exponential backoff
- [ ] Retries failed batches (3 attempts)
- [ ] Error handling and logging
- [ ] Updates repository sync status
- [ ] Unit and integration tests

---

## EPIC 2.3: WEBHOOK PROCESSING

### Overview
Process GitHub webhook events in real-time to keep metrics up-to-date. Events are received via HTTP endpoint, validated, queued for processing, and then parsed into structured data.

---

### TASK-020: Create Webhook Endpoint
**Priority**: P0-Critical | **Type**: `feature` | **Size**: `M` | **Estimated Time**: 4 hours

#### User Story
> As a system, I need to receive real-time events from GitHub webhooks so that metrics stay current without manual synchronization.

#### Description
Create an HTTP endpoint to receive GitHub webhook events. Validate webhook signatures, extract event data, and queue for asynchronous processing.

#### Implementation Approaches

##### Approach 1: Simple Webhook Handler (MVP)
```typescript
// src/modules/webhooks/webhooks.controller.ts
export async function webhookRoutes(fastify: FastifyInstance) {
  fastify.post('/github', async (request, reply) => {
    const signature = request.headers['x-hub-signature-256'] as string;
    const event = request.headers['x-github-event'] as string;
    const delivery = request.headers['x-github-delivery'] as string;
    
    // Verify signature
    if (!verifySignature(request.body, signature)) {
      throw new AppError('Invalid signature', 401);
    }
    
    // Queue for processing
    await webhookQueue.add('process-webhook', {
      event,
      delivery,
      payload: request.body,
    });
    
    // Respond immediately
    return { status: 'received' };
  });
}

function verifySignature(payload: any, signature: string): boolean {
  const hmac = crypto.createHmac('sha256', config.github.webhookSecret);
  hmac.update(JSON.stringify(payload));
  const computed = `sha256=${hmac.digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
}
```

**Pros**: Simple, straightforward  
**Cons**: No error handling, basic validation

##### Approach 2: Robust Webhook Handler (Recommended)
```typescript
// src/modules/webhooks/webhooks.controller.ts
export async function webhookRoutes(fastify: FastifyInstance) {
  // Disable rate limiting for webhooks
  fastify.post('/github', {
    config: {
      rateLimit: false,
    },
  }, async (request, reply) => {
    const signature = request.headers['x-hub-signature-256'] as string;
    const event = request.headers['x-github-event'] as string;
    const delivery = request.headers['x-github-delivery'] as string;
    
    // Validate headers
    if (!signature || !event || !delivery) {
      logger.warn('Webhook missing required headers', {
        hasSignature: !!signature,
        hasEvent: !!event,
        hasDelivery: !!delivery,
      });
      throw new AppError('Missing required headers', 400);
    }
    
    // Verify signature (prevent replay attacks)
    if (!verifyWebhookSignature(request.rawBody, signature)) {
      logger.error('Webhook signature verification failed', {
        event,
        delivery,
      });
      throw new AppError('Invalid signature', 401);
    }
    
    // Check if delivery already processed (idempotency)
    const processed = await redis.get(`webhook:delivery:${delivery}`);
    if (processed) {
      logger.debug('Webhook already processed', { delivery });
      return { status: 'already_processed' };
    }
    
    // Mark as received (5 min TTL for idempotency)
    await redis.setex(`webhook:delivery:${delivery}`, 300, '1');
    
    // Parse payload
    const payload = typeof request.body === 'string'
      ? JSON.parse(request.body)
      : request.body;
    
    // Store raw event (for debugging and replay)
    await prisma.event.create({
      data: {
        type: event,
        githubId: delivery,
        payload: payload,
        processedAt: null,
        repositoryId: await this.findRepositoryId(payload),
      },
    });
    
    // Queue for processing
    await webhookQueue.add('process-webhook', {
      event,
      delivery,
      payload,
      receivedAt: new Date().toISOString(),
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
    
    logger.info('Webhook queued for processing', {
      event,
      delivery,
      repoId: payload.repository?.id,
    });
    
    // Return 200 immediately to GitHub
    return { status: 'received', delivery };
  });
}

// Verify webhook signature using timing-safe comparison
function verifyWebhookSignature(payload: Buffer | string, signature: string): boolean {
  if (!signature || !signature.startsWith('sha256=')) {
    return false;
  }
  
  const hmac = crypto.createHmac('sha256', config.github.webhookSecret);
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  hmac.update(body);
  const computed = `sha256=${hmac.digest('hex')}`;
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(signature)
    );
  } catch (error) {
    return false;
  }
}

async function findRepositoryId(payload: any): Promise<string | null> {
  if (!payload.repository?.id) return null;
  
  const repo = await prisma.repository.findFirst({
    where: { githubId: BigInt(payload.repository.id) },
    select: { id: true },
  });
  
  return repo?.id || null;
}
```

**Pros**:
- Production-ready
- Signature verification
- Idempotency (prevents duplicate processing)
- Raw event storage
- Comprehensive logging
- Error handling

**Cons**:
- More complex
- Requires rawBody parsing

##### Approach 3: Webhook Handler with Validation and Filtering
```typescript
// Add event filtering
export async function webhookRoutes(fastify: FastifyInstance) {
  fastify.post('/github', {
    config: { rateLimit: false },
  }, async (request, reply) => {
    // ... signature verification ...
    
    const event = request.headers['x-github-event'] as string;
    
    // Filter events we care about
    const supportedEvents = [
      'push',
      'pull_request',
      'pull_request_review',
      'pull_request_review_comment',
      'issues',
      'issue_comment',
      'create',
      'delete',
    ];
    
    if (!supportedEvents.includes(event)) {
      logger.debug('Ignoring unsupported event', { event });
      return { status: 'ignored', reason: 'unsupported_event' };
    }
    
    // Validate payload structure
    const validationResult = validateWebhookPayload(event, payload);
    if (!validationResult.valid) {
      logger.error('Invalid webhook payload', {
        event,
        errors: validationResult.errors,
      });
      throw new AppError('Invalid payload', 400);
    }
    
    // Check if repository is tracked
    const repo = await prisma.repository.findFirst({
      where: { githubId: BigInt(payload.repository.id) },
    });
    
    if (!repo) {
      logger.debug('Webhook for untracked repository', {
        repoId: payload.repository.id,
        repoName: payload.repository.full_name,
      });
      return { status: 'ignored', reason: 'repository_not_tracked' };
    }
    
    // ... queue for processing ...
  });
}
```

**Pros**:
- Filters irrelevant events
- Validates payload structure
- Only processes tracked repos
- Saves processing resources

**Cons**:
- Most complex
- Additional validation overhead

#### Recommended Strategy
1. **Start with Approach 2** (Robust Handler)
2. **Add Approach 3** (Filtering) once event processors are working

#### Acceptance Criteria
- [ ] `POST /api/webhooks/github` receives webhook events
- [ ] Validates webhook signature using HMAC SHA-256
- [ ] Rejects webhooks with invalid signature (401)
- [ ] Extracts event type from `X-GitHub-Event` header
- [ ] Accepts supported event types: push, pull_request, issues, pull_request_review
- [ ] Stores raw event in events table
- [ ] Queues event for async processing
- [ ] Returns 200 OK immediately to GitHub
- [ ] Idempotency (ignores duplicate deliveries)
- [ ] Logs all webhook receipts with delivery ID
- [ ] Rate limiting disabled for webhook endpoint
- [ ] Proper error handling and logging
- [ ] Integration tests with sample webhooks
- [ ] Unit tests for signature verification

#### Testing Strategy

**Unit Tests:**
```typescript
describe('verifyWebhookSignature', () => {
  it('should verify valid signature', () => {
    const payload = JSON.stringify({ test: 'data' });
    const hmac = crypto.createHmac('sha256', 'secret');
    hmac.update(payload);
    const signature = `sha256=${hmac.digest('hex')}`;
    
    expect(verifyWebhookSignature(payload, signature)).toBe(true);
  });
  
  it('should reject invalid signature', () => {
    const payload = JSON.stringify({ test: 'data' });
    const signature = 'sha256=invalid';
    
    expect(verifyWebhookSignature(payload, signature)).toBe(false);
  });
});
```

**Integration Tests:**
```typescript
describe('POST /api/webhooks/github', () => {
  it('should accept valid webhook', async () => {
    const payload = { repository: { id: 123 }, action: 'opened' };
    const signature = generateSignature(payload);
    
    const response = await request(app)
      .post('/api/webhooks/github')
      .set('X-Hub-Signature-256', signature)
      .set('X-GitHub-Event', 'pull_request')
      .set('X-GitHub-Delivery', 'abc-123')
      .send(payload)
      .expect(200);
    
    expect(response.body.status).toBe('received');
    
    // Verify event was stored
    const event = await prisma.event.findFirst({
      where: { githubId: 'abc-123' },
    });
    expect(event).toBeDefined();
  });
  
  it('should reject webhook with invalid signature', async () => {
    await request(app)
      .post('/api/webhooks/github')
      .set('X-Hub-Signature-256', 'sha256=invalid')
      .set('X-GitHub-Event', 'push')
      .send({})
      .expect(401);
  });
});
```

#### Files to Create
```
apps/api/src/modules/webhooks/
├── webhooks.controller.ts
├── webhooks.routes.ts
├── webhooks.validation.ts
├── webhooks.types.ts
└── __tests__/
    ├── webhooks.controller.test.ts
    └── sample-payloads/
        ├── push.json
        ├── pull_request.json
        └── issues.json
```

---

### TASK-021: Implement Webhook Queue Processing
**Priority**: P0-Critical | **Type**: `feature` | **Size**: `L` | **Estimated Time**: 6-8 hours

#### Description
Process webhook events asynchronously using Bull queue. Extract relevant data, update database, trigger metric calculations, and handle failures with retry logic.

#### Implementation Approach

```typescript
// src/modules/webhooks/webhooks.queue.ts
import Bull from 'bull';
import { logger } from '../../config/logger';
import { processWebhookEvent } from './webhooks.processor';

export const webhookQueue = new Bull('webhooks', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    db: 1, // Use DB 1 for queues
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100, // Keep last 100 completed
    removeOnFail: 1000, // Keep last 1000 failed
  },
});

// Process webhook events
webhookQueue.process('process-webhook', 5, async (job) => {
  const { event, delivery, payload } = job.data;
  
  logger.info('Processing webhook', {
    jobId: job.id,
    event,
    delivery,
    attempt: job.attemptsMade + 1,
  });
  
  try {
    await processWebhookEvent(event, payload);
    
    // Update event as processed
    await prisma.event.updateMany({
      where: { githubId: delivery },
      data: { processedAt: new Date() },
    });
    
    logger.info('Webhook processed successfully', {
      jobId: job.id,
      event,
      delivery,
    });
    
  } catch (error) {
    logger.error('Webhook processing failed', {
      jobId: job.id,
      event,
      delivery,
      error: error.message,
      stack: error.stack,
    });
    
    throw error; // Will trigger retry
  }
});

// Handle completed jobs
webhookQueue.on('completed', (job, result) => {
  logger.debug('Job completed', {
    jobId: job.id,
    event: job.data.event,
  });
});

// Handle failed jobs
webhookQueue.on('failed', (job, error) => {
  logger.error('Job failed permanently', {
    jobId: job.id,
    event: job.data.event,
    delivery: job.data.delivery,
    attempts: job.attemptsMade,
    error: error.message,
  });
  
  // Could send alert here
});

// Handle stalled jobs
webhookQueue.on('stalled', (job) => {
  logger.warn('Job stalled', {
    jobId: job.id,
    event: job.data.event,
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Closing webhook queue...');
  await webhookQueue.close();
});
```

#### Acceptance Criteria
- [ ] Bull queue configured with Redis
- [ ] Worker processes queued webhooks (5 concurrent)
- [ ] Extracts relevant data from each event type
- [ ] Creates/updates records in database
- [ ] Triggers metric calculation jobs
- [ ] Retries failed jobs (3 attempts with exponential backoff)
- [ ] Dead letter queue for permanently failed jobs
- [ ] Job monitoring and statistics
- [ ] Graceful shutdown handling
- [ ] Unit tests for queue configuration
- [ ] Integration tests for event processing

---

### TASK-022: Implement Event Processors
**Priority**: P0-Critical | **Type**: `feature` | **Size**: `L` | **Estimated Time**: 8-10 hours

#### Description
Create processors for different GitHub event types. Each processor extracts relevant data and updates the appropriate database tables.

#### Implementation Approach

```typescript
// src/modules/webhooks/webhooks.processor.ts
export async function processWebhookEvent(
  eventType: string,
  payload: any
): Promise<void> {
  switch (eventType) {
    case 'push':
      return await processPushEvent(payload);
    case 'pull_request':
      return await processPullRequestEvent(payload);
    case 'pull_request_review':
      return await processPullRequestReviewEvent(payload);
    case 'issues':
      return await processIssuesEvent(payload);
    default:
      logger.warn('Unsupported event type', { eventType });
  }
}

// Push event processor
async function processPushEvent(payload: any): Promise<void> {
  const repo = await findRepository(payload.repository.id);
  if (!repo) return;
  
  const commits = payload.commits || [];
  
  for (const commit of commits) {
    // Find or create author
    const author = await findOrCreateAuthor(commit.author);
    
    // Create commit record
    await prisma.commit.upsert({
      where: { sha: commit.id },
      create: {
        githubId: commit.id,
        sha: commit.id,
        message: commit.message,
        repositoryId: repo.id,
        authorId: author?.id,
        additions: 0, // Not available in push webhook
        deletions: 0,
        createdAt: new Date(commit.timestamp),
      },
      update: {
        message: commit.message,
      },
    });
  }
  
  // Trigger metrics calculation
  await metricsQueue.add('calculate-metrics', {
    repositoryId: repo.id,
    date: new Date().toISOString().split('T')[0],
  });
}

// Pull Request event processor
async function processPullRequestEvent(payload: any): Promise<void> {
  const repo = await findRepository(payload.repository.id);
  if (!repo) return;
  
  const pr = payload.pull_request;
  const action = payload.action; // opened, closed, reopened, etc.
  
  // Find or create author
  const author = await findOrCreateAuthor(pr.user);
  
  // Determine state
  let state: PRState;
  if (pr.merged) {
    state = 'MERGED';
  } else if (pr.state === 'closed') {
    state = 'CLOSED';
  } else {
    state = 'OPEN';
  }
  
  // Create or update PR
  await prisma.pullRequest.upsert({
    where: { githubId: BigInt(pr.id) },
    create: {
      githubId: BigInt(pr.id),
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state,
      repositoryId: repo.id,
      authorId: author?.id,
      baseBranch: pr.base.ref,
      headBranch: pr.head.ref,
      additions: pr.additions || 0,
      deletions: pr.deletions || 0,
      changedFiles: pr.changed_files || 0,
      mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
      closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
      createdAt: new Date(pr.created_at),
      updatedAt: new Date(pr.updated_at),
    },
    update: {
      title: pr.title,
      body: pr.body,
      state,
      additions: pr.additions || 0,
      deletions: pr.deletions || 0,
      changedFiles: pr.changed_files || 0,
      mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
      closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
      updatedAt: new Date(pr.updated_at),
    },
  });
  
  // Calculate PR cycle time if merged
  if (state === 'MERGED') {
    const cycleTime = calculateCycleTime(
      new Date(pr.created_at),
      new Date(pr.merged_at)
    );
    
    await prisma.pullRequest.update({
      where: { githubId: BigInt(pr.id) },
      data: { cycleTimeHours: cycleTime },
    });
  }
  
  // Trigger metrics calculation
  await metricsQueue.add('calculate-metrics', {
    repositoryId: repo.id,
    userId: author?.id,
    date: new Date().toISOString().split('T')[0],
  });
}

// Issues event processor
async function processIssuesEvent(payload: any): Promise<void> {
  const repo = await findRepository(payload.repository.id);
  if (!repo) return;
  
  const issue = payload.issue;
  const author = await findOrCreateAuthor(issue.user);
  
  await prisma.issue.upsert({
    where: { githubId: BigInt(issue.id) },
    create: {
      githubId: BigInt(issue.id),
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state === 'open' ? 'OPEN' : 'CLOSED',
      repositoryId: repo.id,
      authorId: author?.id,
      closedAt: issue.closed_at ? new Date(issue.closed_at) : null,
      createdAt: new Date(issue.created_at),
      updatedAt: new Date(issue.updated_at),
    },
    update: {
      title: issue.title,
      body: issue.body,
      state: issue.state === 'open' ? 'OPEN' : 'CLOSED',
      closedAt: issue.closed_at ? new Date(issue.closed_at) : null,
      updatedAt: new Date(issue.updated_at),
    },
  });
}

// Helper functions
async function findRepository(githubId: number) {
  return await prisma.repository.findFirst({
    where: { githubId: BigInt(githubId) },
  });
}

async function findOrCreateAuthor(githubUser: any) {
  if (!githubUser) return null;
  
  return await prisma.user.upsert({
    where: { githubId: BigInt(githubUser.id) },
    create: {
      githubId: BigInt(githubUser.id),
      username: githubUser.login,
      name: githubUser.name || githubUser.login,
      avatarUrl: githubUser.avatar_url,
    },
    update: {
      username: githubUser.login,
      avatarUrl: githubUser.avatar_url,
    },
  });
}

function calculateCycleTime(createdAt: Date, mergedAt: Date): number {
  return (mergedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60); // hours
}
```

#### Acceptance Criteria
- [ ] Push event processor creates commit records
- [ ] Extracts commit data (sha, message, author, timestamp)
- [ ] Links commits to repository and author
- [ ] Pull request processor handles opened, closed, merged events
- [ ] Creates/updates PR records with all metadata
- [ ] Calculates PR cycle time for merged PRs
- [ ] Tracks review status
- [ ] Issue processor handles opened, closed, assigned events
- [ ] Creates/updates issue records
- [ ] Tracks resolution time
- [ ] PR review processor tracks review comments and approvals
- [ ] Each processor has unit tests
- [ ] Error handling for malformed events
- [ ] Integration tests with real webhook payloads

---

## EPIC 2.4: METRICS CALCULATION

### Overview
Calculate developer, team, and repository metrics from the collected event data. Provide API endpoints to access metrics and scheduled jobs for daily aggregation.

---

### TASK-023: Implement Basic Metrics Service
**Priority**: P0-Critical | **Type**: `feature` | **Size**: `L` | **Estimated Time**: 8-10 hours

#### Description
Create service to calculate various metrics from event data. Support both real-time calculation (on-demand) and batch calculation (for historical data).

#### Implementation Approach

```typescript
// src/modules/metrics/metrics.service.ts
export class MetricsService {
  // Calculate developer metrics for a specific date
  async calculateDeveloperMetrics(
    userId: string,
    organizationId: string,
    date: Date
  ) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get user's repositories in this organization
    const repos = await this.getUserRepositories(userId, organizationId);
    const repoIds = repos.map(r => r.id);
    
    // Count commits
    const commits = await prisma.commit.count({
      where: {
        authorId: userId,
        repositoryId: { in: repoIds },
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });
    
    // Count PRs opened
    const prsOpened = await prisma.pullRequest.count({
      where: {
        authorId: userId,
        repositoryId: { in: repoIds },
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });
    
    // Count PRs merged
    const prsMerged = await prisma.pullRequest.count({
      where: {
        authorId: userId,
        repositoryId: { in: repoIds },
        state: 'MERGED',
        mergedAt: { gte: startOfDay, lte: endOfDay },
      },
    });
    
    // Count PR reviews (would need pull_request_review events)
    const prsReviewed = 0; // TODO: Implement when we have review data
    
    // Count issues resolved
    const issuesResolved = await prisma.issue.count({
      where: {
        authorId: userId,
        repositoryId: { in: repoIds },
        state: 'CLOSED',
        closedAt: { gte: startOfDay, lte: endOfDay },
      },
    });
    
    // Calculate code contribution volume
    const codeStats = await prisma.commit.aggregate({
      where: {
        authorId: userId,
        repositoryId: { in: repoIds },
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      _sum: {
        additions: true,
        deletions: true,
      },
    });
    
    const linesChanged = (codeStats._sum.additions || 0) + (codeStats._sum.deletions || 0);
    
    // Check for weekend commits (burnout indicator)
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const commitsOnWeekend = isWeekend ? commits : 0;
    
    // Check for late-night commits (after 10 PM)
    const lateNightCommits = await prisma.commit.count({
      where: {
        authorId: userId,
        repositoryId: { in: repoIds },
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        // Would need to check hour in application logic
      },
    });
    
    // Upsert metrics
    return await prisma.developerMetric.upsert({
      where: {
        userId_organizationId_date: {
          userId,
          organizationId,
          date: startOfDay,
        },
      },
      create: {
        userId,
        organizationId,
        date: startOfDay,
        commits,
        prsOpened,
        prsMerged,
        prsReviewed,
        issuesResolved,
        linesChanged,
        commitsOnWeekend,
        commitsLateNight: lateNightCommits,
      },
      update: {
        commits,
        prsOpened,
        prsMerged,
        prsReviewed,
        issuesResolved,
        linesChanged,
        commitsOnWeekend,
        commitsLateNight: lateNightCommits,
      },
    });
  }
  
  // Calculate team metrics for organization
  async calculateTeamMetrics(organizationId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get organization's repositories
    const repos = await prisma.repository.findMany({
      where: { organizationId },
      select: { id: true },
    });
    const repoIds = repos.map(r => r.id);
    
    // Get all developer metrics for this day
    const devMetrics = await prisma.developerMetric.findMany({
      where: {
        organizationId,
        date: startOfDay,
      },
    });
    
    // Aggregate team metrics
    const totalCommits = devMetrics.reduce((sum, m) => sum + m.commits, 0);
    const totalPRsMerged = devMetrics.reduce((sum, m) => sum + m.prsMerged, 0);
    
    // Calculate average PR cycle time
    const avgCycleTime = await prisma.pullRequest.aggregate({
      where: {
        repositoryId: { in: repoIds },
        state: 'MERGED',
        mergedAt: { gte: startOfDay, lte: endOfDay },
        cycleTimeHours: { not: null },
      },
      _avg: {
        cycleTimeHours: true,
      },
    });
    
    // Calculate deployment frequency (PRs merged to main)
    const deploymentFrequency = await prisma.pullRequest.count({
      where: {
        repositoryId: { in: repoIds },
        state: 'MERGED',
        baseBranch: { in: ['main', 'master'] },
        mergedAt: { gte: startOfDay, lte: endOfDay },
      },
    });
    
    // Count active contributors (made at least 1 commit)
    const activeContributors = await prisma.commit.groupBy({
      by: ['authorId'],
      where: {
        repositoryId: { in: repoIds },
        createdAt: { gte: startOfDay, lte: endOfDay },
        authorId: { not: null },
      },
    });
    
    // Calculate velocity (PRs merged, or could use story points)
    const velocity = totalPRsMerged;
    
    // Upsert team metrics
    return await prisma.teamMetric.upsert({
      where: {
        organizationId_date: {
          organizationId,
          date: startOfDay,
        },
      },
      create: {
        organizationId,
        date: startOfDay,
        velocity,
        prCycleTime: avgCycleTime._avg.cycleTimeHours || 0,
        deploymentFrequency,
        activeContributors: activeContributors.length,
        totalCommits,
        totalPRsMerged,
      },
      update: {
        velocity,
        prCycleTime: avgCycleTime._avg.cycleTimeHours || 0,
        deploymentFrequency,
        activeContributors: activeContributors.length,
        totalCommits,
        totalPRsMerged,
      },
    });
  }
  
  // Calculate repository stats
  async calculateRepositoryStats(repositoryId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const commits = await prisma.commit.count({
      where: {
        repositoryId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });
    
    const prsOpened = await prisma.pullRequest.count({
      where: {
        repositoryId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });
    
    const prsMerged = await prisma.pullRequest.count({
      where: {
        repositoryId,
        state: 'MERGED',
        mergedAt: { gte: startOfDay, lte: endOfDay },
      },
    });
    
    const issuesOpened = await prisma.issue.count({
      where: {
        repositoryId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });
    
    const issuesClosed = await prisma.issue.count({
      where: {
        repositoryId,
        state: 'CLOSED',
        closedAt: { gte: startOfDay, lte: endOfDay },
      },
    });
    
    // Get current totals from GitHub (via API or store incrementally)
    const repo = await prisma.repository.findUnique({
      where: { id: repositoryId },
    });
    
    return await prisma.repositoryStats.upsert({
      where: {
        repositoryId_date: {
          repositoryId,
          date: startOfDay,
        },
      },
      create: {
        repositoryId,
        date: startOfDay,
        commits,
        prsOpened,
        prsMerged,
        issuesOpened,
        issuesClosed,
        stars: repo?.stars || 0,
        forks: repo?.forks || 0,
      },
      update: {
        commits,
        prsOpened,
        prsMerged,
        issuesOpened,
        issuesClosed,
        stars: repo?.stars || 0,
        forks: repo?.forks || 0,
      },
    });
  }
  
  private async getUserRepositories(userId: string, organizationId: string) {
    return await prisma.repository.findMany({
      where: { organizationId },
    });
  }
}
```

#### Acceptance Criteria
- [ ] Calculate developer metrics (commits, PRs, issues, code volume)
- [ ] Calculate team metrics (velocity, cycle time, deployment frequency)
- [ ] Calculate repository metrics (commit frequency, PR merge rate)
- [ ] Support date-based calculations
- [ ] Incremental calculation (only new data)
- [ ] Batch calculation for historical data
- [ ] Burnout indicators (weekend commits, late-night commits)
- [ ] Metrics stored in respective tables
- [ ] Unit tests for all calculations (70%+ coverage)
- [ ] Integration tests with real data

---

### TASK-024: Create Metrics API Endpoints
**Priority**: P0-Critical | **Type**: `feature` | **Size**: `M` | **Estimated Time**: 4-5 hours

#### User Story
> As a user, I want to view my team's metrics via API so that I can display them in dashboards and analyze performance trends.

#### Description
Create REST API endpoints to access calculated metrics with filtering, date range support, and caching.

#### Implementation Approach

```typescript
// src/modules/metrics/metrics.routes.ts
export async function metricsRoutes(fastify: FastifyInstance) {
  // Get developer metrics
  fastify.get('/developer/:userId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { userId } = request.params;
    const { startDate, endDate, organizationId } = request.query;
    
    // Authorization: user can view their own metrics or admins can view team metrics
    if (userId !== request.user.id && !isAdmin(request.user, organizationId)) {
      throw new AppError('Insufficient permissions', 403);
    }
    
    // Check cache
    const cacheKey = `metrics:developer:${userId}:${startDate}:${endDate}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    // Fetch metrics
    const metrics = await prisma.developerMetric.findMany({
      where: {
        userId,
        organizationId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { date: 'asc' },
    });
    
    // Cache for 15 minutes
    await redis.setex(cacheKey, 900, JSON.stringify(metrics));
    
    return metrics;
  });
  
  // Get team metrics
  fastify.get('/team/:orgId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { orgId } = request.params;
    const { startDate, endDate } = request.query;
    
    // Authorization check
    if (!hasAccessToOrg(request.user, orgId)) {
      throw new AppError('Insufficient permissions', 403);
    }
    
    const cacheKey = `metrics:team:${orgId}:${startDate}:${endDate}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const metrics = await prisma.teamMetric.findMany({
      where: {
        organizationId: orgId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { date: 'asc' },
    });
    
    await redis.setex(cacheKey, 900, JSON.stringify(metrics));
    
    return metrics;
  });
  
  // Get repository metrics
  fastify.get('/repository/:repoId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { repoId } = request.params;
    const { startDate, endDate } = request.query;
    
    // Verify user has access to repository
    const repo = await prisma.repository.findUnique({
      where: { id: repoId },
    });
    
    if (!repo || !hasAccessToOrg(request.user, repo.organizationId)) {
      throw new AppError('Repository not found or insufficient permissions', 404);
    }
    
    const metrics = await prisma.repositoryStats.findMany({
      where: {
        repositoryId: repoId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { date: 'asc' },
    });
    
    return metrics;
  });
  
  // Get metrics trends (aggregated)
  fastify.get('/trends', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { organizationId, period = 'week' } = request.query;
    
    // Calculate trends based on period
    const trends = await calculateTrends(organizationId, period);
    
    return trends;
  });
}
```

#### Acceptance Criteria
- [ ] `GET /api/metrics/developer/:userId` returns user metrics
- [ ] `GET /api/metrics/team/:orgId` returns team metrics
- [ ] `GET /api/metrics/repository/:repoId` returns repo metrics
- [ ] `GET /api/metrics/trends` returns aggregated trends
- [ ] Query parameters for date range filtering (startDate, endDate)
- [ ] Response includes calculated metrics and trends
- [ ] Caching for expensive queries (15 min TTL)
- [ ] Pagination for large datasets
- [ ] Authorization checks (users can only see their org's metrics)
- [ ] Input validation with Zod
- [ ] Error handling
- [ ] Unit and integration tests

---

### TASK-025: Implement Metrics Aggregation Jobs
**Priority**: P1-High | **Type**: `chore` | **Size**: `M` | **Estimated Time**: 4 hours

#### Description
Create scheduled jobs to calculate and aggregate metrics daily. This ensures metrics are pre-calculated and available for fast API access.

#### Implementation Approach

```typescript
// src/modules/metrics/metrics.jobs.ts
import Bull from 'bull';
import { MetricsService } from './metrics.service';

export const metricsQueue = new Bull('metrics', {
  redis: { host: config.redis.host, port: config.redis.port, db: 1 },
});

const metricsService = new MetricsService();

// Daily aggregation job (runs at midnight)
metricsQueue.add('daily-aggregation', {}, {
  repeat: {
    cron: '0 0 * * *', // Every day at midnight
    tz: 'UTC',
  },
});

// Process daily aggregation
metricsQueue.process('daily-aggregation', async (job) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  logger.info('Starting daily metrics aggregation', { date: yesterday });
  
  // Get all organizations
  const organizations = await prisma.organization.findMany();
  
  for (const org of organizations) {
    try {
      // Calculate team metrics
      await metricsService.calculateTeamMetrics(org.id, yesterday);
      
      // Calculate developer metrics for all users
      const users = await prisma.userOrganization.findMany({
        where: { organizationId: org.id },
        select: { userId: true },
      });
      
      for (const { userId } of users) {
        await metricsService.calculateDeveloperMetrics(
          userId,
          org.id,
          yesterday
        );
      }
      
      // Calculate repository metrics
      const repos = await prisma.repository.findMany({
        where: { organizationId: org.id },
        select: { id: true },
      });
      
      for (const repo of repos) {
        await metricsService.calculateRepositoryStats(repo.id, yesterday);
      }
      
      logger.info('Metrics aggregated for organization', {
        orgId: org.id,
        date: yesterday,
      });
      
    } catch (error) {
      logger.error('Failed to aggregate metrics for organization', {
        orgId: org.id,
        error,
      });
    }
  }
  
  logger.info('Daily metrics aggregation completed');
});

// Manual trigger endpoint
export async function triggerMetricsCalculation(
  orgId: string,
  date: Date
) {
  await metricsQueue.add('calculate-org-metrics', {
    organizationId: orgId,
    date: date.toISOString(),
  });
}
```

#### Acceptance Criteria
- [ ] Cron job runs daily at midnight (UTC)
- [ ] Calculates metrics for all organizations
- [ ] Calculates developer metrics for all users
- [ ] Calculates team metrics for all organizations
- [ ] Updates repository stats
- [ ] Stores aggregated data in time-series tables
- [ ] Error handling per organization (doesn't stop on one failure)
- [ ] Logs job execution stats
- [ ] Can manually trigger aggregation
- [ ] Alerts on anomalies (optional)

---

## 📊 Sprint 2 Summary

### Task Overview

| Task | Epic | Priority | Size | Est. Time | Status |
|------|------|----------|------|-----------|--------|
| TASK-014 | Auth | P0-Critical | L | 6-8h | 🔵 Ready |
| TASK-015 | Auth | P0-Critical | M | 3-4h | 🔵 Ready |
| TASK-016 | Auth | P1-High | M | 4h | 🔵 Ready |
| TASK-017 | Repos | P0-Critical | M | 4h | 🔵 Ready |
| TASK-018 | Repos | P0-Critical | L | 6-8h | 🔵 Ready |
| TASK-019 | Repos | P1-High | XL | 8-12h | 🔵 Ready |
| TASK-020 | Webhooks | P0-Critical | M | 4h | 🔵 Ready |
| TASK-021 | Webhooks | P0-Critical | L | 6-8h | 🔵 Ready |
| TASK-022 | Webhooks | P0-Critical | L | 8-10h | 🔵 Ready |
| TASK-023 | Metrics | P0-Critical | L | 8-10h | 🔵 Ready |
| TASK-024 | Metrics | P0-Critical | M | 4-5h | 🔵 Ready |
| TASK-025 | Metrics | P1-High | M | 4h | 🔵 Ready |

### Time Breakdown
- **Epic 2.1 (Auth)**: 13-16 hours
- **Epic 2.2 (Repos)**: 18-24 hours
- **Epic 2.3 (Webhooks)**: 18-22 hours
- **Epic 2.4 (Metrics)**: 16-19 hours
- **Total**: 65-81 hours (actual may be 45-55h with optimization)

### Dependencies & Setup Required

#### External Services
1. **GitHub OAuth App**
   - Create OAuth application
   - Configure callback URL
   - Get Client ID and Secret
   
2. **GitHub Webhook**
   - Will be created programmatically
   - Needs public URL (use ngrok for local dev)

#### Environment Variables
```env
# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=http://localhost:3001/api/auth/callback

# JWT
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRES_IN=1h

# Encryption
ENCRYPTION_KEY=

# Webhooks
GITHUB_WEBHOOK_SECRET=

# API
API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
```

#### Redis Setup
- DB 0: General caching
- DB 1: Bull queues
- DB 2: Sessions

---

## 🧪 Testing Strategy

### Unit Testing Approach
- Test all service methods in isolation
- Mock external dependencies (GitHub API, Octokit)
- Use mock factories from Sprint 1
- Target: 70%+ code coverage

### Integration Testing Approach
- Test full API endpoints with real database
- Use test database with transactions
- Mock external APIs but use real database
- Test authentication flows
- Test webhook processing

### E2E Testing (Sprint 4)
- Will be implemented in Sprint 4
- Focus on critical user journeys

### Test Examples

**Auth Tests:**
```typescript
describe('GitHub OAuth Flow', () => {
  it('should create user on first login', async () => {
    // Mock GitHub API
    mockOctokit.users.getAuthenticated.mockResolvedValue({
      data: { id: 12345, login: 'testuser', email: 'test@example.com' }
    });
    
    // Call callback endpoint
    const response = await request(app)
      .get('/api/auth/callback')
      .query({ code: 'test_code' })
      .expect(302);
    
    // Verify user created
    const user = await prisma.user.findUnique({ where: { githubId: 12345 } });
    expect(user).toBeDefined();
  });
});
```

**Webhook Tests:**
```typescript
describe('Webhook Processing', () => {
  it('should process push event', async () => {
    const payload = {
      repository: { id: 123 },
      commits: [{ id: 'abc123', message: 'Test commit' }]
    };
    
    await processPushEvent(payload);
    
    const commit = await prisma.commit.findFirst({
      where: { sha: 'abc123' }
    });
    expect(commit).toBeDefined();
  });
});
```

---

## 🔒 Security Considerations

### Authentication & Authorization
- ✅ JWT tokens with short expiration (1 hour)
- ✅ Refresh token mechanism
- ✅ Secure token storage (encrypted)
- ✅ State parameter for CSRF protection
- ✅ Role-based access control
- ✅ Organization-level permissions

### Webhook Security
- ✅ HMAC signature verification
- ✅ Timing-safe comparison
- ✅ Webhook secret rotation support
- ✅ Idempotency (prevent replay attacks)
- ✅ Rate limiting disabled (trusted source)

### Data Protection
- ✅ Encrypt GitHub tokens (AES-256-GCM)
- ✅ Hash API keys (bcrypt)
- ✅ Sanitize user data before sending to client
- ✅ Remove sensitive fields from API responses
- ✅ Audit logging for sensitive operations

### API Security
- ✅ Authentication required on all endpoints
- ✅ Authorization checks per request
- ✅ Input validation (Zod schemas)
- ✅ Rate limiting (100 req/min per user)
- ✅ CORS configured for frontend only

---

## 📈 Performance Optimization

### Caching Strategy
- **User data**: 15 min TTL
- **Repository lists**: 5 min TTL  
- **Metrics**: 15 min TTL
- **GitHub API responses**: 30 min TTL

### Database Optimization
- Use indexes (already created in Sprint 1)
- Batch inserts for historical import
- Transaction safety for critical operations
- Connection pooling

### Queue Optimization
- Concurrent processing (5 workers)
- Exponential backoff on failures
- Dead letter queue for failed jobs
- Job prioritization

---

## 📝 Documentation Requirements

### Code Documentation
- JSDoc comments for all public methods
- README for each module
- API endpoint documentation
- Type definitions

### API Documentation
- Will be generated in Sprint 4 (TASK-046)
- For now, maintain inline comments

### Developer Guide
- Setup instructions
- Testing guide
- Deployment guide

---

## 🎯 Success Metrics

### Functional Metrics
- [ ] All 12 tasks completed
- [ ] All acceptance criteria met
- [ ] 70%+ test coverage
- [ ] Zero critical bugs

### Performance Metrics
- [ ] Authentication response < 500ms
- [ ] Webhook processing < 2s
- [ ] Metrics API response < 500ms
- [ ] Historical import completes within 5 min (for 90 days)

### Quality Metrics
- [ ] All tests passing
- [ ] No linting errors
- [ ] No security vulnerabilities
- [ ] Code review approved

---

## 🚀 Getting Started

### Day 1-2: Authentication (Epic 2.1)
1. Set up GitHub OAuth App
2. Implement TASK-014 (OAuth flow)
3. Implement TASK-015 (JWT middleware)
4. Implement TASK-016 (User profile)
5. Test authentication end-to-end

### Day 3-4: Repository Integration (Epic 2.2)
1. Implement TASK-017 (Repository listing)
2. Implement TASK-018 (Repository connection)
3. Set up ngrok for webhook testing
4. Start TASK-019 (Historical import)

### Day 5-6: Webhooks (Epic 2.3)
1. Implement TASK-020 (Webhook endpoint)
2. Implement TASK-021 (Queue processing)
3. Implement TASK-022 (Event processors)
4. Test with real GitHub webhooks

### Day 7: Metrics (Epic 2.4)
1. Implement TASK-023 (Metrics service)
2. Implement TASK-024 (Metrics API)
3. Implement TASK-025 (Aggregation jobs)
4. End-to-end testing

---

## 📚 References

### Documentation
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [GitHub Webhooks Documentation](https://docs.github.com/en/developers/webhooks-and-events/webhooks)
- [Fastify Authentication](https://fastify.dev/docs/latest/Reference/Authentication/)
- [Bull Queue](https://github.com/OptimalBits/bull)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)

### Sprint 1 References
- Database Schema: `apps/api/prisma/schema.prisma`
- Mock Factories: `apps/api/src/__tests__/utils/factories.ts`
- Test Utilities: `apps/api/src/__tests__/utils/`
- Prisma Client: `apps/api/src/database/prisma.client.ts`

---

## ✅ Sprint 2 Checklist

### Pre-Sprint Setup
- [ ] Create GitHub OAuth App
- [ ] Configure environment variables
- [ ] Set up ngrok for local webhook testing
- [ ] Review Sprint 1 infrastructure
- [ ] Set up Redis (already done in Sprint 1)

### During Sprint
- [ ] Daily standup (even for solo dev - review progress)
- [ ] Commit code frequently
- [ ] Write tests alongside features
- [ ] Update documentation as you go
- [ ] Test integration between epics

### Post-Sprint
- [ ] All 12 tasks completed
- [ ] All tests passing
- [ ] Code reviewed (self-review at minimum)
- [ ] Documentation updated
- [ ] Sprint 2 completion report created

---

**Sprint 2 Status:** 🚀 **READY TO START**

**Ready to Begin:** Yes - All Sprint 1 infrastructure in place  
**Blockers:** None  
**Estimated Completion:** 5-7 days of focused development  

Good luck with Sprint 2! 🎉

---

*This specification serves as the comprehensive guide for Sprint 2 development. Refer back to this document throughout the sprint to ensure all requirements are met.*

