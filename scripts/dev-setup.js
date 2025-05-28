#!/usr/bin/env node
// scripts/dev-setup.js - Enhanced Development Setup for Local PostgreSQL

import chalk from 'chalk';
import ora from 'ora';
import { spawn } from 'child_process';
import { getConfig, validateConfig, printConfigSummary } from '../src/config.js';
import { initDatabase, checkDatabaseHealth } from '../src/utils/postgresql.js';
import { createWebhookTests } from '../src/utils/testing.js';

// Enhanced development setup
async function runDevSetup() {
  console.log(chalk.blue.bold('🚀 Webhook Gateway v3.0 - Development Setup'));
  console.log(chalk.blue.bold('===============================================\n'));
  
  let spinner = ora('Initializing development environment...').start();
  
  try {
    // Step 1: Load and validate configuration
    spinner.text = 'Loading configuration...';
    const config = getConfig();
    
    try {
      validateConfig(config);
      spinner.succeed(chalk.green('✅ Configuration loaded and validated'));
    } catch (error) {
      spinner.fail(chalk.red('❌ Configuration validation failed'));
      console.error(chalk.red('Error:'), error.message);
      console.log(chalk.yellow('\n💡 Please check your .env file and ensure all required variables are set.'));
      process.exit(1);
    }
    
    // Print configuration summary
    printConfigSummary(config);
    
    // Step 2: Check PostgreSQL connection
    spinner = ora('Checking PostgreSQL connection...').start();
    
    try {
      const dbHealth = await checkDatabaseHealth(config);
      if (dbHealth.healthy) {
        spinner.succeed(chalk.green(`✅ PostgreSQL connection successful (${dbHealth.responseTime}ms)`));
      } else {
        throw new Error(dbHealth.error);
      }
    } catch (error) {
      spinner.fail(chalk.red('❌ PostgreSQL connection failed'));
      console.error(chalk.red('Error:'), error.message);
      
      console.log(chalk.yellow('\n💡 Troubleshooting tips:'));
      console.log(chalk.yellow('1. Make sure PostgreSQL is running'));
      console.log(chalk.yellow('2. Check your database connection settings in .env'));
      console.log(chalk.yellow('3. Verify the database user has proper permissions'));
      console.log(chalk.yellow(`4. Try: psql -h ${config.database.host} -p ${config.database.port} -U ${config.database.user} -d postgres`));
      
      const shouldContinue = await askYesNo('\nWould you like to continue anyway? (y/N)');
      if (!shouldContinue) {
        process.exit(1);
      }
    }
    
    // Step 3: Initialize database schema
    spinner = ora('Initializing database schema...').start();
    
    try {
      await initDatabase(config);
      spinner.succeed(chalk.green('✅ Database schema initialized'));
    } catch (error) {
      spinner.fail(chalk.red('❌ Database schema initialization failed'));
      console.error(chalk.red('Error:'), error.message);
      
      const shouldContinue = await askYesNo('\nWould you like to continue anyway? (y/N)');
      if (!shouldContinue) {
        process.exit(1);
      }
    }
    
    // Step 4: Install dependencies if needed
    spinner = ora('Checking dependencies...').start();
    
    try {
      await checkDependencies();
      spinner.succeed(chalk.green('✅ Dependencies are up to date'));
    } catch (error) {
      spinner.warn(chalk.yellow('⚠️  Some dependencies may be missing'));
      console.log(chalk.yellow('Running npm install...'));
      
      await runCommand('npm', ['install']);
      console.log(chalk.green('✅ Dependencies installed'));
    }
    
    // Step 5: Run basic tests
    spinner = ora('Running basic health tests...').start();
    
    try {
      // Start server in background for testing
      const serverProcess = spawn('node', ['src/server.js'], {
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Run tests
      const testSuite = createWebhookTests(`http://${config.host}:${config.port}`, config);
      const testResults = await testSuite.runAllTests();
      
      // Stop server
      serverProcess.kill();
      
      if (testResults.summary.passRate === 100) {
        spinner.succeed(chalk.green(`✅ All tests passed (${testResults.summary.passed}/${testResults.summary.total})`));
      } else {
        spinner.warn(chalk.yellow(`⚠️  Some tests failed (${testResults.summary.passed}/${testResults.summary.total} passed)`));
      }
    } catch (error) {
      spinner.warn(chalk.yellow('⚠️  Could not run health tests'));
      console.log(chalk.gray('This is normal if the server is not yet running.'));
    }
    
    // Step 6: Setup complete
    console.log(chalk.green.bold('\n🎉 Development setup completed successfully!'));
    console.log(chalk.green('==========================================\n'));
    
    console.log(chalk.blue('📋 Next Steps:'));
    console.log(chalk.blue('1. Start the development server: npm run dev:start'));
    console.log(chalk.blue('2. Check health status: curl http://localhost:3000/health'));
    console.log(chalk.blue('3. View metrics: curl http://localhost:3000/metrics'));
    console.log(chalk.blue('4. Test webhooks: npm run webhook:test'));
    
    console.log(chalk.blue('\n🔗 Webhook Endpoints:'));
    console.log(chalk.blue(`• GitHub: http://${config.host}:${config.port}/webhook/github`));
    console.log(chalk.blue(`• Linear: http://${config.host}:${config.port}/webhook/linear`));
    console.log(chalk.blue(`• Slack: http://${config.host}:${config.port}/webhook/slack`));
    
    console.log(chalk.blue('\n📊 Monitoring:'));
    console.log(chalk.blue(`• Health: http://${config.host}:${config.port}/health`));
    console.log(chalk.blue(`• Metrics: http://${config.host}:${config.port}/metrics`));
    
    if (config.debug) {
      console.log(chalk.yellow('\n🔍 Debug mode is enabled - you will see detailed logs'));
    }
    
    // Ask if user wants to start the server
    const shouldStart = await askYesNo('\nWould you like to start the development server now? (Y/n)');
    if (shouldStart) {
      console.log(chalk.blue('\n🚀 Starting development server...\n'));
      
      // Start the server
      const serverProcess = spawn('npm', ['run', 'dev:start'], {
        stdio: 'inherit'
      });
      
      // Handle process termination
      process.on('SIGINT', () => {
        console.log(chalk.yellow('\n🛑 Shutting down development server...'));
        serverProcess.kill();
        process.exit(0);
      });
      
      process.on('SIGTERM', () => {
        serverProcess.kill();
        process.exit(0);
      });
    }
    
  } catch (error) {
    if (spinner) {
      spinner.fail(chalk.red('❌ Development setup failed'));
    }
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// Check if dependencies are installed
async function checkDependencies() {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['list', '--depth=0'], { stdio: 'pipe' });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error('Dependencies check failed'));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Run a command and return a promise
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...options
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Simple yes/no prompt
function askYesNo(question) {
  return new Promise((resolve) => {
    process.stdout.write(chalk.cyan(question));
    
    process.stdin.once('data', (data) => {
      const answer = data.toString().trim().toLowerCase();
      resolve(answer === 'y' || answer === 'yes' || answer === '');
    });
  });
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('Unhandled error:'), error);
  process.exit(1);
});

// Run the setup
runDevSetup().catch(console.error);
