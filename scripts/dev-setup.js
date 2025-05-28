#!/usr/bin/env node
// scripts/dev-setup.js - Enhanced Development Setup for Local PostgreSQL

import chalk from 'chalk';
import ora from 'ora';
import { spawn } from 'child_process';
import { getConfig, validateConfig, printConfigSummary } from '../src/config.js';
import { initDatabase, checkDatabaseHealth } from '../src/utils/postgresql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env') });

async function checkPostgreSQLConnection() {
  const spinner = ora('Checking PostgreSQL connection...').start();
  
  try {
    const config = getConfig();
    validateConfig(config);
    
    // Test database connection and create if needed
    await initDatabase(config);
    
    // Check health
    const health = await checkDatabaseHealth(config);
    
    if (health.success && health.status === 'healthy') {
      spinner.succeed(chalk.green('✅ PostgreSQL connection successful'));
      console.log(chalk.green(`   Database: ${config.database.name}`));
      console.log(chalk.green(`   Host: ${config.database.host}:${config.database.port}`));
      console.log(chalk.green(`   Response time: ${health.responseTime}ms`));
      return true;
    } else {
      spinner.fail(chalk.red('❌ PostgreSQL connection failed'));
      console.log(chalk.red(`   Error: ${health.error}`));
      return false;
    }
  } catch (error) {
    spinner.fail(chalk.red('❌ PostgreSQL connection failed'));
    console.log(chalk.red(`   Error: ${error.message}`));
    
    if (error.message.includes('Configuration validation failed')) {
      console.log(chalk.yellow('\n💡 Please check your .env file configuration'));
    } else if (error.code === 'ECONNREFUSED') {
      console.log(chalk.yellow('\n💡 Troubleshooting tips:'));
      console.log(chalk.yellow('1. Make sure PostgreSQL is running'));
      console.log(chalk.yellow('2. Check your database connection settings in .env'));
      console.log(chalk.yellow('3. Run: npm run db:create to create the database'));
    }
    
    return false;
  }
}

async function runDevelopmentServer() {
  console.log(chalk.blue('\n🚀 Starting development server...'));
  
  const config = getConfig();
  printConfigSummary(config);
  
  const server = spawn('node', ['src/server.js'], {
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  server.on('error', (error) => {
    console.error(chalk.red('Failed to start server:'), error);
    process.exit(1);
  });
  
  server.on('close', (code) => {
    console.log(chalk.yellow(`Server exited with code ${code}`));
    process.exit(code);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n🛑 Shutting down development server...'));
    server.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    console.log(chalk.yellow('\n🛑 Shutting down development server...'));
    server.kill('SIGTERM');
  });
}

async function main() {
  console.log(chalk.blue.bold('🔧 Webhook Gateway Development Setup'));
  console.log(chalk.blue.bold('=====================================\n'));
  
  try {
    // Check PostgreSQL connection
    const dbConnected = await checkPostgreSQLConnection();
    
    if (!dbConnected) {
      console.log(chalk.red('\n❌ Cannot start development server without database connection'));
      console.log(chalk.yellow('💡 Try running: npm run db:create'));
      process.exit(1);
    }
    
    // Start development server
    await runDevelopmentServer();
    
  } catch (error) {
    console.error(chalk.red('Setup failed:'), error);
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('Unhandled error:'), error);
  process.exit(1);
});

// Run the setup
main().catch(console.error);
