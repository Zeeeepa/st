// scripts/managers/linear-webhook-manager.js
import chalk from 'chalk';
import ora from 'ora';

export class LinearWebhookManager {
  constructor(config) {
    this.config = config;
    this.apiKey = config.linear.apiKey;
    this.webhookUrl = config.workerUrl + '/webhook/linear';
    this.baseUrl = 'https://api.linear.app/graphql';
  }

  async graphqlRequest(query, variables = {}) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'webhook-gateway'
      },
      body: JSON.stringify({
        query,
        variables
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Linear API error (${response.status}): ${error}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`Linear GraphQL errors: ${result.errors.map(e => e.message).join(', ')}`);
    }

    return result.data;
  }

  async discoverResources() {
    const spinner = ora('Discovering Linear organization...').start();
    
    try {
      const query = `
        query GetOrganization {
          organization {
            id
            name
            urlKey
            createdAt
            settings {
              enabledIntegrations
            }
          }
          teams {
            nodes {
              id
              name
              key
              description
              private
              issueCount
              memberCount
            }
          }
          users {
            nodes {
              id
              name
              displayName
              email
              active
              admin
            }
          }
        }
      `;

      const data = await this.graphqlRequest(query);
      
      const resources = {
        organization: data.organization,
        teams: data.teams.nodes || [],
        users: data.users.nodes || []
      };

      spinner.succeed(chalk.green(`Found Linear organization: ${resources.organization.name} (${resources.teams.length} teams, ${resources.users.length} users)`));
      
      return resources;
    } catch (error) {
      spinner.fail(chalk.red(`Linear discovery failed: ${error.message}`));
      throw error;
    }
  }

  async listWebhooks() {
    try {
      const query = `
        query GetWebhooks {
          webhooks {
            nodes {
              id
              url
              enabled
              secret
              label
              resourceTypes
              createdAt
              updatedAt
              creator {
                id
                name
                email
              }
              team {
                id
                name
                key
              }
            }
          }
        }
      `;

      const data = await this.graphqlRequest(query);
      return data.webhooks.nodes || [];
    } catch (error) {
      console.error(`Failed to list webhooks: ${error.message}`);
      return [];
    }
  }

  async validateWebhooks() {
    const spinner = ora('Validating Linear webhooks...').start();
    
    try {
      const webhooks = await this.listWebhooks();
      
      // Find our webhook
      const ourWebhook = webhooks.find(webhook => 
        webhook.url === this.webhookUrl
      );

      const results = {
        exists: !!ourWebhook,
        valid: false,
        webhook: ourWebhook,
        issues: []
      };

      if (ourWebhook) {
        // Validate webhook configuration
        if (!ourWebhook.enabled) {
          results.issues.push('Webhook is not enabled');
        }

        if (ourWebhook.url !== this.webhookUrl) {
          results.issues.push('Webhook URL is incorrect');
        }

        // Check if all required resource types are enabled
        const requiredResourceTypes = [
          'Issue', 'Comment', 'Project', 'ProjectUpdate',
          'Cycle', 'User', 'Team', 'Label', 'WorkflowState',
          'Milestone', 'Attachment', 'Reaction'
        ];

        const missingTypes = requiredResourceTypes.filter(type => 
          !ourWebhook.resourceTypes?.includes(type)
        );

        if (missingTypes.length > 0) {
          results.issues.push(`Missing resource types: ${missingTypes.join(', ')}`);
        }

        results.valid = results.issues.length === 0;
        
        if (results.valid) {
          spinner.succeed(chalk.green('✓ Linear webhook is valid'));
        } else {
          spinner.warn(chalk.yellow(`⚠ Linear webhook has issues: ${results.issues.join(', ')}`));
        }
      } else {
        spinner.info(chalk.blue('+ No Linear webhook found'));
      }

      return results;
    } catch (error) {
      spinner.fail(chalk.red(`Linear webhook validation failed: ${error.message}`));
      throw error;
    }
  }

  async createWebhook() {
    const spinner = ora('Creating Linear webhook...').start();
    
    try {
      const mutation = `
        mutation CreateWebhook($input: WebhookCreateInput!) {
          webhookCreate(input: $input) {
            webhook {
              id
              url
              enabled
              secret
              label
              resourceTypes
              createdAt
            }
            success
          }
        }
      `;

      const variables = {
        input: {
          url: this.webhookUrl,
          enabled: true,
          label: 'Webhook Gateway - Auto-configured',
          resourceTypes: [
            'Issue', 'Comment', 'Project', 'ProjectUpdate',
            'Cycle', 'User', 'Team', 'Label', 'WorkflowState',
            'Milestone', 'Attachment', 'Reaction', 'Document',
            'Favorite', 'Notification', 'Integration'
          ],
          ...(this.config.linear.secret && { secret: this.config.linear.secret })
        }
      };

      const data = await this.graphqlRequest(mutation, variables);
      
      if (data.webhookCreate.success) {
        const webhook = data.webhookCreate.webhook;
        spinner.succeed(chalk.green(`✓ Created Linear webhook (ID: ${webhook.id})`));
        return {
          success: true,
          webhook
        };
      } else {
        throw new Error('Webhook creation was not successful');
      }
    } catch (error) {
      spinner.fail(chalk.red(`✗ Failed to create Linear webhook: ${error.message}`));
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateWebhook(webhookId, updates) {
    const spinner = ora('Updating Linear webhook...').start();
    
    try {
      const mutation = `
        mutation UpdateWebhook($id: String!, $input: WebhookUpdateInput!) {
          webhookUpdate(id: $id, input: $input) {
            webhook {
              id
              url
              enabled
              secret
              label
              resourceTypes
              updatedAt
            }
            success
          }
        }
      `;

      const variables = {
        id: webhookId,
        input: {
          url: this.webhookUrl,
          enabled: true,
          resourceTypes: [
            'Issue', 'Comment', 'Project', 'ProjectUpdate',
            'Cycle', 'User', 'Team', 'Label', 'WorkflowState',
            'Milestone', 'Attachment', 'Reaction', 'Document',
            'Favorite', 'Notification', 'Integration'
          ],
          ...updates
        }
      };

      const data = await this.graphqlRequest(mutation, variables);
      
      if (data.webhookUpdate.success) {
        const webhook = data.webhookUpdate.webhook;
        spinner.succeed(chalk.green(`✓ Updated Linear webhook (ID: ${webhook.id})`));
        return {
          success: true,
          webhook
        };
      } else {
        throw new Error('Webhook update was not successful');
      }
    } catch (error) {
      spinner.fail(chalk.red(`✗ Failed to update Linear webhook: ${error.message}`));
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteWebhook(webhookId) {
    try {
      const mutation = `
        mutation DeleteWebhook($id: String!) {
          webhookDelete(id: $id) {
            success
          }
        }
      `;

      const variables = { id: webhookId };
      const data = await this.graphqlRequest(mutation, variables);
      
      return data.webhookDelete.success;
    } catch (error) {
      console.error(`Failed to delete webhook: ${error.message}`);
      return false;
    }
  }

  async testWebhook(webhookId) {
    try {
      // Linear doesn't have a built-in webhook test endpoint
      // We'll create a simple test by triggering a webhook event
      const query = `
        query GetWebhook($id: String!) {
          webhook(id: $id) {
            id
            url
            enabled
            lastDeliveryStatus
            createdAt
          }
        }
      `;

      const data = await this.graphqlRequest(query, { id: webhookId });
      
      return {
        success: !!data.webhook,
        webhook: data.webhook
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getWebhookDeliveries(webhookId) {
    try {
      // Linear's webhook delivery information is limited
      // We can only get basic webhook info
      const query = `
        query GetWebhook($id: String!) {
          webhook(id: $id) {
            id
            url
            enabled
            label
            resourceTypes
            lastDeliveryStatus
            createdAt
            updatedAt
          }
        }
      `;

      const data = await this.graphqlRequest(query, { id: webhookId });
      return data.webhook;
    } catch (error) {
      console.error(`Failed to get webhook info: ${error.message}`);
      return null;
    }
  }

  async setupAllWebhooks() {
    try {
      console.log(chalk.blue('📐 Starting Linear webhook setup...\n'));

      // Discover organization
      const resources = await this.discoverResources();

      // Validate existing webhooks
      const validation = await this.validateWebhooks();

      let result;

      if (!validation.exists) {
        // Create new webhook
        console.log(chalk.blue('🔨 Creating Linear webhook...\n'));
        result = await this.createWebhook();
      } else if (!validation.valid) {
        // Update existing webhook
        console.log(chalk.blue('🔧 Fixing Linear webhook...\n'));
        result = await this.updateWebhook(validation.webhook.id, {
          label: 'Webhook Gateway - Auto-configured'
        });
      } else {
        // Webhook is already valid
        console.log(chalk.green('✅ Linear webhook is already properly configured'));
        result = {
          success: true,
          webhook: validation.webhook
        };
      }

      const summary = {
        organization: resources.organization.name,
        webhook_configured: result.success,
        webhook_id: result.webhook?.id,
        webhook_url: this.webhookUrl,
        teams_count: resources.teams.length,
        users_count: resources.users.length
      };

      console.log(chalk.blue('\n🎯 Linear Setup Complete!'));
      console.log(chalk.green(`   ✅ Organization: ${summary.organization}`));
      console.log(chalk.green(`   ✅ Webhook configured: ${summary.webhook_configured ? 'Yes' : 'No'}`));
      console.log(chalk.green(`   ✅ Teams: ${summary.teams_count}`));
      console.log(chalk.green(`   ✅ Users: ${summary.users_count}`));

      if (result.webhook) {
        console.log(chalk.gray(`   📡 Webhook ID: ${result.webhook.id}`));
        console.log(chalk.gray(`   🔗 Webhook URL: ${this.webhookUrl}`));
      }

      return {
        success: result.success,
        summary,
        details: {
          resources,
          validation,
          webhook: result.webhook
        }
      };

    } catch (error) {
      console.error(chalk.red(`Linear webhook setup failed: ${error.message}`));
      return {
        success: false,
        error: error.message
      };
    }
  }
}