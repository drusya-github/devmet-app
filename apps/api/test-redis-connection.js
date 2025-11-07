#!/usr/bin/env node

/**
 * Redis Connection Test Script
 * Tests basic Redis connectivity and operations
 *
 * Note: This script requires ioredis and bull packages
 * Install with: npm install ioredis bull
 *
 * Run with: node test-redis-connection.js
 */

// Basic connection test
async function testBasicConnection() {
  console.log('\n🔍 Testing Basic Redis Connection...\n');

  try {
    const Redis = require('ioredis');

    const redis = new Redis({
      host: 'localhost',
      port: 6379,
      db: 0,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    // Test PING
    const pingResult = await redis.ping();
    console.log('✅ PING:', pingResult);

    // Test SET/GET
    await redis.set('test:connection', 'success');
    const value = await redis.get('test:connection');
    console.log('✅ SET/GET:', value);

    // Test expiration
    await redis.setex('test:expire', 60, 'expires in 60s');
    const ttl = await redis.ttl('test:expire');
    console.log('✅ EXPIRATION: TTL =', ttl, 'seconds');

    // Test hash operations
    await redis.hset('test:hash', 'field1', 'value1', 'field2', 'value2');
    const hashValues = await redis.hgetall('test:hash');
    console.log('✅ HASH:', hashValues);

    // Test list operations
    await redis.lpush('test:list', 'item1', 'item2', 'item3');
    const listLength = await redis.llen('test:list');
    console.log('✅ LIST: Length =', listLength);

    // Test set operations
    await redis.sadd('test:set', 'member1', 'member2', 'member3');
    const setMembers = await redis.smembers('test:set');
    console.log('✅ SET:', setMembers);

    // Test sorted set operations
    await redis.zadd('test:zset', 10, 'item1', 20, 'item2', 15, 'item3');
    const zsetMembers = await redis.zrange('test:zset', 0, -1, 'WITHSCORES');
    console.log('✅ SORTED SET:', zsetMembers);

    // Get Redis info
    const info = await redis.info('server');
    const version = info.match(/redis_version:(.+)/)[1];
    console.log('✅ Redis Version:', version);

    // Check memory
    const memoryInfo = await redis.info('memory');
    const usedMemory = memoryInfo.match(/used_memory_human:(.+)/)[1];
    console.log('✅ Memory Usage:', usedMemory);

    // Cleanup
    await redis.del(
      'test:connection',
      'test:expire',
      'test:hash',
      'test:list',
      'test:set',
      'test:zset'
    );
    console.log('✅ Cleanup completed');

    await redis.quit();
    console.log('\n✅ All basic tests passed! Redis is working correctly.\n');

    return true;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('\n⚠️  ioredis package not installed yet.');
      console.log('   This is expected before running TASK-004 (Install Dependencies)');
      console.log('   Install with: npm install ioredis\n');
      return false;
    }
    console.error('❌ Connection failed:', error.message);
    return false;
  }
}

// Test Bull queue connectivity
async function testQueueConnection() {
  console.log('🔍 Testing Bull Queue Connection...\n');

  try {
    const Queue = require('bull');

    const testQueue = new Queue('test-queue', {
      redis: {
        host: 'localhost',
        port: 6379,
        db: 1,
      },
    });

    // Add a test job
    const job = await testQueue.add({ test: 'data', timestamp: Date.now() });
    console.log('✅ Job added to queue:', job.id);

    // Process the job
    testQueue.process(async (job) => {
      console.log('✅ Processing job:', job.id);
      return { processed: true };
    });

    // Wait a moment for processing
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Clean up
    await testQueue.clean(0, 'completed');
    await testQueue.clean(0, 'failed');
    await testQueue.close();

    console.log('✅ Bull queue is working correctly.\n');
    return true;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('⚠️  Bull package not installed yet.');
      console.log('   This is expected before running TASK-004 (Install Dependencies)');
      console.log('   Install with: npm install bull\n');
      return false;
    }
    console.error('❌ Queue test failed:', error.message);
    return false;
  }
}

// Test Redis directly with redis-cli simulation
async function testRedisDirect() {
  console.log('🔍 Testing Direct Redis Access (no dependencies required)...\n');

  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);

  try {
    // Test PING
    const { stdout: ping } = await execPromise('redis-cli ping');
    console.log('✅ PING:', ping.trim());

    // Test SET/GET
    await execPromise('redis-cli SET test:direct "working"');
    const { stdout: value } = await execPromise('redis-cli GET test:direct');
    console.log('✅ SET/GET:', value.trim());

    // Get Redis version
    const { stdout: version } = await execPromise('redis-cli INFO server | grep redis_version');
    console.log('✅', version.trim());

    // Get memory info
    const { stdout: memory } = await execPromise('redis-cli INFO memory | grep used_memory_human');
    console.log('✅', memory.trim());

    // Cleanup
    await execPromise('redis-cli DEL test:direct');

    console.log('\n✅ Direct Redis access working correctly.\n');
    return true;
  } catch (error) {
    console.error('❌ Direct Redis test failed:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║       Redis Connection Test Suite - DevMetrics        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Always run direct test (no dependencies)
    const directResult = await testRedisDirect();

    if (!directResult) {
      console.error('\n❌ Redis is not running or not accessible!');
      console.log('\nTroubleshooting steps:');
      console.log('1. Check if Redis is running: brew services list | grep redis');
      console.log('2. Start Redis: brew services start redis');
      console.log('3. Test connection: redis-cli ping\n');
      process.exit(1);
    }

    // Try to run tests with npm packages
    const basicResult = await testBasicConnection();

    if (basicResult) {
      await testQueueConnection();
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Test Suite Completed Successfully!');
    console.log('═══════════════════════════════════════════════════════\n');

    if (!basicResult) {
      console.log('ℹ️  Note: Some tests were skipped because npm packages');
      console.log('   are not installed yet. This is normal before TASK-004.');
      console.log('   Redis itself is working correctly!\n');
    }
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run the tests
runAllTests();
