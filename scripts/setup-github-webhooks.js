// scripts/setup-github-webhooks.js
import { GitHubWebhookManager } from './managers/github-webhook-manager.js';
import chalk from 'chalk';

export async function setupGitHubWebhooks(webhookUrl, token, secret = null) {
  try {
    const config = {
      workerUrl: webhookUrl.replace('/webhook/github', ''),
      github: {
        token,
        secret
      }
    };

    const manager = new GitHubWebhookManager(config);
    const result = await manager.setupAllWebhooks();

    return {
      success: result.success,
      webhooksCreated: result.summary?.created_webhooks || 0,
      webhooksUpdated: result.summary?.fixed_webhooks || 0,
      webhooksSkipped: result.summary?.valid_webhooks || 0,
      totalRepositories: result.summary?.total_repositories || 0,
      organizations: result.summary?.organizations || [],
      error: result.error,
      details: result.details
    };
  } catch (error) {
    console.error(chalk.red(`GitHub webhook setup failed: ${error.message}`));
    return {
      success: false,
      error: error.message,
      webhooksCreated: 0,
      webhooksUpdated: 0,
      webhooksSkipped: 0
    };
  }
}

// Allow running this script directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const webhookUrl = process.argv[2] || process.env.CLOUDFLARE_WORKER_URL + '/webhook/github';
  const token = process.argv[3] || process.env.GITHUB_TOKEN;
  const secret = process.argv[4] || process.env.GITHUB_WEBHOOK_SECRET;

  if (!token) {
    console.error(chalk.red('❌ GitHub token is required'));
    console.log(chalk.yellow('Usage: node setup-github-webhooks.js [webhook_url] [token] [secret]'));
    console.log(chalk.yellow('Or set GITHUB_TOKEN environment variable'));
    process.exit(1);
  }

  console.log(chalk.blue('🐙 Setting up GitHub webhooks...\n'));
  console.log(chalk.gray(`Webhook URL: ${webhookUrl}`));
  console.log(chalk.gray(`Using token: ${token.substring(0, 10)}...`));
  console.log(chalk.gray(`Secret configured: ${!!secret}\n`));

  setupGitHubWebhooks(webhookUrl, token, secret).then(result => {
    if (result.success) {
      console.log(chalk.green('\n✅ GitHub webhooks setup completed successfully!'));
      console.log(chalk.blue(`   📊 Total repositories: ${result.totalRepositories}`));
      console.log(chalk.blue(`   ✅ Webhooks created: ${result.webhooksCreated}`));
      console.log(chalk.blue(`   🔧 Webhooks updated: ${result.webhooksUpdated}`));
      console.log(chalk.blue(`   ✓ Webhooks already valid: ${result.webhooksSkipped}`));
      
      if (result.organizations.length > 0) {
        console.log(chalk.blue(`   🏢 Organizations: ${result.organizations.join(', ')}`));
      }
    } else {
      console.log(chalk.red('\n❌ GitHub webhooks setup failed'));
      console.log(chalk.red(`   Error: ${result.error}`));
      process.exit(1);
    }
  }).catch(error => {
    console.error(chalk.red('\n❌ Fatal error during GitHub setup:'), error);
    process.exit(1);
  });
}