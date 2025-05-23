#!/usr/bin/env node
// scripts/dev-setup.js - Unified Development Setup Script
import chalk from 'chalk';
import ora from 'ora';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { setupWebhookGateway } from './setup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env') });

async function checkPrerequisites() {
  const spinner = ora('Checking prerequisites...').start();
  
  const checks = {
    node: false,
    npm: false,
    wrangler: false,
    env: false
  };
  
  try {
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    checks.node = majorVersion >= 16;
    
    // Check npm
    try {
      const { execSync } = await import('child_process');
      execSync('npm --version', { stdio: 'ignore' });
      checks.npm = true;
    } catch (error) {
      checks.npm = false;
    }
    
    // Check wrangler
    try {
      const { execSync } = await import('child_process');
      execSync('npx wrangler --version', { stdio: 'ignore' });
      checks.wrangler = true;
    } catch (error) {
      checks.wrangler = false;
    }
    
    // Check .env file
    checks.env = process.env.CLOUDFLARE_WORKER_URL && 
                 process.env.SUPABASE_URL && 
                 process.env.SUPABASE_SERVICE_KEY;
    
    const allPassed = Object.values(checks).every(check => check);
    
    if (allPassed) {
      spinner.succeed(chalk.green('All prerequisites met'));
    } else {
      spinner.fail(chalk.red('Some prerequisites are missing'));
      
      console.log(chalk.yellow('\n⚠️  Prerequisites Status:'));
      console.log(chalk[checks.node ? 'green' : 'red'](`   ${checks.node ? '✓' : '✗'} Node.js >= 16 (current: ${nodeVersion})`));
      console.log(chalk[checks.npm ? 'green' : 'red'](`   ${checks.npm ? '✓' : '✗'} npm`));
      console.log(chalk[checks.wrangler ? 'green' : 'red'](`   ${checks.wrangler ? '✓' : '✗'} Wrangler CLI`));
      console.log(chalk[checks.env ? 'green' : 'red'](`   ${checks.env ? '✓' : '✗'} Environment configuration (.env file)`));
      
      if (!checks.env) {
        console.log(chalk.yellow('\n📝 Missing environment variables. Please ensure your .env file contains:'));
        console.log(chalk.gray('   - CLOUDFLARE_WORKER_URL'));
        console.log(chalk.gray('   - SUPABASE_URL'));
        console.log(chalk.gray('   - SUPABASE_SERVICE_KEY'));
        console.log(chalk.gray('   - GITHUB_TOKEN (optional)'));
        console.log(chalk.gray('   - LINEAR_API_KEY (optional)'));
        console.log(chalk.gray('   - SLACK_BOT_TOKEN (optional)'));
      }
    }
    
    return allPassed;
  } catch (error) {
    spinner.fail(chalk.red(`Prerequisites check failed: ${error.message}`));
    return false;
  }
}

async function runSetup() {
  console.log(chalk.blue('🔧 Running webhook gateway setup...'));
  
  try {
    const setupResult = await setupWebhookGateway();
    
    if (setupResult.success) {
      console.log(chalk.green('✅ Setup completed successfully!'));
      return true;
    } else {
      console.log(chalk.yellow('⚠️  Setup completed with some issues'));
      console.log(chalk.gray('Check the setup summary above for details'));
      return setupResult.configured_services > 0; // Allow partial success
    }
  } catch (error) {
    console.error(chalk.red('❌ Setup failed:'), error.message);
    return false;
  }
}

async function runTests() {
  const spinner = ora('Running webhook tests...').start();
  
  try {
    // Import test script dynamically
    const { testWebhooks } = await import('./test-webhook.js');
    const testResults = await testWebhooks();
    
    if (testResults.success) {
      spinner.succeed(chalk.green('All webhook tests passed'));
      return true;
    } else {
      spinner.warn(chalk.yellow(`Some tests failed (${testResults.passed}/${testResults.total} passed)`));
      return testResults.passed > 0; // Allow partial success
    }
  } catch (error) {
    spinner.fail(chalk.red(`Tests failed: ${error.message}`));
    return false;
  }
}

async function startDevelopmentServer() {
  console.log(chalk.blue('\n🚀 Starting Cloudflare Worker development server...'));
  console.log(chalk.gray('Press Ctrl+C to stop the server\n'));
  
  return new Promise((resolve, reject) => {
    const wrangler = spawn('npx', ['wrangler', 'dev', '--local', '--persist-to', '.wrangler/state'], {
      stdio: 'inherit',
      cwd: rootDir
    });
    
    wrangler.on('error', (error) => {
      console.error(chalk.red('Failed to start development server:'), error.message);
      reject(error);
    });
    
    wrangler.on('exit', (code) => {
      if (code === 0) {
        console.log(chalk.green('\n✅ Development server stopped gracefully'));
      } else {
        console.log(chalk.red(`\n❌ Development server exited with code ${code}`));
      }
      resolve(code);
    });
    
    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n⏹️  Stopping development server...'));
      wrangler.kill('SIGINT');
    });
    
    process.on('SIGTERM', () => {
      console.log(chalk.yellow('\n⏹️  Stopping development server...'));
      wrangler.kill('SIGTERM');
    });
  });
}

async function displayQuickStart() {
  console.log(chalk.blue('\n📚 Quick Start Guide'));
  console.log(chalk.blue('==================\n'));
  
  console.log(chalk.green('🎉 Your webhook gateway is now running!'));
  console.log(chalk.gray(`🌐 Worker URL: ${process.env.CLOUDFLARE_WORKER_URL}`));
  console.log(chalk.gray('📊 Health Check: /health'));
  console.log(chalk.gray('📈 Metrics: /metrics'));
  
  console.log(chalk.blue('\n🔗 Webhook Endpoints:'));
  console.log(chalk.gray(`   GitHub:  ${process.env.CLOUDFLARE_WORKER_URL}/webhook/github`));
  console.log(chalk.gray(`   Linear:  ${process.env.CLOUDFLARE_WORKER_URL}/webhook/linear`));
  console.log(chalk.gray(`   Slack:   ${process.env.CLOUDFLARE_WORKER_URL}/webhook/slack`));
  
  console.log(chalk.blue('\n🛠️  Available Commands:'));
  console.log(chalk.gray('   npm run webhook:test     - Test all webhooks'));
  console.log(chalk.gray('   npm run health:check     - Check system health'));
  console.log(chalk.gray('   npm run logs             - View worker logs'));
  console.log(chalk.gray('   npm run metrics          - View metrics'));
  console.log(chalk.gray('   npm run deploy           - Deploy to production'));
  
  console.log(chalk.blue('\n🔍 Monitoring:'));
  console.log(chalk.gray('   - All events are automatically stored in Supabase'));
  console.log(chalk.gray('   - Check the worker logs for real-time event processing'));
  console.log(chalk.gray('   - Use /metrics endpoint to monitor performance'));
  
  if (process.env.GITHUB_TOKEN) {
    console.log(chalk.green('\n✅ GitHub: Configured and ready'));
  } else {
    console.log(chalk.yellow('\n⚠️  GitHub: Add GITHUB_TOKEN to .env to enable'));
  }
  
  if (process.env.LINEAR_API_KEY) {
    console.log(chalk.green('✅ Linear: Configured and ready'));
  } else {
    console.log(chalk.yellow('⚠️  Linear: Add LINEAR_API_KEY to .env to enable'));
  }
  
  if (process.env.SLACK_BOT_TOKEN) {
    console.log(chalk.green('✅ Slack: Configured and ready'));
    console.log(chalk.gray('   Note: Manual Event Subscriptions configuration may be required'));
  } else {
    console.log(chalk.yellow('⚠️  Slack: Add SLACK_BOT_TOKEN to .env to enable'));
  }
}

async function main() {
  try {
    console.log(chalk.blue('🌟 Webhook Gateway Development Setup'));
    console.log(chalk.blue('====================================\n'));
    
    // Check prerequisites
    const prerequisitesPassed = await checkPrerequisites();
    if (!prerequisitesPassed) {
      console.log(chalk.red('\n❌ Prerequisites not met. Please fix the issues above and try again.'));
      process.exit(1);
    }
    
    // Run setup
    const setupPassed = await runSetup();
    if (!setupPassed) {
      console.log(chalk.red('\n❌ Setup failed. Please check the errors above and try again.'));
      process.exit(1);
    }
    
    // Run tests (optional - don't fail if tests fail)
    console.log(chalk.blue('\n🧪 Running validation tests...'));
    await runTests();
    
    // Display quick start guide
    await displayQuickStart();
    
    // Start development server
    await startDevelopmentServer();
    
  } catch (error) {
    console.error(chalk.red('\n💥 Fatal error:'), error.message);
    console.error(chalk.gray(error.stack));
    process.exit(1);
  }
}

// Export for use by other scripts
export { main as runDevSetup };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

