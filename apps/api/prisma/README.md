# Prisma Database Schema

This directory contains the Prisma schema definition and migration files for the DevMetrics application.

---

## 📁 Directory Structure

```
prisma/
├── README.md              # This file
├── schema.prisma          # Database schema definition (16 models)
├── seed.ts               # Database seeding script
└── migrations/           # Database migration history
    ├── 20251104222616_init/
    │   └── migration.sql
    └── migration_lock.toml
```

---

## 📋 Schema Overview

The DevMetrics database consists of **16 models** organized into logical groups:

### Core Models (3)
- `User` - User accounts with GitHub OAuth
- `Organization` - Companies and teams
- `UserOrganization` - Many-to-many membership with roles

### Repository Models (2)
- `Repository` - Connected GitHub repositories
- `RepositoryStats` - Daily repository statistics

### Activity Models (4)
- `Event` - Raw webhook events
- `Commit` - Git commits
- `PullRequest` - Pull requests
- `Issue` - GitHub issues

### Metrics Models (3)
- `DeveloperMetric` - Per-user daily metrics
- `TeamMetric` - Per-organization daily metrics
- `AIReview` - AI code review results

### Notification Models (2)
- `NotificationRule` - Alert configurations
- `NotificationLog` - Delivery tracking

### Security Models (2)
- `ApiKey` - External API access
- `AuditLog` - Security audit trail

---

## 🚀 Quick Start

### First Time Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   # Ensure DATABASE_URL is set in .env
   DATABASE_URL="postgresql://user:pass@localhost:5432/devmetrics"
   ```

3. **Generate Prisma Client**
   ```bash
   npm run db:generate
   ```

4. **Sync database schema**
   ```bash
   npm run db:push
   # or for production:
   npm run db:migrate
   ```

5. **Seed with test data**
   ```bash
   npm run db:seed
   ```

---

## 📝 Common Commands

### Development

```bash
# Generate Prisma Client (run after schema changes)
npm run db:generate

# Push schema changes to database (development)
npx prisma db push

# Open Prisma Studio (visual database browser)
npm run db:studio

# Seed database with test data
npm run db:seed

# Verify schema
npx ts-node verify-schema.ts
```

### Migrations

```bash
# Create a new migration
npx prisma migrate dev --name migration_name

# Apply pending migrations
npx prisma migrate deploy

# Reset database (⚠️ DESTROYS ALL DATA)
npm run db:reset

# View migration status
npx prisma migrate status
```

### Troubleshooting

```bash
# Format schema file
npx prisma format

# Validate schema
npx prisma validate

# Check for drift between schema and database
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma
```

---

## 🌱 Seeding

The `seed.ts` script creates comprehensive test data:

- **3 Users** (Alice, Bob, Charlie)
- **3 Organizations** (TechCorp PRO, Startup Inc FREE, Personal)
- **3 Repositories** with different languages
- **Sample commits, PRs, issues**
- **AI reviews with risk scoring**
- **Metrics data (2 days)**
- **Notification rules and logs**
- **API keys and audit logs**

### Run Seed

```bash
npm run db:seed
```

### Custom Seed

Edit `prisma/seed.ts` to customize the test data.

---

## 🔑 Environment Variables

Required environment variables:

```env
# PostgreSQL connection
DATABASE_URL="postgresql://user:password@localhost:5432/database?schema=public"

# Optional: Connection pooling
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
```

---

## 📊 Schema Features

### Organization-Centric Design
All data is scoped to organizations, supporting:
- Multi-organization users
- Per-org metrics and analytics
- Clean data isolation

### Security Features
- Token encryption (application-level)
- API key hashing (bcrypt)
- Comprehensive audit logging
- Repository sensitivity levels

### Performance Optimizations
- 50+ strategic indexes
- Composite indexes for common queries
- Unique constraints for data integrity
- Ready for partitioning and scaling

### Data Retention
- Events: 90-day retention (configurable)
- Metrics: Permanent aggregated data
- Commits/PRs: 1+ year retention
- Audit logs: 1-7 years (configurable)

---

## 🔄 Schema Updates

### Making Changes

1. **Edit `schema.prisma`**
   ```prisma
   model User {
     // Add new field
     phoneNumber String?
   }
   ```

2. **Create migration**
   ```bash
   npx prisma migrate dev --name add_phone_number
   ```

3. **Generate client**
   ```bash
   npm run db:generate
   ```

4. **Update seed script** (if needed)
   ```typescript
   // Add phoneNumber to seed data
   ```

### Migration Best Practices

- ✅ Always test migrations on development first
- ✅ Review generated SQL before applying
- ✅ Backup production database before migrating
- ✅ Use descriptive migration names
- ✅ Never edit existing migrations
- ✅ Never force reset in production

---

## 🎨 Prisma Studio

Visual database browser included with Prisma.

### Start Studio
```bash
npm run db:studio
```

Opens at: `http://localhost:5555`

### Features
- Browse all tables
- View relationships
- Edit data visually
- Run filters and sorts
- Export data

---

## 🔍 Querying Data

### Basic Queries

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Find user
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' }
});

// Get user's organizations
const orgs = await prisma.userOrganization.findMany({
  where: { userId: user.id },
  include: { organization: true }
});

// Get repository stats
const stats = await prisma.repositoryStats.findMany({
  where: {
    repoId: repoId,
    date: { gte: thirtyDaysAgo }
  },
  orderBy: { date: 'desc' }
});
```

See [PRISMA-QUICK-REFERENCE.md](../PRISMA-QUICK-REFERENCE.md) for more examples.

---

## 🚨 Important Notes

### ⚠️ Destructive Commands

These commands will **delete all data**:
```bash
npm run db:reset        # Drops and recreates database
npx prisma db push --accept-data-loss  # May lose data
npx prisma migrate reset  # Drops and recreates
```

Always:
- Backup production data first
- Test on development/staging
- Never run with `--force` in production

### 🔐 Security

- Never commit `.env` files
- Encrypt sensitive tokens at application level
- Hash API keys before storing
- Keep `DATABASE_URL` secure
- Use connection pooling in production
- Enable SSL for production databases

### 📈 Performance

- Use indexes for filtered columns
- Paginate large result sets
- Use `select` to limit fields
- Batch operations when possible
- Monitor query performance
- Consider read replicas for scale

---

## 📚 Resources

### Documentation
- [Prisma Documentation](https://www.prisma.io/docs)
- [Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [Migration Guide](https://www.prisma.io/docs/concepts/components/prisma-migrate)

### Project Files
- [Database Spec](../../../TASK%20SPEC%20FILES/DATABASE-SCHEMA-RESEARCH-SPEC.md)
- [Completion Summary](../../../TASK%20SPEC%20FILES/TASK-005-COMPLETION-SUMMARY.md)
- [Quick Reference](../PRISMA-QUICK-REFERENCE.md)

---

## 🆘 Troubleshooting

### Migration Conflicts

If you encounter migration conflicts:

```bash
# Check migration status
npx prisma migrate status

# Reset (development only)
npm run db:reset

# Or manually resolve
npx prisma migrate resolve --applied "migration_name"
```

### Connection Issues

```bash
# Test database connection
npx prisma db execute --stdin <<< "SELECT 1"

# Check connection pool
# Increase DATABASE_POOL_MAX if needed
```

### Schema Drift

```bash
# Detect drift
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma

# Fix by creating migration
npx prisma migrate dev --name fix_drift
```

---

## 🤝 Contributing

When adding new features:

1. Update `schema.prisma`
2. Create migration with descriptive name
3. Update `seed.ts` with sample data
4. Update documentation
5. Test thoroughly
6. Create PR with schema changes

---

**Schema Version**: 1.0  
**Last Updated**: November 6, 2025  
**Prisma Version**: 6.18.0  
**Database**: PostgreSQL 14+

For questions, see the [Database Spec](../../../TASK%20SPEC%20FILES/DATABASE-SCHEMA-RESEARCH-SPEC.md) or ask the team! 🚀

