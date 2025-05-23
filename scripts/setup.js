// scripts/setup.js - Main Webhook Gateway Setup Script
import chalk from 'chalk';
import ora from 'ora';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupDatabase, verifyDatabaseSetup } from './setup-database.js';
import { setupGitHubWebhooks } from './setup-github-webhooks.js';
import { setupLinearWebhooks } from './setup-linear-webhooks.js';
import { setupSlackWebhooks } from './setup-slack-webhooks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env') });

async function validateEnvironment() {
  const spinner = ora('Validating environment...').start();
  
  const required = {
    'CLOUDFLARE_WORKER_URL': process.env.CLOUDFLARE_WORKER_URL,
    'SUPABASE_URL': process.env.SUPABASE_URL,
    'SUPABASE_SERVICE_KEY': process.env.SUPABASE_SERVICE_KEY,
  };

  const optional = {
    'GITHUB_TOKEN': process.env.GITHUB_TOKEN,
    'LINEAR_API_KEY': process.env.LINEAR_API_KEY,
    'SLACK_BOT_TOKEN': process.env.SLACK_BOT_TOKEN,
  };

  const missing = [];
  for (const [key, value] of Object.entries(required)) {
    if (!value) missing.push(key);
  }

  if (missing.length > 0) {
    spinner.fail(chalk.red(`Missing required environment variables: ${missing.join(', ')}`));
    return false;
  }

  const availableServices = [];
  for (const [key, value] of Object.entries(optional)) {
    if (value) {
      availableServices.push(key.replace('_TOKEN', '').replace('_KEY', '').toLowerCase());
    }
  }

  spinner.succeed(chalk.green(`Environment validated. Available services: ${availableServices.join(', ')}`));
  return true;
}

async function setupDatabaseSchema() {
  console.log(chalk.blue('\n🗄️  Setting up database schema...'));
  
  try {
    await setupDatabase();
    await verifyDatabaseSetup();
    console.log(chalk.green('✅ Database schema setup completed'));
    return true;
  } catch (error) {
    console.error(chalk.red(`❌ Database setup failed: ${error.message}`));
    return false;
  }
}

async function setupWebhooks() {
  const workerUrl = process.env.CLOUDFLARE_WORKER_URL;
  const results = {
    github: null,
    linear: null,
    slack: null
  };

  // Setup GitHub webhooks
  if (process.env.GITHUB_TOKEN) {
    console.log(chalk.blue('\n🐙 Setting up GitHub webhooks...'));
    try {
      results.github = await setupGitHubWebhooks(
        workerUrl + '/webhook/github',
        process.env.GITHUB_TOKEN,
        process.env.GITHUB_WEBHOOK_SECRET
      );
      
      if (results.github.success) {
        console.log(chalk.green(`✅ GitHub: ${results.github.totalRepositories} repositories configured`));
      } else {
        console.log(chalk.red(`❌ GitHub setup failed: ${results.github.error}`));
      }
    } catch (error) {
      console.error(chalk.red(`❌ GitHub setup error: ${error.message}`));
      results.github = { success: false, error: error.message };
    }
  } else {
    console.log(chalk.yellow('⚠️  Skipping GitHub setup (no GITHUB_TOKEN found)'));
  }

  // Setup Linear webhooks
  if (process.env.LINEAR_API_KEY) {
    console.log(chalk.blue('\n📐 Setting up Linear webhooks...'));
    try {
      results.linear = await setupLinearWebhooks(
        workerUrl + '/webhook/linear',
        process.env.LINEAR_API_KEY,
        process.env.LINEAR_WEBHOOK_SECRET
      );
      
      if (results.linear.success) {
        console.log(chalk.green(`✅ Linear: ${results.linear.organization} organization configured`));
      } else {
        console.log(chalk.red(`❌ Linear setup failed: ${results.linear.error}`));
      }
    } catch (error) {
      console.error(chalk.red(`❌ Linear setup error: ${error.message}`));
      results.linear = { success: false, error: error.message };
    }
  } else {
    console.log(chalk.yellow('⚠️  Skipping Linear setup (no LINEAR_API_KEY found)'));
  }

  // Setup Slack webhooks
  if (process.env.SLACK_BOT_TOKEN) {
    console.log(chalk.blue('\n💬 Setting up Slack webhooks...'));
    try {
      results.slack = await setupSlackWebhooks(
        workerUrl + '/webhook/slack',
        process.env.SLACK_BOT_TOKEN,
        process.env.SLACK_SIGNING_SECRET
      );
      
      if (results.slack.success) {
        console.log(chalk.green(`✅ Slack: ${results.slack.workspace} workspace configured`));
        if (results.slack.manualConfigRequired) {
          console.log(chalk.yellow('⚠️  Manual configuration required in Slack App settings'));
        }
      } else {
        console.log(chalk.red(`❌ Slack setup failed: ${results.slack.error}`));
      }
    } catch (error) {
      console.error(chalk.red(`❌ Slack setup error: ${error.message}`));
      results.slack = { success: false, error: error.message };
    }
  } else {
    console.log(chalk.yellow('⚠️  Skipping Slack setup (no SLACK_BOT_TOKEN found)'));
  }

  return results;
}

async function testWebhookEndpoints() {
  console.log(chalk.blue('\n🧪 Testing webhook endpoints...'));
  
  const workerUrl = process.env.CLOUDFLARE_WORKER_URL;
  const endpoints = [
    { name: 'Health Check', url: `${workerUrl}/health` },
    { name: 'Metrics', url: `${workerUrl}/metrics` }
  ];

  for (const endpoint of endpoints) {
    const spinner = ora(`Testing ${endpoint.name}...`).start();
    
    try {
      const response = await fetch(endpoint.url);
      const data = await response.json();
      
      if (response.ok) {
        spinner.succeed(chalk.green(`✓ ${endpoint.name}: OK`));
      } else {
        spinner.fail(chalk.red(`✗ ${endpoint.name}: ${response.status}`));
      }
    } catch (error) {
      spinner.fail(chalk.red(`✗ ${endpoint.name}: ${error.message}`));
    }
  }
}

async function generateSummaryReport(webhookResults) {
  console.log(chalk.blue('\n📊 Setup Summary Report'));
  console.log(chalk.blue('========================\n'));

  const totalSuccess = Object.values(webhookResults).filter(r => r?.success).length;
  const totalAttempted = Object.values(webhookResults).filter(r => r !== null).length;
  
  console.log(chalk.green(`✅ Database: Configured`));
  console.log(chalk.green(`✅ Worker URL: ${process.env.CLOUDFLARE_WORKER_URL}`));
  console.log(chalk.green(`✅ Webhook endpoints: ${totalSuccess}/${totalAttempted} services configured\n`));

  // GitHub summary
  if (webhookResults.github) {
    console.log(chalk.blue('🐙 GitHub:'));
    if (webhookResults.github.success) {
      console.log(chalk.green(`   ✅ ${webhookResults.github.totalRepositories} repositories`));
      console.log(chalk.green(`   ✅ ${webhookResults.github.webhooksCreated} webhooks created`));
      console.log(chalk.green(`   ✅ ${webhookResults.github.webhooksUpdated} webhooks updated`));
    } else {
      console.log(chalk.red(`   ❌ Failed: ${webhookResults.github.error}`));
    }
  }

  // Linear summary
  if (webhookResults.linear) {
    console.log(chalk.blue('\n📐 Linear:'));
    if (webhookResults.linear.success) {
      console.log(chalk.green(`   ✅ ${webhookResults.linear.organization} organization`));
      console.log(chalk.green(`   ✅ ${webhookResults.linear.teamsCount} teams`));
      console.log(chalk.green(`   ✅ Webhook configured`));
    } else {
      console.log(chalk.red(`   ❌ Failed: ${webhookResults.linear.error}`));
    }
  }

  // Slack summary
  if (webhookResults.slack) {
    console.log(chalk.blue('\n💬 Slack:'));
    if (webhookResults.slack.success) {
      console.log(chalk.green(`   ✅ ${webhookResults.slack.workspace} workspace`));
      console.log(chalk.green(`   ✅ ${webhookResults.slack.channelsCount} channels`));
      if (webhookResults.slack.manualConfigRequired) {
        console.log(chalk.yellow(`   ⚠️  Manual Event Subscriptions configuration required`));
      } else {
        console.log(chalk.green(`   ✅ Event subscriptions configured`));
      }
    } else {
      console.log(chalk.red(`   ❌ Failed: ${webhookResults.slack.error}`));
    }
  }

  console.log(chalk.blue('\n🚀 Next Steps:'));
  console.log(chalk.gray('   1. Start the worker: npm run dev'));
  console.log(chalk.gray('   2. Test webhooks: npm run webhook:test'));
  console.log(chalk.gray('   3. Check health: npm run health:check'));
  console.log(chalk.gray('   4. View logs: npm run logs'));

  if (webhookResults.slack?.manualConfigRequired) {
    console.log(chalk.yellow('\n⚠️  Slack Manual Configuration Required:'));
    console.log(chalk.yellow('   1. Go to https://api.slack.com/apps'));
    console.log(chalk.yellow('   2. Select your app'));
    console.log(chalk.yellow('   3. Configure Event Subscriptions'));
    console.log(chalk.yellow(`   4. Set Request URL: ${process.env.CLOUDFLARE_WORKER_URL}/webhook/slack`));
  }

  return {
    success: totalSuccess === totalAttempted && totalAttempted > 0,
    configured_services: totalSuccess,
    total_services: totalAttempted,
    manual_config_required: webhookResults.slack?.manualConfigRequired || false
  };
}

async function main() {
  try {
    console.log(chalk.blue('🌐 Webhook Gateway Setup v2.0'));
    console.log(chalk.blue('================================\n'));

    // Validate environment
    if (!await validateEnvironment()) {
      process.exit(1);
    }

    // Setup database
    if (!await setupDatabaseSchema()) {
      console.log(chalk.red('\n❌ Database setup failed. Please check your Supabase configuration.'));
      process.exit(1);
    }

    // Setup webhooks for all platforms
    const webhookResults = await setupWebhooks();

    // Test endpoints
    await testWebhookEndpoints();

    // Generate summary
    const summary = await generateSummaryReport(webhookResults);

    if (summary.success) {
      console.log(chalk.green('\n🎉 Setup completed successfully!'));
      console.log(chalk.green('Your webhook gateway is ready to capture events from all configured platforms.'));
    } else {
      console.log(chalk.yellow('\n⚠️  Setup completed with some issues.'));
      console.log(chalk.yellow('Check the summary above for details.'));
    }

    return summary;
  } catch (error) {
    console.error(chalk.red('\n❌ Setup failed with error:'), error);
    process.exit(1);
  }
}

// Export for use by other scripts
export { main as setupWebhookGateway };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(summary => {
    process.exit(summary.success ? 0 : 1);
  }).catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}