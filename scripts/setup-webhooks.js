// scripts/setup-webhooks.js - Main Webhook Setup Orchestrator
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupGitHubWebhooks } from './setup-github-webhooks.js';
import { setupLinearWebhooks } from './setup-linear-webhooks.js';
import { setupSlackWebhooks } from './setup-slack-webhooks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env') });

// Configuration
const WEBHOOK_ENDPOINTS = {
  github: '/webhook/github',
  linear: '/webhook/linear',
  slack: '/webhook/slack'
};

async function getWebhookBaseUrl() {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'environment',
      message: 'Which environment are you setting up webhooks for?',
      choices: [
        { name: '🚀 Production (Cloudflare Workers)', value: 'production' },
        { name: '🧪 Development (ngrok tunnel)', value: 'development' },
        { name: '⚡ Custom URL', value: 'custom' }
      ]
    }
  ]);

  let baseUrl;

  switch (answers.environment) {
    case 'production':
      baseUrl = process.env.CLOUDFLARE_WORKER_URL;
      if (!baseUrl) {
        console.log(chalk.red('❌ CLOUDFLARE_WORKER_URL not found in environment variables'));
        process.exit(1);
      }
      break;

    case 'development':
      const { ngrokUrl } = await inquirer.prompt([
        {
          type: 'input',
          name: 'ngrokUrl',
          message: 'Enter your ngrok URL (e.g., https://abc123.ngrok.io):',
          validate: (input) => {
            if (!input.startsWith('https://') || !input.includes('ngrok.io')) {
              return 'Please enter a valid ngrok HTTPS URL';
            }
            return true;
          }
        }
      ]);
      baseUrl = ngrokUrl;
      break;

    case 'custom':
      const { customUrl } = await inquirer.prompt([
        {
          type: 'input',
          name: 'customUrl', 
          message: 'Enter your custom webhook base URL:',
          validate: (input) => {
            if (!input.startsWith('https://')) {
              return 'Please enter a valid HTTPS URL';
            }
            return true;
          }
        }
      ]);
      baseUrl = customUrl;
      break;
  }

  return baseUrl;
}

async function selectPlatforms() {
  const answers = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'platforms',
      message: 'Which platforms would you like to set up webhooks for?',
      choices: [
        { name: '🐙 GitHub (requires PAT with admin:repo_hook scope)', value: 'github' },
        { name: '📐 Linear (requires API key)', value: 'linear' },
        { name: '💬 Slack (requires Bot OAuth token)', value: 'slack' }
      ],
      validate: (answer) => {
        if (answer.length < 1) {
          return 'You must choose at least one platform.';
        }
        return true;
      }
    }
  ]);

  return answers.platforms;
}

async function validateCredentials(platforms) {
  const missingCredentials = [];

  if (platforms.includes('github') && !process.env.GITHUB_PAT) {
    missingCredentials.push('GITHUB_PAT');
  }

  if (platforms.includes('linear') && !process.env.LINEAR_API_KEY) {
    missingCredentials.push('LINEAR_API_KEY');
  }

  if (platforms.includes('slack') && !process.env.SLACK_BOT_TOKEN) {
    missingCredentials.push('SLACK_BOT_TOKEN');
  }

  if (missingCredentials.length > 0) {
    console.log(chalk.red('\n❌ Missing required credentials:'));
    missingCredentials.forEach(cred => {
      console.log(chalk.yellow(`   - ${cred}`));
    });
    console.log(chalk.blue('\n📝 Please add these to your .env file:'));
    console.log(chalk.gray('   GITHUB_PAT=your_github_personal_access_token'));
    console.log(chalk.gray('   LINEAR_API_KEY=your_linear_api_key'));
    console.log(chalk.gray('   SLACK_BOT_TOKEN=xoxb-your-slack-bot-token'));
    return false;
  }

  return true;
}

async function setupWebhooks() {
  console.log(chalk.blue('🔗 Automated Webhook Setup Tool\n'));
  console.log(chalk.gray('This tool will automatically configure webhooks across your platforms\n'));

  try {
    // Get webhook base URL
    const baseUrl = await getWebhookBaseUrl();
    console.log(chalk.green(`✓ Using base URL: ${baseUrl}\n`));

    // Select platforms
    const platforms = await selectPlatforms();
    console.log(chalk.green(`✓ Selected platforms: ${platforms.join(', ')}\n`));

    // Validate credentials
    const credentialsValid = await validateCredentials(platforms);
    if (!credentialsValid) {
      process.exit(1);
    }

    console.log(chalk.green('✓ All credentials validated\n'));

    // Confirm setup
    const { confirmSetup } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmSetup',
        message: 'Ready to set up webhooks. Continue?',
        default: true
      }
    ]);

    if (!confirmSetup) {
      console.log(chalk.yellow('Setup cancelled.'));
      return;
    }

    // Setup results tracking
    const results = {
      github: null,
      linear: null,
      slack: null
    };

    // Setup GitHub webhooks
    if (platforms.includes('github')) {
      console.log(chalk.blue('\n🐙 Setting up GitHub webhooks...\n'));
      try {
        results.github = await setupGitHubWebhooks(
          baseUrl + WEBHOOK_ENDPOINTS.github,
          process.env.GITHUB_PAT
        );
      } catch (error) {
        console.error(chalk.red(`❌ GitHub setup failed: ${error.message}`));
        results.github = { success: false, error: error.message };
      }
    }

    // Setup Linear webhooks
    if (platforms.includes('linear')) {
      console.log(chalk.blue('\n📐 Setting up Linear webhooks...\n'));
      try {
        results.linear = await setupLinearWebhooks(
          baseUrl + WEBHOOK_ENDPOINTS.linear,
          process.env.LINEAR_API_KEY
        );
      } catch (error) {
        console.error(chalk.red(`❌ Linear setup failed: ${error.message}`));
        results.linear = { success: false, error: error.message };
      }
    }

    // Setup Slack webhooks
    if (platforms.includes('slack')) {
      console.log(chalk.blue('\n💬 Setting up Slack webhooks...\n'));
      try {
        results.slack = await setupSlackWebhooks(
          baseUrl + WEBHOOK_ENDPOINTS.slack,
          process.env.SLACK_BOT_TOKEN
        );
      } catch (error) {
        console.error(chalk.red(`❌ Slack setup failed: ${error.message}`));
        results.slack = { success: false, error: error.message };
      }
    }

    // Display final results
    displayResults(results, platforms);

  } catch (error) {
    console.error(chalk.red(`❌ Setup failed: ${error.message}`));
    process.exit(1);
  }
}

function displayResults(results, platforms) {
  console.log(chalk.blue('\n📊 Setup Results Summary:\n'));

  let totalSuccess = 0;
  let totalAttempted = 0;

  platforms.forEach(platform => {
    const result = results[platform];
    if (result) {
      totalAttempted++;
      
      if (result.success) {
        totalSuccess++;
        console.log(chalk.green(`✅ ${platform.toUpperCase()}: Success`));
        
        if (result.webhooksCreated > 0) {
          console.log(chalk.gray(`   Created: ${result.webhooksCreated} webhooks`));
        }
        if (result.webhooksUpdated > 0) {
          console.log(chalk.gray(`   Updated: ${result.webhooksUpdated} webhooks`));
        }
        if (result.webhooksSkipped > 0) {
          console.log(chalk.gray(`   Skipped: ${result.webhooksSkipped} (already configured)`));
        }
      } else {
        console.log(chalk.red(`❌ ${platform.toUpperCase()}: Failed`));
        console.log(chalk.red(`   Error: ${result.error}`));
      }
    }
  });

  console.log(chalk.blue(`\n🎯 Overall Success Rate: ${totalSuccess}/${totalAttempted} platforms\n`));

  if (totalSuccess === totalAttempted) {
    console.log(chalk.green('🎉 All webhooks configured successfully!'));
    console.log(chalk.blue('\n📝 Next steps:'));
    console.log(chalk.gray('1. Test your webhooks by creating events in each platform'));
    console.log(chalk.gray('2. Monitor webhook events in your PostgreSQL database:'));
    console.log(chalk.gray('   psql -h localhost -U postgres -d Events -c "SELECT source, event_type, created_at FROM webhook_events ORDER BY created_at DESC LIMIT 10;"'));
    console.log(chalk.gray('3. Check worker logs for any processing issues'));
  } else {
    console.log(chalk.yellow('⚠️  Some webhooks failed to configure.'));
    console.log(chalk.blue('\n🔧 Troubleshooting:'));
    console.log(chalk.gray('1. Check your API credentials and permissions'));
    console.log(chalk.gray('2. Verify your webhook URL is publicly accessible'));
    console.log(chalk.gray('3. Review the error messages above for specific issues'));
  }

  console.log(chalk.blue('\n🧪 Test your setup:'));
  console.log(chalk.gray('   npm run webhook:test  # Test all platforms'));
  console.log(chalk.gray('   npm run health:check  # Check system health'));
}

// Export for use by other scripts
export { getWebhookBaseUrl, validateCredentials };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupWebhooks().catch(error => {
    console.error(chalk.red('❌ Fatal error:'), error);
    process.exit(1);
  });
}
