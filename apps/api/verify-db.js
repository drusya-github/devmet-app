// Simple database verification script using Prisma
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://devmetrics_user:devpass123@localhost:5432/devmetrics?schema=public',
    },
  },
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('🔍 Testing PostgreSQL connection with Prisma...\n');

  try {
    // Test the connection
    await prisma.$connect();
    console.log('✅ Successfully connected to PostgreSQL!\n');

    // Query the database
    const result = await prisma.$queryRaw`SELECT 
      current_user, 
      current_database(), 
      version() as db_version, 
      NOW() as current_time`;

    console.log('📊 Database Information:');
    console.log('✅ Current User:', result[0].current_user);
    console.log('✅ Current Database:', result[0].current_database);
    console.log('✅ PostgreSQL Version:', result[0].db_version.split(',')[0]);
    console.log('✅ Current Time:', result[0].current_time);

    // Check if we can query tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;

    console.log(`\n📋 Tables in database: ${tables.length}`);
    if (tables.length > 0) {
      tables.forEach((t) => console.log('  -', t.table_name));
    } else {
      console.log('  (No tables yet - will be created by migrations)');
    }

    console.log('\n🎉 PostgreSQL is fully configured and ready!');
    console.log('✅ TASK-001 completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Database connection failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('✅ Connection closed.\n');
  }
}

main();
