# MCP Server Setup Guide

## ✅ Installation Complete!

Your DevMetrics MCP Server has been successfully:
- ✅ Dependencies installed
- ✅ TypeScript compiled to JavaScript
- ✅ Configuration template created

## 🚀 Enable in Claude Desktop

### Step 1: Locate Claude Desktop Config

The configuration file is located at:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

### Step 2: Edit Configuration

Open the file and add the DevMetrics MCP server configuration:

```json
{
  "mcpServers": {
    "devmetrics": {
      "command": "node",
      "args": [
        "/Users/chandradrusya/Desktop/devmet-app/mcp-server/dist/index.js"
      ],
      "env": {
        "DEVMETRICS_API_URL": "http://localhost:3001/api",
        "DEVMETRICS_API_KEY": "",
        "DEVMETRICS_AUTH_TOKEN": ""
      }
    }
  }
}
```

**Or use the quick config file:**
```bash
# The configuration is ready in: claude-desktop-config.json
# Copy its contents to your Claude Desktop config
```

### Step 3: Configure API Access

Edit the `.env` file in the `mcp-server` directory:

```bash
cd /Users/chandradrusya/Desktop/devmet-app/mcp-server
nano .env  # or use your preferred editor
```

Update these values:
```env
DEVMETRICS_API_URL=http://localhost:3001/api
DEVMETRICS_API_KEY=your_api_key_here
DEVMETRICS_AUTH_TOKEN=your_jwt_token_here
```

### Step 4: Restart Claude Desktop

After saving the configuration:
1. Quit Claude Desktop completely
2. Restart Claude Desktop
3. The DevMetrics MCP server will be available!

## 🧪 Test the MCP Server

In Claude Desktop, try these queries:

```
"Show me all repositories"
"What are the metrics for repository X?"
"Get AI insights for pull request #123"
"What's our team velocity?"
```

## 🔧 Enable in Cursor IDE

For Cursor IDE, add to your workspace settings or `.cursorrules`:

```json
{
  "mcpServers": {
    "devmetrics": {
      "command": "node",
      "args": [
        "/Users/chandradrusya/Desktop/devmet-app/mcp-server/dist/index.js"
      ],
      "env": {
        "DEVMETRICS_API_URL": "http://localhost:3001/api",
        "DEVMETRICS_AUTH_TOKEN": "your_jwt_token_here"
      }
    }
  }
}
```

## 📋 Available Tools

Once enabled, Claude can use these 16 tools:

### Repository Tools
- `get_repositories` - List all repositories
- `get_repository` - Get repository details
- `get_repository_metrics` - Get repository metrics

### Pull Request Tools
- `get_pull_requests` - List PRs with filters
- `get_pull_request` - Get PR details
- `get_pr_ai_insights` - Get AI analysis
- `trigger_pr_analysis` - Trigger new analysis

### Metrics Tools
- `get_team_velocity` - Team velocity
- `get_team_metrics` - Team performance
- `get_developer_metrics` - Developer stats
- `get_pr_cycle_time` - PR cycle time
- `get_deployment_metrics` - Deployment data
- `get_build_success_rate` - Build success rate

### Analytics Tools
- `get_repository_analytics` - Repository analytics
- `get_trends` - Historical trends
- `health_check` - API health status

## 🔍 Troubleshooting

### MCP Server Not Showing Up

1. Check Claude Desktop config file syntax (valid JSON)
2. Verify the path to `index.js` is correct
3. Ensure Node.js is in your PATH
4. Restart Claude Desktop completely

### Connection Errors

1. Verify DevMetrics API is running at the configured URL
2. Check API key/token is valid
3. Test API connectivity: `curl http://localhost:3001/api/health`

### Tool Execution Errors

1. Check `.env` file has correct values
2. Verify API authentication
3. Check logs in terminal where Claude runs

## 🎯 Quick Start Commands

```bash
# Test the MCP server manually
cd /Users/chandradrusya/Desktop/devmet-app/mcp-server
node dist/index.js

# Rebuild after code changes
npm run build

# Watch mode for development
npm run watch
```

## 📖 Documentation

- Full MCP Server docs: [README.md](./README.md)
- Backend Architecture: [../Backend.md](../Backend.md)
- Frontend Architecture: [../Frontend.md](../Frontend.md)
- Main README: [../README.md](../README.md)

## ✨ Example Conversations

Once enabled, try asking Claude:

**Repository Insights:**
> "Show me all my connected repositories and their current metrics"

**Pull Request Analysis:**
> "What pull requests are currently open? Show me the ones with high risk scores"

**Team Performance:**
> "What's our team velocity over the last 4 sprints? Show me the trend"

**Developer Metrics:**
> "Show me the top contributors this month with their commit and PR stats"

**Deployment Tracking:**
> "What's our deployment frequency and build success rate for the main repository?"

---

**Need Help?** See the full documentation in [README.md](./README.md)

