# DevMetrics - Real-time Development Analytics Platform

> AI-powered development analytics platform that integrates with GitHub to provide actionable insights for engineering teams.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14+-black.svg)](https://nextjs.org/)

## 📋 Overview

DevMetrics processes repository events in real-time, applies AI-powered analysis using Claude, and presents metrics through an intuitive dashboard. Perfect for engineering managers, team leads, and individual developers wanting productivity insights.

### Key Features

- 🔄 **Real-time Analytics** - Live updates from GitHub webhooks
- 🤖 **AI-Powered Insights** - Automated code review using Claude API
- 📊 **Comprehensive Metrics** - Team velocity, PR cycle time, deployment frequency
- 🔔 **Smart Notifications** - Slack, Discord, and in-app alerts
- 🎯 **Sprint Monitoring** - Burndown charts and velocity tracking
- 🔍 **Developer Insights** - Individual contribution analysis
- 🚀 **MCP Integration** - Model Context Protocol server for AI assistants

## 🏗️ Project Structure

```
devmet-app/
├── mcp-server/              # Model Context Protocol Server
│   ├── src/
│   │   ├── index.ts         # MCP server implementation
│   │   ├── client.ts        # DevMetrics API client
│   │   └── types.ts         # Type definitions
│   └── README.md
├── Backend.md               # Backend architecture documentation
├── Frontend.md              # Frontend architecture documentation
└── README.md               # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x or higher
- PostgreSQL 15+ with TimescaleDB
- Redis 7.x
- GitHub OAuth App credentials
- Anthropic Claude API key (for AI features)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/drusya-github/devmet-app.git
   cd devmet-app
   ```

2. **Set up the MCP Server** (Optional - for AI assistant integration)
   ```bash
   cd mcp-server
   npm install
   cp .env.example .env
   # Edit .env with your API credentials
   npm run build
   npm start
   ```

3. **Review Architecture Documentation**
   - See [Backend.md](./Backend.md) for backend architecture
   - See [Frontend.md](./Frontend.md) for frontend architecture
   - See [mcp-server/README.md](./mcp-server/README.md) for MCP integration

## 📚 Documentation

### Architecture Documents

| Document | Description |
|----------|-------------|
| [Backend.md](./Backend.md) | Complete backend architecture including API design, database schema, queue system, and deployment strategies |
| [Frontend.md](./Frontend.md) | Frontend architecture with Next.js 14+, component structure, state management, and real-time features |
| [MCP Server](./mcp-server/README.md) | Model Context Protocol server for AI assistant integration |

### Technology Stack

#### Backend
- **Runtime**: Node.js 20.x with TypeScript
- **Framework**: Fastify or Express.js
- **Database**: PostgreSQL 15+ with TimescaleDB
- **Cache**: Redis 7.x
- **Queue**: Bull/BullMQ with Redis
- **Real-time**: Socket.io
- **AI**: Anthropic Claude API

#### Frontend
- **Framework**: Next.js 14+ (App Router)
- **UI Library**: Shadcn/ui or Material-UI
- **State**: Zustand + React Query
- **Charts**: Recharts / D3.js
- **Real-time**: Socket.io Client

#### MCP Server
- **Protocol**: Model Context Protocol (MCP)
- **Tools**: 16 tools for metrics and analytics
- **Resources**: 5 resource endpoints
- **Integration**: Compatible with Claude Desktop, Cursor IDE

## 🎯 Core Features

### 1. Repository Integration
- Connect multiple GitHub repositories
- Automatic webhook registration
- Historical data import (90 days)
- Real-time event processing

### 2. Analytics Dashboard
- Team velocity trends
- PR cycle time metrics
- Deployment frequency
- Build success rates
- Code review coverage
- Individual developer metrics

### 3. AI-Powered Code Review
- Risk score calculation (0-100)
- Complexity assessment
- Security vulnerability detection
- Bug identification
- Code quality suggestions
- Estimated review time

### 4. Smart Notifications
- Configurable alert rules
- Multiple delivery channels (Slack, Discord, Email)
- In-app notification center
- Quiet hours support

### 5. MCP Integration
Enable AI assistants like Claude to:
- Query repository metrics
- Analyze pull requests
- Access team performance data
- Retrieve developer contributions
- Monitor CI/CD metrics

## 🔧 MCP Server Usage

The DevMetrics MCP server allows AI assistants to interact with your development analytics.

### Setup with Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "devmetrics": {
      "command": "node",
      "args": ["/path/to/devmet-app/mcp-server/dist/index.js"],
      "env": {
        "DEVMETRICS_API_URL": "http://localhost:3001/api",
        "DEVMETRICS_AUTH_TOKEN": "your_jwt_token"
      }
    }
  }
}
```

### Example Queries

Ask your AI assistant:
- "Show me all repositories and their metrics"
- "What are the AI insights for PR #123?"
- "What's our team velocity over the last 4 sprints?"
- "Analyze the deployment metrics for repository X"

See [mcp-server/README.md](./mcp-server/README.md) for complete documentation.

## 🛠️ Development

### Project Planning

The project follows a 4-week sprint plan:

- **Week 1**: Foundation (Auth, webhooks, data ingestion)
- **Week 2**: Core Analytics (Metrics, dashboard)
- **Week 3**: AI & Real-time (Claude integration, WebSockets)
- **Week 4**: Polish & Scale (API, optimization, deployment)

### Development Workflow

1. **Feature branches**: `feature/[week]-[feature-name]`
2. **Daily commits**: Descriptive commit messages
3. **Testing**: 70%+ coverage on critical paths
4. **Code review**: Self-review checklist before merge
5. **Documentation**: Update docs with new features

## 🔐 Security

- OAuth 2.0 for GitHub authentication
- JWT tokens for API authentication
- Rate limiting (100 req/min per user)
- HTTPS everywhere
- Encrypted storage for tokens
- GDPR compliance
- Input validation and SQL injection prevention
- XSS and CSRF protection

## 📊 Performance Targets

- **API response time**: < 200ms (p95)
- **Dashboard load time**: < 2 seconds
- **Webhook processing**: < 5 seconds
- **Real-time updates**: < 100ms latency
- **Support**: 10,000 concurrent users

## 🧪 Testing

- **Unit Tests**: Jest with 70%+ coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: Playwright for critical flows
- **Performance Tests**: K6 or Artillery

## 📦 Deployment

### Docker Support

```bash
# Development
docker-compose up -d

# Production
docker build -t devmetrics .
docker run -p 3001:3001 devmetrics
```

### Cloud Platforms

- **Recommended**: Vercel (frontend) + AWS ECS (backend)
- **Alternative**: Azure App Service, DigitalOcean
- **Database**: AWS RDS, Supabase, or self-hosted

## 🤝 Contributing

Contributions are welcome! Please read the architecture documentation first:

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👥 Authors

DevMetrics Team

## 🙏 Acknowledgments

- [GitHub API](https://docs.github.com/en/rest)
- [Anthropic Claude](https://www.anthropic.com/claude)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Next.js](https://nextjs.org/)
- [Shadcn/ui](https://ui.shadcn.com/)

## 📞 Support

- **Documentation**: See Backend.md and Frontend.md
- **Issues**: [GitHub Issues](https://github.com/drusya-github/devmet-app/issues)
- **MCP Server**: See [mcp-server/README.md](./mcp-server/README.md)

---

**Built with ❤️ for engineering teams**
