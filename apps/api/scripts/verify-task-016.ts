#!/usr/bin/env node
/**
 * TASK-016 Verification Script
 * Quick verification script to check if User Profile Management is working
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(path: string, description: string): boolean {
  const fullPath = join(process.cwd(), path);
  const exists = existsSync(fullPath);
  if (exists) {
    log(`✓ ${description}`, 'green');
  } else {
    log(`✗ ${description} - File not found: ${path}`, 'red');
  }
  return exists;
}

function runCommand(command: string, description: string): boolean {
  try {
    log(`Running: ${description}...`, 'blue');
    execSync(command, { stdio: 'pipe', cwd: process.cwd() });
    log(`✓ ${description}`, 'green');
    return true;
  } catch (error: any) {
    log(`✗ ${description}`, 'red');
    if (error.stdout) {
      console.log(error.stdout.toString());
    }
    if (error.stderr) {
      console.log(error.stderr.toString());
    }
    return false;
  }
}

log('\n🔍 TASK-016 Verification Script\n', 'blue');
log('='.repeat(50), 'blue');

let allChecksPassed = true;

// Check 1: Required files exist
log('\n📁 Checking required files...', 'yellow');
allChecksPassed = checkFile('src/modules/users/users.service.ts', 'users.service.ts') && allChecksPassed;
allChecksPassed = checkFile('src/modules/users/users.routes.ts', 'users.routes.ts') && allChecksPassed;
allChecksPassed = checkFile('src/modules/users/users.validation.ts', 'users.validation.ts') && allChecksPassed;
allChecksPassed = checkFile('src/modules/users/users.types.ts', 'users.types.ts') && allChecksPassed;
allChecksPassed = checkFile('src/modules/users/index.ts', 'users/index.ts') && allChecksPassed;
allChecksPassed = checkFile('src/modules/users/__tests__/users.service.test.ts', 'users.service.test.ts') && allChecksPassed;
allChecksPassed = checkFile('src/modules/users/__tests__/users.routes.test.ts', 'users.routes.test.ts') && allChecksPassed;

// Check 2: Schema has deletedAt field
log('\n🗄️  Checking database schema...', 'yellow');
try {
  const schemaContent = require('fs').readFileSync(
    join(process.cwd(), 'prisma/schema.prisma'),
    'utf-8'
  );
  if (schemaContent.includes('deletedAt')) {
    log('✓ deletedAt field exists in schema', 'green');
  } else {
    log('✗ deletedAt field not found in schema', 'red');
    allChecksPassed = false;
  }
} catch (error) {
  log('✗ Could not read schema.prisma', 'red');
  allChecksPassed = false;
}

// Check 3: Server.ts includes users routes
log('\n🔌 Checking server integration...', 'yellow');
try {
  const serverContent = require('fs').readFileSync(
    join(process.cwd(), 'src/server.ts'),
    'utf-8'
  );
  if (serverContent.includes('usersRoutes') && serverContent.includes('/api/users')) {
    log('✓ Users routes registered in server.ts', 'green');
  } else {
    log('✗ Users routes not found in server.ts', 'red');
    allChecksPassed = false;
  }
} catch (error) {
  log('✗ Could not read server.ts', 'red');
  allChecksPassed = false;
}

// Check 4: TypeScript compilation (if possible)
log('\n📝 Checking TypeScript compilation...', 'yellow');
log('(Skipping - requires DATABASE_URL. Run manually: npm run typecheck)', 'yellow');

// Check 5: Linting (if possible)
log('\n🔍 Checking linting...', 'yellow');
log('(Skipping - run manually: npm run lint)', 'yellow');

// Summary
log('\n' + '='.repeat(50), 'blue');
if (allChecksPassed) {
  log('\n✅ All file checks passed!', 'green');
  log('\nNext steps:', 'yellow');
  log('1. Run: npm run db:generate', 'blue');
  log('2. Run: npm run db:migrate', 'blue');
  log('3. Run: npm run typecheck', 'blue');
  log('4. Run: npm run lint', 'blue');
  log('5. Run: npm test -- users', 'blue');
  log('6. Start server: npm run dev', 'blue');
  log('7. Test endpoints manually (see TASK-016-VERIFICATION.md)', 'blue');
} else {
  log('\n❌ Some checks failed. Please review the errors above.', 'red');
}
log('\n', 'reset');

process.exit(allChecksPassed ? 0 : 1);

