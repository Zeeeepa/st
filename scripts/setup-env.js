// scripts/setup-env.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Load existing .env file
dotenv.config({ path: path.join(rootDir, '.env') });

console.log(chalk.blue('🔧 Setting up environment variables...\n'));

// Create .env.local for Wrangler
const wranglerEnv = `
# Wrangler Environment Variables
SUPABASE_URL=${process.env.SUPABASE_URL}
SUPABASE_SERVICE_KEY=${process.env.SUPABASE_SERVICE_KEY}
CLOUDFLARE_API_TOKEN=${process.env.CLOUDFLARE_API_TOKEN}
CLOUDFLARE_ACCOUNT_ID=${process.env.CLOUDFLARE_ACCOUNT_ID}
DEBUG=${process.env.DEBUG}
ENABLE_BATCHING=${process.env.ENABLE_BATCHING}
ENABLE_METRICS=${process.env.ENABLE_METRICS}
ENABLE_RETRY=${process.env.ENABLE_RETRY}
BATCH_SIZE=${process.env.BATCH_SIZE}
BATCH_INTERVAL=${process.env.BATCH_INTERVAL}
MAX_RETRIES=${process.env.MAX_RETRIES}
RETRY_DELAY=${process.env.RETRY_DELAY}
RATE_LIMIT_WINDOW=${process.env.RATE_LIMIT_WINDOW}
RATE_LIMIT_MAX_REQUESTS=${process.env.RATE_LIMIT_MAX_REQUESTS}
DATA_RETENTION_DAYS=${process.env.DATA_RETENTION_DAYS}
WORKER_ID=${process.env.WORKER_ID}
WORKER_ENVIRONMENT=${process.env.WORKER_ENVIRONMENT}
`.trim();

fs.writeFileSync(path.join(rootDir, '.env.local'), wranglerEnv);
console.log(chalk.green('✓ Created .env.local for Wrangler'));

// Create .dev.vars for local development
const devVars = `
SUPABASE_URL=${process.env.SUPABASE_URL}
SUPABASE_SERVICE_KEY=${process.env.SUPABASE_SERVICE_KEY}
DEBUG=true
WORKER_ENVIRONMENT=development
`.trim();

fs.writeFileSync(path.join(rootDir, '.dev.vars'), devVars);
console.log(chalk.green('✓ Created .dev.vars for local development'));

// Check for required environment variables
const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.log(chalk.yellow('\n⚠️  Missing environment variables:'));
  missingVars.forEach(varName => {
    console.log(chalk.yellow(`   - ${varName}`));
  });
  console.log(chalk.yellow('\nPlease set these in your .env file'));
} else {
  console.log(chalk.green('\n✓ All required environment variables are set'));
}

console.log(chalk.blue('\n📝 Next steps:'));
console.log(chalk.gray('1. Set webhook secrets with: npm run setup:secrets'));
console.log(chalk.gray('2. Set up database with: npm run setup:db'));
console.log(chalk.gray('3. Start development with: npm run dev'));