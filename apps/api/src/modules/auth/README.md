# Authentication Module

Complete GitHub OAuth 2.0 authentication implementation with JWT token management.

## Features

- ✅ GitHub OAuth 2.0 flow with state parameter (CSRF protection)
- ✅ JWT access tokens (1 hour expiration)
- ✅ JWT refresh tokens (7 days expiration)
- ✅ Encrypted GitHub token storage (AES-256-GCM)
- ✅ User creation/update on login
- ✅ Token refresh mechanism
- ✅ User profile management
- ✅ Logout with cache invalidation
- ✅ Audit logging for authentication events
- ✅ Redis caching for user data

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   Frontend  │────▶│  Auth API   │────▶│    GitHub    │
└─────────────┘     └─────────────┘     └──────────────┘
       │                   │                     │
       │              ┌────▼────┐                │
       │              │  Redis  │                │
       │              └─────────┘                │
       │                   │                     │
       │              ┌────▼────┐                │
       └──────────────│Database │◀───────────────┘
                      └─────────┘
```

## API Endpoints

### `GET /api/auth/github`
Initiate GitHub OAuth flow.

**Query Parameters:**
- `redirectUrl` (optional): Frontend URL to redirect after authentication

**Response:** 302 Redirect to GitHub

---

### `GET /api/auth/callback`
Handle GitHub OAuth callback.

**Query Parameters:**
- `code` (required): Authorization code from GitHub
- `state` (required): State parameter for CSRF protection

**Response:** 302 Redirect to frontend with tokens

**Success URL:** `${FRONTEND_URL}/auth/callback?token=<jwt>&refreshToken=<refresh>`

**Error URL:** `${FRONTEND_URL}/auth/error?error=<message>`

---

### `GET /api/auth/me`
Get current authenticated user.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "githubId": 12345,
    "username": "johndoe",
    "email": "john@example.com",
    "name": "John Doe",
    "avatarUrl": "https://avatars.githubusercontent.com/u/12345",
    "bio": "Software Developer",
    "location": "San Francisco",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z",
    "lastLoginAt": "2025-01-01T00:00:00Z",
    "organizations": [
      {
        "id": "org_456",
        "name": "Acme Corp",
        "slug": "acme-corp",
        "role": "ADMIN"
      }
    ]
  }
}
```

---

### `POST /api/auth/refresh`
Refresh access token.

**Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new_access_token",
    "refreshToken": "new_refresh_token",
    "expiresIn": "1h"
  }
}
```

---

### `POST /api/auth/logout`
Logout current user.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### `GET /api/auth/status`
Check authentication status (no auth required).

**Headers:**
- `Authorization: Bearer <token>` (optional)

**Response:**
```json
{
  "authenticated": true,
  "userId": "user_123"
}
```

Or:
```json
{
  "authenticated": false
}
```

## OAuth Flow

### 1. Initiate OAuth
```
GET /api/auth/github
  ↓
Generate state parameter
  ↓
Store state in Redis (5 min TTL)
  ↓
Redirect to GitHub OAuth page
```

### 2. User Authorizes
```
User clicks "Authorize" on GitHub
  ↓
GitHub redirects to callback URL with code & state
```

### 3. Handle Callback
```
GET /api/auth/callback?code=xxx&state=yyy
  ↓
Verify state parameter (CSRF protection)
  ↓
Exchange code for access token
  ↓
Fetch user profile from GitHub
  ↓
Create/update user in database
  ↓
Encrypt and store GitHub token
  ↓
Generate JWT tokens
  ↓
Cache user data in Redis
  ↓
Create audit log
  ↓
Redirect to frontend with tokens
```

## Security

### Token Storage
- **GitHub Access Token:** Encrypted with AES-256-GCM before storage
- **JWT Access Token:** Stored in frontend (localStorage/sessionStorage)
- **JWT Refresh Token:** Stored in frontend (httpOnly cookie recommended)

### CSRF Protection
- State parameter generated with crypto.randomBytes(32)
- State stored in Redis with 5-minute expiration
- State verified on callback and deleted after use (one-time use)

### Token Expiration
- **Access Token:** 1 hour (configurable via JWT_EXPIRES_IN)
- **Refresh Token:** 7 days (configurable via JWT_REFRESH_EXPIRES_IN)
- **OAuth State:** 5 minutes

### Audit Logging
All authentication events are logged:
- User login (USER_LOGIN)
- User logout (USER_LOGOUT)
- Token refresh (implicit)

## Environment Variables

Required:
```env
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_REDIRECT_URI=http://localhost:3001/api/auth/callback
GITHUB_OAUTH_SCOPES=repo,user:email,read:org

JWT_SECRET=32_char_random_string
JWT_REFRESH_SECRET=32_char_random_string
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

ENCRYPTION_KEY=64_hex_char_string
ENCRYPTION_ALGORITHM=aes-256-gcm

FRONTEND_URL=http://localhost:3000
```

## Usage Example

### Frontend Integration

```typescript
// 1. Redirect to GitHub OAuth
window.location.href = 'http://localhost:3001/api/auth/github';

// 2. Handle callback (in /auth/callback route)
const params = new URLSearchParams(window.location.search);
const token = params.get('token');
const refreshToken = params.get('refreshToken');

if (token) {
  localStorage.setItem('accessToken', token);
  localStorage.setItem('refreshToken', refreshToken);
  // Redirect to dashboard
  window.location.href = '/dashboard';
}

// 3. Make authenticated requests
fetch('http://localhost:3001/api/users/me', {
  headers: {
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`
  }
});

// 4. Refresh token when expired
async function refreshToken() {
  const response = await fetch('http://localhost:3001/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refreshToken: localStorage.getItem('refreshToken')
    })
  });
  
  const data = await response.json();
  localStorage.setItem('accessToken', data.data.accessToken);
  localStorage.setItem('refreshToken', data.data.refreshToken);
}

// 5. Logout
async function logout() {
  await fetch('http://localhost:3001/api/auth/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`
    }
  });
  
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  window.location.href = '/';
}
```

## Testing

### Unit Tests
```bash
npm test src/modules/auth/__tests__/auth.service.test.ts
```

### Integration Tests
```bash
npm test src/modules/auth/__tests__/auth.routes.test.ts
```

## Files

```
auth/
├── auth.service.ts       # Core authentication logic
├── auth.routes.ts        # HTTP endpoints
├── auth.types.ts         # TypeScript interfaces
├── auth.validation.ts    # Zod validation schemas
├── index.ts              # Module exports
├── README.md             # This file
└── __tests__/
    ├── auth.service.test.ts
    └── auth.routes.test.ts
```

## Dependencies

- `@octokit/rest` - GitHub API client
- `axios` - HTTP requests for OAuth
- `jsonwebtoken` - JWT token generation/verification
- `crypto` (Node.js built-in) - Encryption and random generation
- `zod` - Request validation

## Next Steps (TASK-015)

The JWT authentication middleware will be implemented in the next task, which will:
- Replace the basic token validation in routes
- Attach user object to request
- Provide role-based access control
- Implement organization-based permissions
- Cache user data for performance

## Troubleshooting

### "Invalid or expired state parameter"
- State has expired (5 min timeout)
- State mismatch (possible CSRF attempt)
- Redis connection issue

**Solution:** Try authentication flow again

### "Failed to authenticate with GitHub"
- Invalid client ID or secret
- Network issue
- GitHub API down

**Solution:** Check environment variables and GitHub OAuth app settings

### "Invalid or expired token"
- Token has expired (1 hour for access token)
- Token is malformed
- Secret has changed

**Solution:** Use refresh token to get new access token

### "User not found"
- User was deleted
- Database connection issue

**Solution:** Re-authenticate or contact support

