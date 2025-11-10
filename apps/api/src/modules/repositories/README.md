# Repositories Module

This module handles GitHub repository listing and management for the DevMetrics platform.

## Features

- **Repository Listing**: Fetch available GitHub repositories for authenticated users
- **Smart Filtering**: Automatically filters out already connected repositories
- **Caching**: Redis-based caching (5 minutes TTL) for improved performance
- **Pagination**: Support for paginated repository listings
- **Rate Limit Handling**: Graceful handling of GitHub API rate limits
- **Error Handling**: Comprehensive error handling for various failure scenarios

## API Endpoints

### GET /api/repositories/available

List available GitHub repositories for the authenticated user.

**Authentication**: Required (JWT token)

**Query Parameters**:
- `page` (optional): Page number (default: 1, max: 100)
- `perPage` (optional): Items per page (default: 30, max: 100)
- `type` (optional): Repository type filter - `all`, `owner`, or `member` (default: `all`)
- `sort` (optional): Sort order - `created`, `updated`, `pushed`, or `full_name` (default: `updated`)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 123456789,
      "name": "my-repo",
      "fullName": "owner/my-repo",
      "description": "Repository description",
      "language": "TypeScript",
      "stars": 42,
      "forks": 10,
      "openIssues": 3,
      "isPrivate": false,
      "defaultBranch": "main",
      "url": "https://github.com/owner/my-repo",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-02T00:00:00Z",
      "pushedAt": "2024-01-03T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 30,
    "total": 1,
    "hasMore": false
  }
}
```

**Error Responses**:
- `401`: Not authenticated or GitHub authentication failed
- `429`: GitHub API rate limit exceeded
- `500`: Internal server error

## Implementation Details

### Service Layer

The `RepositoriesService` class provides the core business logic:

- **listAvailableRepositories**: Fetches repositories from GitHub, filters connected ones, and caches results
- **invalidateCache**: Clears cached repository listings (called when repos are connected/disconnected)

### Caching Strategy

- Cache key format: `repos:available:{userId}:{type}:{sort}:{page}:{perPage}`
- TTL: 5 minutes (300 seconds)
- Cache invalidation: Automatic when repositories are connected or disconnected

### Filtering Logic

The service automatically filters out repositories that are already connected to any organization the user belongs to. This prevents duplicate connections and provides a cleaner user experience.

### Error Handling

The service handles various error scenarios:

- **User not found**: Returns 404
- **Missing access token**: Returns 401 with helpful message
- **Token decryption failure**: Returns 401 with re-authentication suggestion
- **GitHub API errors**:
  - 401: Authentication failed
  - 403: Rate limit exceeded (returns 429)
  - Other errors: Generic 500 error

## Testing

### Unit Tests

Located in `__tests__/repositories.service.test.ts`:
- Cache hit scenarios
- GitHub API integration
- Filtering logic
- Error handling
- Pagination options

### Integration Tests

Located in `__tests__/repositories.routes.test.ts`:
- Endpoint authentication
- Query parameter validation
- Service integration
- Error response handling

## Dependencies

- `@octokit/rest`: GitHub API client
- `prisma`: Database access
- `redis`: Caching
- `zod`: Input validation
- `fastify`: HTTP server framework

## Usage Example

```typescript
import { repositoriesService } from './modules/repositories';

// List available repositories
const result = await repositoriesService.listAvailableRepositories(userId, {
  page: 1,
  perPage: 30,
  type: 'all',
  sort: 'updated',
});

// Invalidate cache when repository is connected
await repositoriesService.invalidateCache(userId);
```

## Related Tasks

- **TASK-017**: Implement Repository Listing from GitHub (✅ Complete)
- **TASK-018**: Implement Repository Connection (Next)
- **TASK-019**: Implement Historical Data Import (Future)

