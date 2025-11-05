# DevMetrics AI Assistant Primer

## Project Overview
You are assisting with **DevMetrics**, a developer metrics and analytics platform that integrates with GitHub to provide insights into developer productivity, code quality, and team collaboration.

## Core Functionality
- **GitHub Integration**: OAuth authentication, repository analysis, webhook handling
- **Metrics Tracking**: Commit frequency, PR velocity, code review stats, deployment metrics
- **Real-time Updates**: Socket.io for live metric updates
- **AI Insights**: Anthropic Claude for analyzing developer patterns and suggesting improvements
- **Developer Dashboard**: Visualize metrics, trends, and team performance
- **MCP Server**: Model Context Protocol server for AI-powered queries

## Tech Stack Details

### Backend (apps/api)
- **Framework**: Fastify (high-performance Node.js web framework)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL 15 with Prisma ORM
- **Cache**: Redis for session management and caching
- **Queue**: Bull for background job processing
- **Real-time**: Socket.io for WebSocket connections
- **Auth**: JWT tokens with GitHub OAuth
- **Logging**: Winston for structured logging
- **Validation**: Zod for runtime type validation

### Frontend (apps/frontend) - Planned
- **Framework**: React with TypeScript
- **State**: TBD (likely Redux or Zustand)
- **UI**: TBD (likely Tailwind CSS + shadcn/ui)
- **Charts**: TBD (likely Recharts or Chart.js)

### Infrastructure
- **Package Manager**: npm
- **Node Version**: 20.x
- **Development OS**: macOS (Darwin)
- **Database Version**: PostgreSQL 15
- **Redis Version**: Latest stable

## Project Architecture

### Directory Structure
```
devmet-app/
├── apps/api/                    # Backend API
│   ├── src/
│   │   ├── routes/              # Fastify route handlers
│   │   ├── services/            # Business logic layer
│   │   ├── utils/               # Helper functions
│   │   ├── types/               # TypeScript type definitions
│   │   ├── middleware/          # Custom middleware
│   │   └── server.ts            # Application entry point
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema
│   │   └── migrations/          # Migration history
│   ├── .env                     # Environment variables (git-ignored)
│   └── package.json
├── mcp-server/                  # MCP integration
├── docs/                        # Documentation
└── [Configuration files]
```

## Database Schema (Key Models)
- **User**: Developer profiles, GitHub integration
- **Repository**: Tracked GitHub repositories
- **Commit**: Individual commit records
- **PullRequest**: PR tracking and metrics
- **Metric**: Aggregated developer metrics
- **Session**: User authentication sessions

## API Patterns

### Route Structure
```typescript
// apps/api/src/routes/example.ts
import { FastifyPluginAsync } from 'fastify';

const exampleRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/endpoint', {
    schema: {
      // Zod validation schema
    },
    handler: async (request, reply) => {
      // Handler logic
    }
  });
};

export default exampleRoute;
```

### Service Pattern
```typescript
// apps/api/src/services/exampleService.ts
export class ExampleService {
  constructor(private prisma: PrismaClient) {}
  
  async getData(id: string) {
    // Business logic
  }
}
```

## Coding Conventions

### TypeScript
- **Strict Mode**: Always enabled
- **No Any**: Avoid `any`, use `unknown` if type is unclear
- **Return Types**: Explicitly define return types
- **Async/Await**: Prefer over promises chains
- **Error Handling**: Always handle errors, use try-catch

### Naming Conventions
- **Files**: camelCase for files (`userService.ts`)
- **Classes**: PascalCase (`UserService`)
- **Functions**: camelCase (`getUserById`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Interfaces**: PascalCase, no `I` prefix (`User`, not `IUser`)

### API Design
- **RESTful**: Follow REST conventions
- **Versioning**: Use `/api/v1/` prefix
- **Status Codes**: Use appropriate HTTP codes
  - 200: Success
  - 201: Created
  - 400: Bad Request
  - 401: Unauthorized
  - 403: Forbidden
  - 404: Not Found
  - 500: Server Error
- **Error Format**: Consistent error response structure
  ```json
  {
    "error": {
      "code": "ERROR_CODE",
      "message": "Human-readable message",
      "details": {}
    }
  }
  ```

### Database Best Practices
- **Transactions**: Use for multi-step operations
- **Indexes**: Add for frequently queried fields
- **Relations**: Leverage Prisma relations
- **Migrations**: Never modify existing migrations
- **Seeds**: Use for development data

## Environment Configuration

### Required Environment Variables
```bash
# Application
NODE_ENV=development|production
PORT=3001

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/devmetrics

# Redis
REDIS_URL=redis://localhost:6379

# GitHub OAuth
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
GITHUB_WEBHOOK_SECRET=xxx
GITHUB_CALLBACK_URL=http://localhost:3000/auth/callback

# JWT
JWT_SECRET=xxx
JWT_EXPIRES_IN=7d

# Anthropic AI
ANTHROPIC_API_KEY=sk-ant-xxx

# Frontend
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

## Development Workflow

### Starting Development
1. Ensure PostgreSQL and Redis are running
2. Navigate to `apps/api`
3. Run `npm run dev`
4. API available at `http://localhost:3001`

### Making Changes
1. Create feature branch from main
2. Write code following conventions
3. Run tests: `npm test`
4. Check types: `npx tsc --noEmit`
5. Format code: `npm run format` (if configured)
6. Commit with descriptive message

### Database Changes
1. Update `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name descriptive_name`
3. Run `npx prisma generate`
4. Update TypeScript types if needed
5. Test migration on fresh database

## Common Tasks for AI Assistant

### When Adding Features
1. **Understand Requirements**: Ask clarifying questions if needed
2. **Check Existing Patterns**: Look for similar implementations
3. **Follow Structure**: Use established patterns
4. **Add Validation**: Use Zod for input validation
5. **Handle Errors**: Proper try-catch and error responses
6. **Add Types**: Define TypeScript interfaces/types
7. **Update Documentation**: Keep README/docs in sync

### When Debugging
1. **Check Logs**: Review Winston logs
2. **Verify Environment**: Confirm .env variables
3. **Test Services**: Ensure PostgreSQL, Redis running
4. **Review Stack Trace**: Identify error source
5. **Check Database**: Use Prisma Studio if needed
6. **Test Endpoints**: Use curl or API client

### When Refactoring
1. **Maintain Backwards Compatibility**: Don't break existing APIs
2. **Update Tests**: Ensure tests still pass
3. **Follow Patterns**: Stay consistent with codebase
4. **Document Changes**: Update relevant docs
5. **Consider Performance**: Don't introduce regressions

## Key Integration Points

### GitHub API
- Use `@octokit/rest` for GitHub API calls
- Handle rate limits gracefully
- Cache responses when appropriate
- Use webhooks for real-time updates

### Anthropic Claude
- Use `@anthropic-ai/sdk`
- Implement streaming for long responses
- Handle API errors and retries
- Cache responses for similar queries

### Socket.io
- Emit events for real-time updates
- Use rooms for user-specific broadcasts
- Handle disconnections gracefully
- Authenticate socket connections

## Security Considerations
- **Never log secrets**: Sanitize logs
- **Validate all inputs**: Use Zod schemas
- **Rate limit endpoints**: Prevent abuse
- **Use HTTPS in production**: Enforce TLS
- **Sanitize user data**: Prevent XSS/SQL injection
- **Rotate secrets regularly**: Update JWT secrets
- **Implement CORS properly**: Restrict origins

## Testing Strategy
- **Unit Tests**: Test individual functions/services
- **Integration Tests**: Test API endpoints
- **Database Tests**: Use test database
- **Mock External APIs**: Don't call GitHub/Anthropic in tests
- **Coverage**: Aim for >80% code coverage

## Performance Optimization
- **Use Redis caching**: Cache expensive queries
- **Database indexes**: Index foreign keys and search fields
- **Lazy loading**: Don't load unnecessary relations
- **Pagination**: Limit query results
- **Background jobs**: Use Bull for async tasks
- **Connection pooling**: Leverage Prisma's connection pool

## Documentation Standards
- **Code comments**: Explain "why", not "what"
- **JSDoc**: Document public APIs
- **README files**: Keep up to date
- **API docs**: Document all endpoints
- **Change logs**: Track significant changes

## AI Assistant Guidelines

### When Helping with Code
- **Analyze first**: Read existing code before suggesting changes
- **Stay consistent**: Match existing code style
- **Be thorough**: Consider edge cases
- **Explain decisions**: Provide context for suggestions
- **Test-driven**: Suggest tests alongside code

### Communication Style
- **Be concise**: Get to the point
- **Be specific**: Reference exact files/functions
- **Be helpful**: Provide examples
- **Be proactive**: Suggest improvements
- **Be honest**: Say "I don't know" if uncertain

### Project-Specific Preferences
- **Absolute paths**: Use full paths in configs
- **TypeScript strict**: No implicit any
- **Async/await**: Prefer over .then() chains
- **Functional style**: Prefer pure functions
- **Descriptive names**: Choose clarity over brevity
- **Single responsibility**: One function, one purpose

## Quick Reference

### Useful Commands
```bash
# Health check
curl http://localhost:3001/health

# View logs
tail -f logs/combined.log

# Database GUI
npx prisma studio

# Generate types
npx prisma generate

# New migration
npx prisma migrate dev

# Check ports
lsof -i :3001

# Redis CLI
redis-cli

# PostgreSQL CLI
psql -U devmetrics_user -d devmetrics
```

### Important Paths
- API: `/Users/chandradrusya/Desktop/devmet-app/apps/api`
- MCP: `/Users/chandradrusya/Desktop/devmet-app/mcp-server`
- Docs: `/Users/chandradrusya/Desktop/devmet-app/docs`

### Key URLs
- API: `http://localhost:3001`
- Frontend: `http://localhost:3000`
- Database: `localhost:5432`
- Redis: `localhost:6379`

---

**Remember**: This is an active development project. Always check the latest code before making assumptions, and follow established patterns to maintain consistency.

