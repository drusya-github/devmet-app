# DevMetrics API

Backend API for DevMetrics - Real-time Development Analytics Platform

## ✅ Installation Complete!

Your API is fully configured and ready for development!

## 🚀 Quick Start

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run database migrations
npm run db:migrate

# Open Prisma Studio (database GUI)
npm run db:studio
```

## 📊 What's Configured

### Database

- ✅ PostgreSQL 14.19 installed and running
- ✅ Database `devmetrics` created
- ✅ User `devmetrics_user` configured
- ✅ All tables migrated (13 models)
- ✅ Prisma Client generated

### Services

- ✅ Redis 8.2.1 running
- ✅ Node.js 18.20.8
- ✅ TypeScript 5.9.3

### Dependencies

- ✅ 476 packages installed
- ✅ Fastify (API framework)
- ✅ Prisma (ORM)
- ✅ Socket.io (real-time)
- ✅ Bull (job queue)
- ✅ And more...

## 📁 Project Structure

```
apps/api/
├── src/
│   ├── config/              # Configuration files
│   ├── modules/             # Feature modules
│   │   ├── auth/           # Authentication
│   │   ├── repositories/   # Repository management
│   │   ├── webhooks/       # GitHub webhooks
│   │   ├── metrics/        # Metrics calculation
│   │   ├── pull-requests/  # PR management
│   │   ├── analytics/      # Analytics engine
│   │   ├── ai/             # AI integration
│   │   └── notifications/  # Notifications
│   ├── services/           # Shared services
│   │   ├── github/        # GitHub API client
│   │   ├── cache/         # Redis cache
│   │   └── socket/        # WebSocket service
│   ├── middleware/         # Express middleware
│   ├── workers/            # Background workers
│   ├── queues/             # Job queues
│   ├── utils/              # Utilities
│   ├── types/              # TypeScript types
│   └── server.ts           # Main server file
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Migration files
├── tests/                  # Test files
├── logs/                   # Log files
├── .env                    # Environment variables
├── tsconfig.json           # TypeScript config
└── package.json            # Dependencies

```

## 🗄️ Database Schema

13 models configured:

- User, Organization, UserOrganization
- Repository, RepositoryStats
- Event, Commit
- PullRequest, Review, AIReview
- Issue
- DeveloperMetric, TeamMetric
- NotificationRule, NotificationLog

## 🔐 Environment Variables

All configured in `.env`:

- ✅ Database connection
- ✅ Redis connection
- ✅ GitHub OAuth credentials
- ✅ JWT secret
- ✅ API configuration

## 🧪 Testing the API

```bash
# Start the server
npm run dev

# In another terminal, test the API
curl http://localhost:3001/health
curl http://localhost:3001/api
```

Expected response:

```json
{
  "status": "ok",
  "database": "connected"
}
```

## 📝 Next Steps

1. **Implement API Modules** - See `Backend.md` for architecture details
2. **Add Authentication** - Implement GitHub OAuth flow
3. **Create Webhooks Handler** - Process GitHub events
4. **Build Metrics Engine** - Calculate team metrics
5. **Add AI Integration** - Integrate Claude API (optional)

## 🛠️ Development Commands

```bash
# Database commands
npm run db:migrate      # Run migrations
npm run db:generate     # Generate Prisma Client
npm run db:studio       # Open Prisma Studio
npm run db:reset        # Reset database (WARNING: deletes data!)

# Development
npm run dev             # Start dev server with auto-reload
npm run build           # Build TypeScript
npm start               # Start production server

# Code quality
npm run lint            # Run ESLint
npm test                # Run tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

## 📚 Documentation

- **Backend Architecture**: See `../../Backend.md`
- **API Setup Guide**: See `../../API_SETUP_GUIDE.md`
- **Quick Start**: See `../../QUICK_START.md`
- **Configuration Status**: See `../../CONFIGURATION_STATUS.md`

## 🔌 API Endpoints (To Be Implemented)

### Authentication

- `POST /api/auth/github` - GitHub OAuth
- `GET /api/auth/callback` - OAuth callback
- `POST /api/auth/logout` - Logout

### Repositories

- `GET /api/repositories` - List repositories
- `POST /api/repositories` - Connect repository
- `GET /api/repositories/:id` - Get repository details

### Metrics

- `GET /api/metrics/velocity` - Team velocity
- `GET /api/metrics/cycle-time` - PR cycle time
- `GET /api/metrics/deployment` - Deployment metrics

### Webhooks

- `POST /api/webhooks/github` - GitHub webhook receiver

## 🆘 Troubleshooting

### Server won't start

```bash
# Check services are running
brew services list | grep -E "(postgresql|redis)"

# Start services if needed
brew services start postgresql@14
brew services start redis
```

### Database connection failed

```bash
# Test connection manually
psql -U devmetrics_user -d devmetrics -h localhost
# Password: devpass123
```

### TypeScript errors

```bash
# Regenerate Prisma Client
npm run db:generate

# Check TypeScript compilation
npx tsc --noEmit
```

## 🎯 API Status

- ✅ Infrastructure setup complete
- ✅ Database configured and migrated
- ✅ Basic server running
- ⏳ API endpoints to be implemented
- ⏳ Authentication to be added
- ⏳ Business logic to be built

## 📧 Support

See main project README and documentation files for complete guides.

---

**Ready to build!** 🚀 Follow `Backend.md` for implementation details.
