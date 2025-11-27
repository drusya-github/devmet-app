# Authentication Middleware

JWT authentication and authorization middleware for Fastify routes.

## Features

- ✅ JWT token verification
- ✅ User data caching with Redis (15 min TTL)
- ✅ Role-based access control
- ✅ Organization-based access control
- ✅ Optional authentication (for public routes with optional user context)
- ✅ Type-safe with TypeScript

## Usage

### Basic Authentication

Protect a route by requiring authentication:

```typescript
import { FastifyInstance } from 'fastify';

export async function myRoutes(fastify: FastifyInstance) {
  fastify.get('/protected', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    // request.user is now available and typed
    return {
      userId: request.user.id,
      email: request.user.email,
    };
  });
}
```

### Optional Authentication

Allow access with or without authentication:

```typescript
fastify.get('/public', {
  preHandler: [fastify.optionalAuthenticate]
}, async (request, reply) => {
  if (request.user) {
    return { message: `Hello ${request.user.name}` };
  }
  return { message: 'Hello guest' };
});
```

### Role-Based Authorization

Require specific roles:

```typescript
fastify.get('/admin', {
  preHandler: [
    fastify.authenticate,
    fastify.requireRole(['ADMIN'])
  ]
}, async (request, reply) => {
  return { message: 'Admin area' };
});

// Multiple roles allowed
fastify.get('/moderator', {
  preHandler: [
    fastify.authenticate,
    fastify.requireRole(['ADMIN', 'MODERATOR'])
  ]
}, async (request, reply) => {
  return { message: 'Moderator area' };
});
```

### Organization-Based Authorization

Require user to belong to a specific organization:

```typescript
// Organization ID from route params
fastify.get('/org/:organizationId/repos', {
  preHandler: [
    fastify.authenticate,
    fastify.requireOrganization() // Extracts orgId from params
  ]
}, async (request, reply) => {
  const { organizationId } = request.params as { organizationId: string };
  // User is guaranteed to belong to this organization
  return { organizationId };
});

// Organization ID provided explicitly
fastify.get('/org/repos', {
  preHandler: [
    fastify.authenticate,
    fastify.requireOrganization('specific-org-id')
  ]
}, async (request, reply) => {
  return { message: 'Organization repos' };
});

// Organization ID from query string
fastify.get('/repos', {
  preHandler: [
    fastify.authenticate,
    fastify.requireOrganization() // Extracts orgId from query
  ]
}, async (request, reply) => {
  const { organizationId } = request.query as { organizationId: string };
  return { organizationId };
});
```

### Combining Multiple Middleware

Chain multiple middleware functions:

```typescript
fastify.delete('/org/:organizationId/repos/:repoId', {
  preHandler: [
    fastify.authenticate,           // Must be authenticated
    fastify.requireRole(['ADMIN']), // Must be admin
    fastify.requireOrganization()   // Must belong to org
  ]
}, async (request, reply) => {
  // All checks passed
  return { success: true };
});
```

## API Reference

### `fastify.authenticate`

Verifies JWT token and attaches user to request. Throws `AppError` (401) if:
- No token provided
- Invalid token
- Expired token
- User not found

**Usage:**
```typescript
preHandler: [fastify.authenticate]
```

### `fastify.optionalAuthenticate`

Verifies JWT token if present, but doesn't throw if missing or invalid. Sets `request.user` to `undefined` if not authenticated.

**Usage:**
```typescript
preHandler: [fastify.optionalAuthenticate]
```

### `fastify.requireRole(roles: string[])`

Factory function that returns middleware checking if user has any of the required roles. Throws `AppError` (403) if user doesn't have required role.

**Parameters:**
- `roles` - Array of allowed roles (e.g., `['ADMIN', 'MEMBER']`)

**Usage:**
```typescript
preHandler: [fastify.authenticate, fastify.requireRole(['ADMIN'])]
```

### `fastify.requireOrganization(organizationId?: string)`

Factory function that returns middleware checking if user belongs to organization. Throws `AppError` (403) if user doesn't belong to organization.

**Parameters:**
- `organizationId` - Optional organization ID or slug. If not provided, extracts from `request.params.organizationId` or `request.query.organizationId`

**Usage:**
```typescript
// From params
preHandler: [fastify.authenticate, fastify.requireOrganization()]

// Explicit ID
preHandler: [fastify.authenticate, fastify.requireOrganization('org-id')]
```

## TypeScript Types

The middleware extends Fastify's types to include `request.user`:

```typescript
import type { AuthenticatedUser } from '../types/fastify';

// request.user is typed as AuthenticatedUser | undefined
fastify.get('/me', {
  preHandler: [fastify.authenticate]
}, async (request, reply) => {
  // TypeScript knows request.user is defined here
  const user: AuthenticatedUser = request.user!;
  
  return {
    id: user.id,
    email: user.email,
    organizations: user.organizations,
  };
});
```

## Caching

User data is cached in Redis for 15 minutes to reduce database load. Cache is automatically invalidated when:
- User logs out
- User profile is updated
- `invalidateUserCache()` is called manually

**Manual cache invalidation:**
```typescript
import { invalidateUserCache } from '../middleware/auth.middleware';

// Invalidate user cache
await invalidateUserCache(userId);
```

## Error Handling

All middleware functions throw `AppError` with appropriate status codes:

- `401 Unauthorized` - Authentication failed
- `403 Forbidden` - Authorization failed (insufficient permissions)
- `400 Bad Request` - Missing required parameters

Errors are automatically handled by the global error handler and return JSON responses:

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "No token provided",
  "timestamp": "2025-11-07T12:00:00.000Z",
  "path": "/api/protected"
}
```

## Token Format

Tokens must be provided in the `Authorization` header using the Bearer scheme:

```
Authorization: Bearer <jwt_token>
```

## Examples

### Protected User Profile Endpoint

```typescript
fastify.get('/api/users/me', {
  preHandler: [fastify.authenticate]
}, async (request, reply) => {
  return {
    id: request.user.id,
    email: request.user.email,
    name: request.user.name,
    organizations: request.user.organizations.map(uo => ({
      id: uo.organization.id,
      name: uo.organization.name,
      role: uo.role,
    })),
  };
});
```

### Admin-Only Endpoint

```typescript
fastify.delete('/api/users/:userId', {
  preHandler: [
    fastify.authenticate,
    fastify.requireRole(['ADMIN'])
  ]
}, async (request, reply) => {
  const { userId } = request.params as { userId: string };
  // Delete user logic
  return { success: true };
});
```

### Organization-Scoped Endpoint

```typescript
fastify.get('/api/org/:organizationId/metrics', {
  preHandler: [
    fastify.authenticate,
    fastify.requireOrganization()
  ]
}, async (request, reply) => {
  const { organizationId } = request.params as { organizationId: string };
  // Fetch metrics for organization
  // User is guaranteed to have access
  return { organizationId, metrics: [] };
});
```

## Testing

See test files for examples:
- Unit tests: `apps/api/src/middleware/__tests__/auth.middleware.test.ts`
- Integration tests: `apps/api/src/middleware/__tests__/auth.middleware.integration.test.ts`

## Security Considerations

- ✅ JWT tokens are verified with signature validation
- ✅ Token expiration is checked
- ✅ User existence is verified on every request (cached)
- ✅ Role checks prevent privilege escalation
- ✅ Organization checks prevent unauthorized access
- ✅ All errors are logged for security monitoring
- ✅ Cache TTL is set to 15 minutes (balance between performance and freshness)

## Performance

- User data is cached in Redis (15 min TTL)
- Database queries only occur on cache miss
- Middleware is lightweight and fast
- No external API calls during authentication

## Related

- JWT utilities: `apps/api/src/utils/jwt.ts`
- Error handling: `apps/api/src/middleware/error-handler.ts`
- Type definitions: `apps/api/src/types/fastify.d.ts`






