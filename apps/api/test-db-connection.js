const { Client } = require('pg');
require('dotenv').config();

const connectionString =
  process.env.DATABASE_URL || 'postgresql://devmetrics_user:devpass123@localhost:5432/devmetrics';

console.log('🔍 Testing PostgreSQL connection...\n');

const client = new Client({
  connectionString: connectionString,
});

async function testConnection() {
  try {
    console.log('📡 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected to PostgreSQL successfully!\n');

    // Test 1: Get current timestamp
    const timeResult = await client.query('SELECT NOW() as current_time');
    console.log('✅ Current timestamp:', timeResult.rows[0].current_time);

    // Test 2: Get PostgreSQL version
    const versionResult = await client.query('SELECT version()');
    console.log('✅ PostgreSQL version:', versionResult.rows[0].version.split(',')[0]);

    // Test 3: Get current user and database
    const userDbResult = await client.query('SELECT current_user, current_database()');
    console.log('✅ Current user:', userDbResult.rows[0].current_user);
    console.log('✅ Current database:', userDbResult.rows[0].current_database);

    // Test 4: Create a test table
    console.log('\n📝 Testing table creation...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS connection_test (
        id SERIAL PRIMARY KEY,
        test_message VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Test table created successfully');

    // Test 5: Insert test data
    await client.query(`
      INSERT INTO connection_test (test_message) 
      VALUES ('Connection test successful!')
    `);
    console.log('✅ Test data inserted successfully');

    // Test 6: Query test data
    const dataResult = await client.query(
      'SELECT * FROM connection_test ORDER BY created_at DESC LIMIT 1'
    );
    console.log('✅ Test data retrieved:', dataResult.rows[0].test_message);

    // Test 7: Clean up
    await client.query('DROP TABLE connection_test');
    console.log('✅ Test table dropped successfully');

    await client.end();
    console.log('\n🎉 All database tests passed! PostgreSQL is ready for TASK-001.');
    console.log('✅ Connection closed successfully!');
  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testConnection();
