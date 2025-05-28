// scripts/simple-dev-setup.js - Simple fallback development setup
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎯 Simple Development Setup');
console.log('Setting up the webhook gateway with minimal configuration...\n');

// Step 1: Check basic requirements
console.log('✅ Node.js version:', process.version);

// Step 2: Check if .env exists and fix port if needed
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Fix common port issue
  if (envContent.includes('DB_PORT=10000')) {
    envContent = envContent.replace('DB_PORT=10000', 'DB_PORT=5432');
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Fixed database port configuration (10000 → 5432)');
  }
  
  console.log('✅ Environment file configured');
} else {
  console.log('⚠️  No .env file found - creating basic configuration...');
  
  const basicEnv = `# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Events
DB_USER=postgres
DB_PASSWORD=password
DB_SSL=false

# Server Configuration
PORT=3000
HOST=localhost
NODE_ENV=development

# GitHub Configuration
GITHUB_TOKEN=your_github_token_here
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret_here

# Linear Configuration
LINEAR_API_KEY=your_linear_api_key_here
LINEAR_WEBHOOK_SECRET=your_linear_webhook_secret_here

# Slack Configuration
SLACK_BOT_TOKEN=your_slack_bot_token_here
SLACK_SIGNING_SECRET=your_slack_signing_secret_here

# Feature Flags
DEBUG=true
ENABLE_BATCHING=true
ENABLE_METRICS=true
`;

  fs.writeFileSync(envPath, basicEnv);
  console.log('✅ Created basic .env file');
}

// Step 3: Check dependencies
const packageJsonPath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(packageJsonPath)) {
  console.log('✅ Project structure validated');
} else {
  console.log('❌ package.json not found - please run from project root');
  process.exit(1);
}

// Step 4: Check node_modules
const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('⚠️  Dependencies not installed');
  console.log('📦 Please run: npm install');
} else {
  console.log('✅ Dependencies installed');
}

// Step 5: Provide next steps
console.log('\n🎯 Setup completed!');
console.log('\n📋 Next steps:');
console.log('  1. Ensure PostgreSQL is running on port 5432');
console.log('  2. Create database "Events" in PostgreSQL');
console.log('  3. Update API tokens in .env file if needed');
console.log('  4. Run: npm start');

console.log('\n🔧 Available commands:');
console.log('  npm run validate:system  - Check system requirements');
console.log('  npm run fix:port        - Fix database port issues');
console.log('  npm run health:check    - Run health checks');
console.log('  npm start               - Start the webhook gateway');

console.log('\n✨ Your webhook gateway is ready for development!');

