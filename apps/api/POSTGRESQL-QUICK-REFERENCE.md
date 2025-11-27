# PostgreSQL Quick Reference - DevMetrics

**Database**: devmetrics  
**User**: devmetrics_user  
**Port**: 5432  
**Version**: PostgreSQL 14.19

---

## 🔗 Connection String

```bash
DATABASE_URL="postgresql://devmetrics_user:devpass123@localhost:5432/devmetrics?schema=public"
```

This is configured in `/apps/api/.env`

---

## ⚡ Quick Commands

### Connect to Database

```bash
psql -U devmetrics_user -d devmetrics -h localhost
```

### Check Service Status

```bash
brew services list | grep postgresql
```

### Restart Service

```bash
brew services restart postgresql@14
```

### Verify Connection (Prisma)

```bash
cd /Users/chandradrusya/Desktop/devmet-app/apps/api
node verify-db.js
```

### View Database in Browser

```bash
npx prisma studio
```

---

## 📊 Database Info

**Tables**: 16 total

- users, organizations, repositories
- commits, pull_requests, reviews
- events, metrics, notifications
- and more...

**Schema**: public  
**Encoding**: UTF8  
**Timezone**: UTC

---

## 🚀 Ready For

✅ API server development  
✅ Prisma migrations  
✅ Database seeding  
✅ Testing  
✅ Development workflow

---

**TASK-001 Status**: ✅ COMPLETE
