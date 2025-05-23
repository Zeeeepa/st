// scripts/managers/slack-webhook-manager.js
import chalk from 'chalk';
import ora from 'ora';

export class SlackWebhookManager {
  constructor(config) {
    this.config = config;
    this.token = config.slack.botToken;
    this.webhookUrl = config.workerUrl + '/webhook/slack';
    this.baseUrl = 'https://slack.com/api';
  }

  async apiRequest(endpoint, method = 'GET', body = null) {
    const url = `${this.baseUrl}/${endpoint}`;
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'webhook-gateway'
      }
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(`Slack API error: ${data.error || response.statusText}`);
    }

    return data;
  }

  async discoverResources() {
    const spinner = ora('Discovering Slack workspace...').start();
    
    try {
      // Get team info
      const teamInfo = await this.apiRequest('team.info');
      
      // Get app info
      const appInfo = await this.apiRequest('apps.permissions.info');
      
      // Get channels (public only for discovery)
      const channelsInfo = await this.apiRequest('conversations.list', 'GET');
      
      // Get users count
      const usersInfo = await this.apiRequest('users.list', 'GET');

      const resources = {
        team: teamInfo.team,
        app: appInfo.info,
        channels: channelsInfo.channels?.filter(c => !c.is_archived) || [],
        users: usersInfo.members?.filter(u => !u.deleted && !u.is_bot) || [],
        permissions: appInfo.info?.app_oauth_scopes || []
      };

      spinner.succeed(chalk.green(`Found Slack workspace: ${resources.team.name} (${resources.channels.length} channels, ${resources.users.length} users)`));
      
      return resources;
    } catch (error) {
      spinner.fail(chalk.red(`Slack discovery failed: ${error.message}`));
      throw error;
    }
  }

  async validateEventSubscriptions() {
    const spinner = ora('Validating Slack Event Subscriptions...').start();
    
    try {
      // Note: Slack doesn't provide a direct API to check Event Subscriptions
      // We need to make educated guesses based on app permissions and scopes
      
      const appInfo = await this.apiRequest('apps.permissions.info');
      const scopes = appInfo.info?.app_oauth_scopes?.app || [];
      const userScopes = appInfo.info?.app_oauth_scopes?.user || [];
      
      const results = {
        configured: false,
        issues: [],
        scopes: scopes,
        userScopes: userScopes,
        requiredScopes: [
          'channels:read', 'channels:history', 'groups:read', 'groups:history',
          'im:read', 'im:history', 'mpim:read', 'mpim:history',
          'users:read', 'team:read', 'files:read', 'reactions:read',
          'app_mentions:read', 'chat:write'
        ]
      };

      // Check required scopes
      const missingScopes = results.requiredScopes.filter(scope => 
        !scopes.includes(scope)
      );

      if (missingScopes.length > 0) {
        results.issues.push(`Missing OAuth scopes: ${missingScopes.join(', ')}`);
      }

      // Check if we have basic event permissions
      const hasEventPermissions = scopes.some(scope => 
        scope.includes('read') || scope.includes('history')
      );

      if (!hasEventPermissions) {
        results.issues.push('No event-related permissions found');
      }

      results.configured = results.issues.length === 0;

      if (results.configured) {
        spinner.succeed(chalk.green('✓ Slack app has proper permissions for events'));
      } else {
        spinner.warn(chalk.yellow(`⚠ Slack app configuration issues: ${results.issues.join(', ')}`));
      }

      return results;
    } catch (error) {
      spinner.fail(chalk.red(`Slack validation failed: ${error.message}`));
      return {
        configured: false,
        issues: [`API Error: ${error.message}`],
        scopes: [],
        userScopes: []
      };
    }
  }

  generateEventSubscriptionConfig() {
    return {
      request_url: this.webhookUrl,
      bot_events: [
        // Message events
        'message.channels', 'message.groups', 'message.im', 'message.mpim',
        'app_mention', 'message_changed', 'message_deleted',
        
        // Channel events
        'channel_created', 'channel_deleted', 'channel_archive', 'channel_unarchive',
        'channel_rename', 'member_joined_channel', 'member_left_channel',
        
        // User events
        'user_change', 'team_join', 'presence_change',
        
        // File events
        'file_created', 'file_shared', 'file_public', 'file_unshared',
        'file_change', 'file_deleted', 'file_comment_added',
        
        // Reaction events
        'reaction_added', 'reaction_removed',
        
        // Star and pin events
        'star_added', 'star_removed', 'pin_added', 'pin_removed',
        
        // App events
        'app_home_opened', 'app_uninstalled'
      ],
      user_events: [
        // User-level events if needed
      ]
    };
  }

  async testConnection() {
    const spinner = ora('Testing Slack connection...').start();
    
    try {
      const response = await this.apiRequest('auth.test');
      
      const connectionInfo = {
        success: true,
        team: response.team,
        team_id: response.team_id,
        user: response.user,
        user_id: response.user_id,
        bot_id: response.bot_id,
        app_id: response.app_id,
        is_enterprise_install: response.is_enterprise_install
      };

      spinner.succeed(chalk.green(`✓ Connected to Slack workspace: ${connectionInfo.team}`));
      return connectionInfo;
    } catch (error) {
      spinner.fail(chalk.red(`✗ Slack connection test failed: ${error.message}`));
      return {
        success: false,
        error: error.message
      };
    }
  }

  generateSlackAppManifest() {
    return {
      display_information: {
        name: "Webhook Gateway",
        description: "Automatically configured webhook gateway for capturing Slack events",
        background_color: "#2c2d30"
      },
      features: {
        bot_user: {
          display_name: "Webhook Gateway Bot",
          always_online: true
        }
      },
      oauth_config: {
        scopes: {
          bot: [
            "channels:read", "channels:history", "groups:read", "groups:history",
            "im:read", "im:history", "mpim:read", "mpim:history",
            "users:read", "team:read", "files:read", "reactions:read",
            "app_mentions:read", "chat:write", "commands"
          ]
        }
      },
      settings: {
        event_subscriptions: {
          request_url: this.webhookUrl,
          bot_events: this.generateEventSubscriptionConfig().bot_events
        },
        interactivity: {
          is_enabled: true,
          request_url: this.webhookUrl + "/interactive"
        },
        org_deploy_enabled: false,
        socket_mode_enabled: false,
        token_rotation_enabled: false
      }
    };
  }

  async setupAllWebhooks() {
    try {
      console.log(chalk.blue('💬 Starting Slack webhook setup...\n'));

      // Test connection first
      const connectionTest = await this.testConnection();
      if (!connectionTest.success) {
        throw new Error(`Connection failed: ${connectionTest.error}`);
      }

      // Discover workspace
      const resources = await this.discoverResources();

      // Validate event subscriptions
      const validation = await this.validateEventSubscriptions();

      const summary = {
        workspace: resources.team.name,
        workspace_id: resources.team.id,
        app_id: connectionTest.app_id,
        bot_id: connectionTest.bot_id,
        permissions_configured: validation.configured,
        channels_count: resources.channels.length,
        users_count: resources.users.length,
        scopes: validation.scopes,
        webhook_url: this.webhookUrl
      };

      console.log(chalk.blue('\n🎯 Slack Setup Status:'));
      console.log(chalk.green(`   ✅ Workspace: ${summary.workspace}`));
      console.log(chalk.green(`   ✅ App connected: Yes`));
      console.log(chalk.green(`   ✅ Channels: ${summary.channels_count}`));
      console.log(chalk.green(`   ✅ Users: ${summary.users_count}`));
      
      if (validation.configured) {
        console.log(chalk.green(`   ✅ Event subscriptions: Properly configured`));
      } else {
        console.log(chalk.red(`   ❌ Event subscriptions: Need manual configuration`));
        console.log(chalk.yellow('\n⚠️  Manual Configuration Required:'));
        console.log(chalk.yellow('   1. Go to https://api.slack.com/apps'));
        console.log(chalk.yellow(`   2. Select your app (App ID: ${connectionTest.app_id})`));
        console.log(chalk.yellow('   3. Go to "Event Subscriptions"'));
        console.log(chalk.yellow(`   4. Set Request URL to: ${this.webhookUrl}`));
        console.log(chalk.yellow('   5. Add the required bot events (see documentation)'));
        console.log(chalk.yellow('   6. Save the configuration'));
        
        // Generate app manifest for easy configuration
        const manifest = this.generateSlackAppManifest();
        console.log(chalk.blue('\n📋 App Manifest (copy this to App Manifest editor):'));
        console.log(chalk.gray(JSON.stringify(manifest, null, 2)));
      }

      return {
        success: connectionTest.success,
        manual_config_required: !validation.configured,
        summary,
        details: {
          connectionTest,
          resources,
          validation,
          eventConfig: this.generateEventSubscriptionConfig(),
          appManifest: this.generateSlackAppManifest()
        }
      };

    } catch (error) {
      console.error(chalk.red(`Slack webhook setup failed: ${error.message}`));
      return {
        success: false,
        error: error.message
      };
    }
  }

  async verifyWebhookEndpoint() {
    try {
      // Make a test request to our webhook endpoint to verify it's accessible
      const testPayload = {
        type: 'url_verification',
        challenge: 'webhook_gateway_test_' + Date.now()
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Slack-Request-Timestamp': Math.floor(Date.now() / 1000).toString(),
          'X-Slack-Signature': 'v0=test_signature'
        },
        body: JSON.stringify(testPayload)
      });

      return {
        accessible: response.status !== 404,
        status: response.status,
        url: this.webhookUrl
      };
    } catch (error) {
      return {
        accessible: false,
        error: error.message,
        url: this.webhookUrl
      };
    }
  }
}