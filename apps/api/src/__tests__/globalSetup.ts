import dotenv from 'dotenv';
import path from 'path';

module.exports = async () => {
  // Load environment variables
  dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });
  
  console.log('🧪 Setting up test environment...');
  
  // You can add global setup logic here
  // For example, starting a test database, Redis instance, etc.
};

