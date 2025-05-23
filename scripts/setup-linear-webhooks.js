// scripts/setup-linear-webhooks.js
import { LinearWebhookManager } from './managers/linear-webhook-manager.js';
import chalk from 'chalk';

export async function setupLinearWebhooks(webhookUrl, apiKey, secret = null) {
  try {
    const config = {
      workerUrl: webhookUrl.replace('/webhook/linear', ''),
      linear: {
        apiKey,
        secret
      }
    };

    const manager = new LinearWebhookManager(config);
    const result = await manager.setupAllWebhooks();

    return {
      success: result.success,
      webhooksCreated: result.summary?.webhook_configured ? 1 : 0,
      webhooksUpdated: 0,
      webhooksSkipped: result.summary?.webhook_configured ? 0 : 1,
      organization: result.summary?.organization || 'Unknown',
      teamsCount: result.summary?.teams_count || 0,
      usersCount: result.summary?.users_count || 0,
      webhookId: result.summary?.webhook_id,
      error: result.error,
      details: result.details
    };
  } catch (error) {
    console.error(chalk.red(`Linear webhook setup failed: ${error.message}`));
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
  const webhookUrl = process.argv[2] || process.env.CLOUDFLARE_WORKER_URL + '/webhook/linear';
  const apiKey = process.argv[3] || process.env.LINEAR_API_KEY;
  const secret = process.argv[4] || process.env.LINEAR_WEBHOOK_SECRET;

  if (!apiKey) {
    console.error(chalk.red('❌ Linear API key is required'));
    console.log(chalk.yellow('Usage: node setup-linear-webhooks.js [webhook_url] [api_key] [secret]'));
    console.log(chalk.yellow('Or set LINEAR_API_KEY environment variable'));
    process.exit(1);
  }

  console.log(chalk.blue('📐 Setting up Linear webhooks...\n'));
  console.log(chalk.gray(`Webhook URL: ${webhookUrl}`));
  console.log(chalk.gray(`Using API key: ${apiKey.substring(0, 10)}...`));
  console.log(chalk.gray(`Secret configured: ${!!secret}\n`));

  setupLinearWebhooks(webhookUrl, apiKey, secret).then(result => {
    if (result.success) {
      console.log(chalk.green('\n✅ Linear webhooks setup completed successfully!'));
      console.log(chalk.blue(`   🏢 Organization: ${result.organization}`));
      console.log(chalk.blue(`   👥 Teams: ${result.teamsCount}`));
      console.log(chalk.blue(`   👤 Users: ${result.usersCount}`));
      console.log(chalk.blue(`   ✅ Webhook configured: Yes`));
      
      if (result.webhookId) {
        console.log(chalk.blue(`   🔗 Webhook ID: ${result.webhookId}`));
      }
    } else {
      console.log(chalk.red('\n❌ Linear webhooks setup failed'));
      console.log(chalk.red(`   Error: ${result.error}`));
      process.exit(1);
    }
  }).catch(error => {
    console.error(chalk.red('\n❌ Fatal error during Linear setup:'), error);
    process.exit(1);
  });
}