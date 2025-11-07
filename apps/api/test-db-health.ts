/**
 * Quick test script to verify database health check
 * Run with: npx ts-node test-db-health.ts
 */

import { checkDatabaseHealth, connectDatabase } from './src/database/prisma.client';

async function testDatabaseHealth() {
  console.log('🔍 Testing Database Health Check...\n');

  // Test 1: Check health
  console.log('Test 1: Checking database health...');
  const health = await checkDatabaseHealth();
  console.log('Health Check Result:', JSON.stringify(health, null, 2));

  if (health.healthy) {
    console.log('✅ Database is healthy');
    console.log(`✅ Latency: ${health.latency}ms`);
    console.log(`✅ Connected: ${health.details?.connected}`);
  } else {
    console.log('❌ Database is unhealthy');
    console.log(`❌ Error: ${health.error}`);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Connection retry (this should work immediately if DB is up)
  console.log('Test 2: Testing connection with retry logic...');
  try {
    await connectDatabase();
    console.log('✅ Connection established (with retry support)');
  } catch (error) {
    console.log('❌ Connection failed:', error);
  }

  console.log('\n✨ Database service verification complete!');
  process.exit(0);
}

testDatabaseHealth().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

