// scripts/setup-slack-webhooks.js
import { SlackWebhookManager } from './managers/slack-webhook-manager.js';
import chalk from 'chalk';

export async function setupSlackWebhooks(webhookUrl, botToken, signingSecret = null) {
  try {
    const config = {
      workerUrl: webhookUrl.replace('/webhook/slack', ''),
      slack: {
        botToken,
        signingSecret
      }
    };

    const manager = new SlackWebhookManager(config);
    const result = await manager.setupAllWebhooks();

    return {
      success: result.success,
      webhooksCreated: result.manual_config_required ? 0 : 1,
      webhooksUpdated: 0,
      webhooksSkipped: result.manual_config_required ? 0 : 1,
      manualConfigRequired: result.manual_config_required,
      workspace: result.summary?.workspace || 'Unknown',
      channelsCount: result.summary?.channels_count || 0,
      usersCount: result.summary?.users_count || 0,
      appId: result.summary?.app_id,
      botId: result.summary?.bot_id,
      error: result.error,
      details: result.details
    };
  } catch (error) {
    console.error(chalk.red(`Slack webhook setup failed: ${error.message}`));
    return {
      success: false,
      error: error.message,
      webhooksCreated: 0,
      webhooksUpdated: 0,
      webhooksSkipped: 0,
      manualConfigRequired: true
    };
  }
}

// Allow running this script directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const webhookUrl = process.argv[2] || process.env.CLOUDFLARE_WORKER_URL + '/webhook/slack';
  const botToken = process.argv[3] || process.env.SLACK_BOT_TOKEN;
  const signingSecret = process.argv[4] || process.env.SLACK_SIGNING_SECRET;

  if (!botToken) {
    console.error(chalk.red('❌ Slack bot token is required'));
    console.log(chalk.yellow('Usage: node setup-slack-webhooks.js [webhook_url] [bot_token] [signing_secret]'));
    console.log(chalk.yellow('Or set SLACK_BOT_TOKEN environment variable'));
    process.exit(1);
  }

  console.log(chalk.blue('💬 Setting up Slack webhooks...\n'));
  console.log(chalk.gray(`Webhook URL: ${webhookUrl}`));
  console.log(chalk.gray(`Using bot token: ${botToken.substring(0, 10)}...`));
  console.log(chalk.gray(`Signing secret configured: ${!!signingSecret}\n`));

  setupSlackWebhooks(webhookUrl, botToken, signingSecret).then(result => {
    if (result.success) {
      console.log(chalk.green('\n✅ Slack webhooks setup completed successfully!'));
      console.log(chalk.blue(`   💬 Workspace: ${result.workspace}`));
      console.log(chalk.blue(`   📺 Channels: ${result.channelsCount}`));
      console.log(chalk.blue(`   👤 Users: ${result.usersCount}`));
      
      if (result.manualConfigRequired) {
        console.log(chalk.yellow(`   ⚠️  Manual configuration required in Slack App settings`));
        console.log(chalk.yellow(`   📋 Check the setup output above for detailed instructions`));
      } else {
        console.log(chalk.blue(`   ✅ Event subscriptions: Configured`));
      }
      
      if (result.appId) {
        console.log(chalk.blue(`   📱 App ID: ${result.appId}`));
      }
      
      if (result.botId) {
        console.log(chalk.blue(`   🤖 Bot ID: ${result.botId}`));
      }
    } else {
      console.log(chalk.red('\n❌ Slack webhooks setup failed'));
      console.log(chalk.red(`   Error: ${result.error}`));
      process.exit(1);
    }
  }).catch(error => {
    console.error(chalk.red('\n❌ Fatal error during Slack setup:'), error);
    process.exit(1);
  });
}