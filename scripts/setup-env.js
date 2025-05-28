// scripts/setup-env.js - Environment Setup for PostgreSQL
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default environment template
const envTemplate = `# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Events
DB_USER=postgres
DB_PASSWORD=password
DB_SSL=false
DB_MAX_CONNECTIONS=20
DB_CONNECTION_TIMEOUT=5000
DB_IDLE_TIMEOUT=30000

# Server Configuration
PORT=3000
HOST=localhost
NODE_ENV=development
SERVER_ID=webhook-gateway-local

# GitHub Configuration
GITHUB_TOKEN=your_github_token_here
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret_here

# Linear Configuration
LINEAR_API_KEY=your_linear_api_key_here
LINEAR_WEBHOOK_SECRET=your_linear_webhook_secret_here

# Slack Configuration
SLACK_BOT_TOKEN=your_slack_bot_token_here
SLACK_SIGNING_SECRET=your_slack_signing_secret_here
SLACK_APP_ID=your_slack_app_id_here

# Feature Flags
DEBUG=true
ENABLE_BATCHING=true
ENABLE_METRICS=true
ENABLE_RETRY=true
ENABLE_ARCHIVING=true
ENABLE_RATE_LIMIT=true

# Performance Settings
BATCH_SIZE=50
BATCH_INTERVAL=5000
MAX_RETRIES=3
RETRY_DELAY=500

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100

# Data Retention
DATA_RETENTION_DAYS=90

# Security Settings
ENABLE_CORS=true
ENABLE_HELMET=true
ENABLE_COMPRESSION=true

# Monitoring Settings
ENABLE_HEALTH_CHECK=true
ENABLE_METRICS_ENDPOINT=true
HEALTH_CHECK_INTERVAL=30000

# Legacy Worker Identification (for compatibility)
WORKER_ID=webhook-gateway-local
WORKER_ENVIRONMENT=development`;

// Required environment variables
const requiredVars = [
  'DB_HOST',
  'DB_PORT', 
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD'
];

// Optional but recommended variables
const recommendedVars = [
  'GITHUB_WEBHOOK_SECRET',
  'LINEAR_WEBHOOK_SECRET',
  'SLACK_SIGNING_SECRET'
];

function createEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  
  console.log(chalk.blue('🔧 Setting up environment configuration...\\n'));
  
  if (fs.existsSync(envPath)) {
    console.log(chalk.yellow('⚠️  .env file already exists'));
    console.log(chalk.gray('   Backing up existing file to .env.backup'));
    
    // Create backup
    fs.copyFileSync(envPath, envPath + '.backup');
  }
  
  // Write new .env file
  fs.writeFileSync(envPath, envTemplate);
  console.log(chalk.green('✅ .env file created successfully'));
  
  return envPath;
}

function validateEnvironment() {
  console.log(chalk.blue('\\n🔍 Validating environment variables...'));
  
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log(chalk.red('❌ .env file not found'));
    return false;
  }
  
  // Load environment variables
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value && !line.startsWith('#')) {
      envVars[key.trim()] = value.trim();
    }
  });
  
  // Check required variables
  const missingRequired = requiredVars.filter(varName => !envVars[varName] || envVars[varName] === '');
  const missingRecommended = recommendedVars.filter(varName => 
    !envVars[varName] || 
    envVars[varName] === '' || 
    envVars[varName].includes('your_') || 
    envVars[varName].includes('_here')
  );
  
  if (missingRequired.length > 0) {
    console.log(chalk.red(`❌ Missing required variables: ${missingRequired.join(', ')}`));
    return false;
  }
  
  if (missingRecommended.length > 0) {
    console.log(chalk.yellow(`⚠️  Missing recommended variables: ${missingRecommended.join(', ')}`));
    console.log(chalk.gray('   These are needed for webhook signature validation'));
  }
  
  console.log(chalk.green('✅ All required environment variables are set'));
  return true;
}

function printSetupInstructions() {
  console.log(chalk.blue('\\n📝 Next steps:'));
  console.log(chalk.gray('1. Update webhook secrets in .env file'));
  console.log(chalk.gray('2. Set up database with: npm run setup:db'));
  console.log(chalk.gray('3. Test configuration with: npm run health:check'));
  console.log(chalk.gray('4. Start the server with: npm start'));
  
  console.log(chalk.blue('\\n🔗 Webhook Endpoints:'));
  console.log(chalk.gray('   GitHub: http://localhost:3000/webhook/github'));
  console.log(chalk.gray('   Linear: http://localhost:3000/webhook/linear'));
  console.log(chalk.gray('   Slack:  http://localhost:3000/webhook/slack'));
  
  console.log(chalk.blue('\\n📊 Monitoring:'));
  console.log(chalk.gray('   Health: http://localhost:3000/health'));
  console.log(chalk.gray('   Metrics: http://localhost:3000/metrics'));
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const envPath = createEnvFile();
    const isValid = validateEnvironment();
    
    if (isValid) {
      console.log(chalk.green('\\n🎉 Environment setup completed successfully!'));
    } else {
      console.log(chalk.yellow('\\n⚠️  Environment setup completed with warnings'));
      console.log(chalk.gray('Please review and update the .env file as needed'));
    }
    
    printSetupInstructions();
    
  } catch (error) {
    console.error(chalk.red('❌ Environment setup failed:'), error.message);
    process.exit(1);
  }
}

export { createEnvFile, validateEnvironment };

