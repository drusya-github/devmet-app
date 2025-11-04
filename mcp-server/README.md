# DevMetrics MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that provides AI assistants like Claude with access to DevMetrics real-time development analytics data.

## Overview

This MCP server enables AI assistants to:
- Query repository metrics and statistics
- Analyze pull requests with AI-powered insights
- Access team velocity and performance metrics
- Retrieve developer contributions and analytics
- Monitor CI/CD deployment metrics
- Get real-time notifications and alerts

## Features

### 🔧 **Tools** (Actions AI can perform)

1. **Repository Management**
   - `get_repositories` - List all connected repositories
   - `get_repository` - Get details of a specific repository
   - `get_repository_metrics` - Get metrics for a repository

2. **Pull Request Analysis**
   - `get_pull_requests` - List pull requests with filters
   - `get_pull_request` - Get PR details
   - `get_pr_ai_insights` - Get AI analysis (risk score, suggestions, bugs)
   - `trigger_pr_analysis` - Trigger new AI analysis

3. **Team Metrics**
   - `get_team_velocity` - Sprint velocity over time
   - `get_team_metrics` - Comprehensive team performance
   - `get_pr_cycle_time` - Average PR cycle time

4. **Developer Metrics**
   - `get_developer_metrics` - Individual contributions and stats

5. **DevOps Metrics**
   - `get_deployment_metrics` - Deployment frequency
   - `get_build_success_rate` - CI/CD success rates

6. **Analytics**
   - `get_repository_analytics` - Comprehensive repository analytics
   - `get_trends` - Historical trend analysis
   - `health_check` - API health status

### 📚 **Resources** (Read-only data access)

- `devmetrics://repositories` - All repositories
- `devmetrics://pull-requests` - All pull requests
- `devmetrics://notifications` - All notifications
- `devmetrics://repository/{id}` - Specific repository
- `devmetrics://pull-request/{id}` - Specific pull request

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- Access to a running DevMetrics API instance

### Install Dependencies

```bash
cd mcp-server
npm install
```

### Build

```bash
npm run build
```

## Configuration

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Configure your environment variables:

```env
# DevMetrics API Configuration
DEVMETRICS_API_URL=http://localhost:3001/api
DEVMETRICS_API_KEY=your_api_key_here
DEVMETRICS_AUTH_TOKEN=your_jwt_token_here

# Server Configuration
MCP_SERVER_NAME=devmetrics
MCP_SERVER_VERSION=1.0.0
```

## Usage

### Running Standalone

```bash
npm start
```

### Using with Claude Desktop

Add to your Claude Desktop configuration file:

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "devmetrics": {
      "command": "node",
      "args": [
        "/absolute/path/to/devmet-app/mcp-server/dist/index.js"
      ],
      "env": {
        "DEVMETRICS_API_URL": "http://localhost:3001/api",
        "DEVMETRICS_AUTH_TOKEN": "your_jwt_token_here"
      }
    }
  }
}
```

### Using with Cursor IDE

Add to `.cursorrules` or your MCP configuration:

```json
{
  "mcpServers": {
    "devmetrics": {
      "command": "node",
      "args": [
        "/absolute/path/to/devmet-app/mcp-server/dist/index.js"
      ],
      "env": {
        "DEVMETRICS_API_URL": "http://localhost:3001/api",
        "DEVMETRICS_AUTH_TOKEN": "your_jwt_token_here"
      }
    }
  }
}
```

## Example Queries

Once configured, you can ask your AI assistant questions like:

### Repository Insights
```
"Show me all my connected repositories"
"What are the metrics for repository X?"
"Which repositories have the most activity this week?"
```

### Pull Request Analysis
```
"Show me all open pull requests"
"What are the AI insights for PR #123?"
"Which pull requests have high risk scores?"
"Analyze pull request #456 for potential bugs"
```

### Team Performance
```
"What's our team velocity over the last 4 sprints?"
"Show me the PR cycle time for the main repository"
"What's our deployment frequency this month?"
```

### Developer Metrics
```
"Show me John's contributions this week"
"Who are the top contributors this month?"
"What's the build success rate for our CI/CD pipeline?"
```

### Trends & Analytics
```
"Show me velocity trends over the last 3 months"
"What's the trend for deployment frequency?"
"Give me comprehensive analytics for repository X"
```

## Development

### Run in Development Mode

```bash
npm run dev
```

### Watch Mode (Auto-rebuild on changes)

```bash
npm run watch
```

### Type Checking

TypeScript is configured in strict mode for better type safety.

## API Client

The MCP server includes a fully-typed API client (`src/client.ts`) that handles:
- Authentication via API key or JWT token
- Error handling and retries
- Request/response type safety
- Automatic error transformation

## Architecture

```
mcp-server/
├── src/
│   ├── index.ts          # MCP server implementation
│   ├── client.ts         # DevMetrics API client
│   └── types.ts          # TypeScript type definitions
├── dist/                 # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Type Definitions

All data types are fully typed with TypeScript. Key interfaces include:

- `Repository` - Repository information and metadata
- `PullRequest` - Pull request details and metrics
- `AIInsights` - AI analysis results (risk, bugs, suggestions)
- `TeamMetrics` - Team performance metrics
- `DeveloperMetrics` - Individual developer statistics
- `VelocityMetric` - Sprint velocity calculations

See `src/types.ts` for complete definitions.

## Error Handling

The MCP server provides comprehensive error handling:

- API connection errors
- Authentication failures
- Invalid parameters
- Network timeouts
- Malformed responses

All errors are caught and returned with descriptive messages.

## Security

### Best Practices

1. **Never commit `.env` files** - Use `.env.example` as a template
2. **Use environment variables** - Store sensitive data in environment variables
3. **Rotate tokens** - Regularly update API keys and JWT tokens
4. **Limit permissions** - Use API keys with minimal required permissions
5. **Use HTTPS** - Always connect to DevMetrics API over HTTPS in production

### Authentication

The server supports two authentication methods:

1. **API Key** - Set `DEVMETRICS_API_KEY` environment variable
2. **JWT Token** - Set `DEVMETRICS_AUTH_TOKEN` environment variable

Both are sent with every request to the DevMetrics API.

## Troubleshooting

### Server won't start

- Ensure Node.js version is 18.0.0 or higher
- Run `npm install` to install dependencies
- Check that `.env` file exists and is configured
- Verify DevMetrics API is running and accessible

### Connection errors

- Check `DEVMETRICS_API_URL` is correct
- Ensure DevMetrics API is running
- Verify network connectivity
- Check firewall settings

### Authentication errors

- Verify `DEVMETRICS_API_KEY` or `DEVMETRICS_AUTH_TOKEN` is valid
- Check token hasn't expired
- Ensure user has necessary permissions

### Tool execution errors

- Check API endpoint exists and is correct
- Verify required parameters are provided
- Check API response format matches expected types

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add/update tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Related Projects

- [DevMetrics API](../apps/api) - Backend API
- [DevMetrics Web](../apps/web) - Frontend dashboard
- [Model Context Protocol](https://modelcontextprotocol.io) - MCP specification

## Support

For issues and questions:
- GitHub Issues: [devmet-app/issues](https://github.com/drusya-github/devmet-app/issues)
- Documentation: See `Backend.md` and `Frontend.md` in project root

## Changelog

### v1.0.0 (2025-11-04)
- Initial release
- 16 tools for querying metrics and analytics
- 5 resources for read-only data access
- Full TypeScript support
- Comprehensive error handling
- Documentation and examples

---

**Built with ❤️ for the DevMetrics project**

