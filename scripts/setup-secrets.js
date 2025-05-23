// scripts/setup-secrets.js
import { execSync } from 'child_process';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env') });

const secrets = [
  {
    name: 'GITHUB_WEBHOOK_SECRET',
    description: 'GitHub webhook secret for signature verification',
    required: false,
    example: 'ghw_xxxxxxxxxxxxx'
  },
  {
    name: 'LINEAR_WEBHOOK_SECRET',
    description: 'Linear webhook secret for signature verification',
    required: false,
    example: 'lin_whsec_xxxxxxxxxxxxx'
  },
  {
    name: 'SLACK_SIGNING_SECRET',
    description: 'Slack signing secret for request verification',
    required: false,
    example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  }
];

async function setupSecrets() {
  console.log(chalk.blue('🔐 Setting up Cloudflare Worker secrets...\n'));
  console.log(chalk.gray('These secrets are used to verify webhook signatures from each platform.'));
  console.log(chalk.gray('They are optional but highly recommended for production use.\n'));

  const { confirmSetup } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmSetup',
      message: 'Do you want to set up webhook secrets now?',
      default: true
    }
  ]);

  if (!confirmSetup) {
    console.log(chalk.yellow('\n⚠️  Skipping secret setup. You can run this again later with: npm run setup:secrets'));
    return;
  }

  // Check if wrangler is authenticated
  const spinner = ora('Checking Cloudflare authentication...').start();
  try {
    execSync('wrangler whoami', { stdio: 'ignore' });
    spinner.succeed(chalk.green('✓ Authenticated with Cloudflare'));
  } catch (error) {
    spinner.fail(chalk.red('✗ Not authenticated with Cloudflare'));
    console.log(chalk.yellow('\n⚠️  Please authenticate with Cloudflare first:'));
    console.log(chalk.gray('   Run: wrangler login'));
    process.exit(1);
  }

  console.log(chalk.blue('\n📝 Enter webhook secrets (press Enter to skip):\n'));

  for (const secret of secrets) {
    const { value } = await inquirer.prompt([
      {
        type: 'password',
        name: 'value',
        message: `${secret.name}:`,
        mask: '*',
        validate: (input) => {
          if (!input && secret.required) {
            return `${secret.name} is required`;
          }
          return true;
        }
      }
    ]);

    if (value) {
      const spinner = ora(`Setting ${secret.name}...`).start();
      try {
        execSync(`wrangler secret put ${secret.name}`, {
          input: value,
          stdio: ['pipe', 'ignore', 'ignore']
        });
        spinner.succeed(chalk.green(`✓ ${secret.name} set successfully`));
      } catch (error) {
        spinner.fail(chalk.red(`✗ Failed to set ${secret.name}`));
        console.error(chalk.red(`   Error: ${error.message}`));
      }
    } else {
      console.log(chalk.gray(`   Skipped ${secret.name}`));
    }
  }

  // List current secrets
  console.log(chalk.blue('\n📋 Current secrets:'));
  try {
    const output = execSync('wrangler secret list', { encoding: 'utf8' });
    console.log(chalk.gray(output));
  } catch (error) {
    console.log(chalk.yellow('   Unable to list secrets'));
  }

  console.log(chalk.blue('\n✨ Secret setup complete!'));
  console.log(chalk.gray('\nTo update a secret later, run:'));
  console.log(chalk.gray('   wrangler secret put SECRET_NAME'));
  console.log(chalk.gray('\nTo delete a secret, run:'));
  console.log(chalk.gray('   wrangler secret delete SECRET_NAME'));
}

// Run the setup
setupSecrets().catch(error => {
  console.error(chalk.red('❌ Setup failed:'), error);
  process.exit(1);
});