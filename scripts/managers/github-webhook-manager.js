// scripts/managers/github-webhook-manager.js
import chalk from 'chalk';
import ora from 'ora';

export class GitHubWebhookManager {
  constructor(config) {
    this.config = config;
    this.token = config.github.token;
    this.webhookUrl = config.workerUrl + '/webhook/github';
    this.baseUrl = 'https://api.github.com';
  }

  async discoverResources() {
    const spinner = ora('Discovering GitHub repositories...').start();
    const resources = {
      repositories: [],
      organizations: []
    };

    try {
      // Get all repositories (personal and organization)
      const repos = await this.listAllRepositories();
      
      // Filter out archived and disabled repositories
      resources.repositories = repos.filter(repo => !repo.archived && !repo.disabled);
      
      // Get unique organizations
      const orgs = [...new Set(repos
        .filter(repo => repo.owner.type === 'Organization')
        .map(repo => repo.owner.login)
      )];
      resources.organizations = orgs;
      
      spinner.succeed(chalk.green(`Found ${resources.repositories.length} active repositories across ${resources.organizations.length} organizations`));
      
      return resources;
    } catch (error) {
      spinner.fail(chalk.red(`GitHub discovery failed: ${error.message}`));
      throw error;
    }
  }

  async listAllRepositories() {
    let allRepos = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await fetch(`${this.baseUrl}/user/repos?per_page=${perPage}&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'webhook-gateway'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`GitHub API error (${response.status}): ${error}`);
      }

      const repos = await response.json();
      
      if (repos.length === 0) break;
      
      allRepos = allRepos.concat(repos);
      page++;

      // Rate limiting - GitHub allows 5000 requests per hour
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return allRepos;
  }

  async validateWebhooks(repositories) {
    const results = {
      valid: [],
      invalid: [],
      missing: [],
      errors: []
    };

    console.log(chalk.blue(`\n🔍 Validating webhooks for ${repositories.length} repositories...\n`));

    for (const repo of repositories) {
      const spinner = ora(`Checking ${repo.full_name}...`).start();
      
      try {
        const validation = await this.validateWebhook(repo);
        
        if (validation.exists && validation.valid) {
          results.valid.push({ repo, webhook: validation.webhook });
          spinner.succeed(chalk.green(`✓ ${repo.full_name} - Valid webhook`));
        } else if (validation.exists && !validation.valid) {
          results.invalid.push({ 
            repo, 
            webhook: validation.webhook, 
            issues: validation.issues 
          });
          spinner.warn(chalk.yellow(`⚠ ${repo.full_name} - Invalid webhook: ${validation.issues.join(', ')}`));
        } else {
          results.missing.push({ repo });
          spinner.info(chalk.blue(`+ ${repo.full_name} - No webhook found`));
        }
      } catch (error) {
        results.errors.push({ repo, error: error.message });
        spinner.fail(chalk.red(`✗ ${repo.full_name} - Error: ${error.message}`));
      }
    }

    console.log(chalk.blue('\n📊 Webhook Validation Summary:'));
    console.log(chalk.green(`   ✓ Valid: ${results.valid.length}`));
    console.log(chalk.yellow(`   ⚠ Invalid: ${results.invalid.length}`));
    console.log(chalk.blue(`   + Missing: ${results.missing.length}`));
    console.log(chalk.red(`   ✗ Errors: ${results.errors.length}`));

    return results;
  }

  async validateWebhook(repository) {
    try {
      const response = await fetch(`${this.baseUrl}/repos/${repository.full_name}/hooks`, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'webhook-gateway'
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Insufficient permissions to access webhooks');
        }
        throw new Error(`Cannot access webhooks: ${response.status}`);
      }

      const webhooks = await response.json();
      
      // Find our webhook
      const ourWebhook = webhooks.find(hook => 
        hook.config?.url === this.webhookUrl
      );

      if (!ourWebhook) {
        return { exists: false, valid: false };
      }

      // Validate webhook configuration
      const issues = [];
      
      if (!ourWebhook.active) {
        issues.push('Webhook is not active');
      }
      
      if (ourWebhook.config?.content_type !== 'json') {
        issues.push('Content type should be application/json');
      }
      
      if (!ourWebhook.config?.url || ourWebhook.config.url !== this.webhookUrl) {
        issues.push('Webhook URL is incorrect');
      }

      // Check events
      const requiredEvents = [
        'push', 'pull_request', 'issues', 'issue_comment',
        'pull_request_review', 'pull_request_review_comment',
        'release', 'workflow_run', 'check_run', 'check_suite',
        'deployment', 'deployment_status', 'fork', 'star',
        'watch', 'create', 'delete'
      ];
      
      const missingEvents = requiredEvents.filter(event => 
        !ourWebhook.events?.includes(event)
      );
      
      if (missingEvents.length > 0) {
        issues.push(`Missing events: ${missingEvents.join(', ')}`);
      }

      return {
        exists: true,
        valid: issues.length === 0,
        issues,
        webhook: ourWebhook
      };

    } catch (error) {
      return {
        exists: false,
        valid: false,
        error: error.message
      };
    }
  }

  async createWebhooks(repositories) {
    if (repositories.length === 0) {
      console.log(chalk.blue('No repositories need webhook creation'));
      return [];
    }

    console.log(chalk.blue(`\n🔨 Creating webhooks for ${repositories.length} repositories...\n`));

    const created = [];
    const failed = [];
    
    for (const { repo } of repositories) {
      const spinner = ora(`Creating webhook for ${repo.full_name}...`).start();
      
      try {
        const webhookConfig = {
          name: 'web',
          active: true,
          events: [
            'push', 'pull_request', 'issues', 'issue_comment',
            'pull_request_review', 'pull_request_review_comment',
            'release', 'workflow_run', 'check_run', 'check_suite',
            'deployment', 'deployment_status', 'fork', 'star',
            'watch', 'create', 'delete', 'repository',
            'member', 'team', 'organization', 'public',
            'gollum', 'commit_comment', 'discussion',
            'discussion_comment', 'security_advisory'
          ],
          config: {
            url: this.webhookUrl,
            content_type: 'json',
            insecure_ssl: '0'
          }
        };

        // Add secret if configured
        const secret = this.config.github.secret;
        if (secret) {
          webhookConfig.config.secret = secret;
        }

        const response = await fetch(`${this.baseUrl}/repos/${repo.full_name}/hooks`, {
          method: 'POST',
          headers: {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'webhook-gateway'
          },
          body: JSON.stringify(webhookConfig)
        });

        if (response.ok) {
          const webhook = await response.json();
          created.push({ repo, webhook });
          spinner.succeed(chalk.green(`✓ Created webhook for ${repo.full_name}`));
        } else {
          const error = await response.text();
          failed.push({ repo, error });
          
          if (response.status === 422) {
            spinner.fail(chalk.red(`✗ ${repo.full_name} - Webhook already exists or validation failed`));
          } else if (response.status === 403) {
            spinner.fail(chalk.red(`✗ ${repo.full_name} - Insufficient permissions`));
          } else {
            spinner.fail(chalk.red(`✗ ${repo.full_name} - Error: ${error}`));
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 150));
        
      } catch (error) {
        failed.push({ repo, error: error.message });
        spinner.fail(chalk.red(`✗ Error creating webhook for ${repo.full_name}: ${error.message}`));
      }
    }

    console.log(chalk.blue('\n📊 Webhook Creation Summary:'));
    console.log(chalk.green(`   ✓ Created: ${created.length}`));
    console.log(chalk.red(`   ✗ Failed: ${failed.length}`));

    if (failed.length > 0) {
      console.log(chalk.yellow('\n⚠️  Failed repositories:'));
      failed.forEach(({ repo, error }) => {
        console.log(chalk.yellow(`   - ${repo.full_name}: ${error}`));
      });
    }

    return { created, failed };
  }

  async fixWebhooks(invalidWebhooks) {
    if (invalidWebhooks.length === 0) {
      console.log(chalk.blue('No webhooks need fixing'));
      return [];
    }

    console.log(chalk.blue(`\n🔧 Fixing ${invalidWebhooks.length} invalid webhooks...\n`));

    const fixed = [];
    const failed = [];
    
    for (const { repo, webhook, issues } of invalidWebhooks) {
      const spinner = ora(`Fixing webhook for ${repo.full_name}...`).start();
      
      try {
        const updateConfig = {
          active: true,
          events: [
            'push', 'pull_request', 'issues', 'issue_comment',
            'pull_request_review', 'pull_request_review_comment',
            'release', 'workflow_run', 'check_run', 'check_suite',
            'deployment', 'deployment_status', 'fork', 'star',
            'watch', 'create', 'delete', 'repository',
            'member', 'team', 'organization', 'public',
            'gollum', 'commit_comment', 'discussion',
            'discussion_comment', 'security_advisory'
          ],
          config: {
            url: this.webhookUrl,
            content_type: 'json',
            insecure_ssl: '0'
          }
        };

        // Add secret if configured
        const secret = this.config.github.secret;
        if (secret) {
          updateConfig.config.secret = secret;
        }

        const response = await fetch(`${this.baseUrl}/repos/${repo.full_name}/hooks/${webhook.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'webhook-gateway'
          },
          body: JSON.stringify(updateConfig)
        });

        if (response.ok) {
          const updatedWebhook = await response.json();
          fixed.push({ repo, webhook: updatedWebhook });
          spinner.succeed(chalk.green(`✓ Fixed webhook for ${repo.full_name}`));
        } else {
          const error = await response.text();
          failed.push({ repo, error });
          spinner.fail(chalk.red(`✗ Failed to fix webhook for ${repo.full_name}: ${error}`));
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 150));
        
      } catch (error) {
        failed.push({ repo, error: error.message });
        spinner.fail(chalk.red(`✗ Error fixing webhook for ${repo.full_name}: ${error.message}`));
      }
    }

    console.log(chalk.blue('\n📊 Webhook Fix Summary:'));
    console.log(chalk.green(`   ✓ Fixed: ${fixed.length}`));
    console.log(chalk.red(`   ✗ Failed: ${failed.length}`));

    return { fixed, failed };
  }

  async testWebhook(repository, webhookId) {
    try {
      const response = await fetch(`${this.baseUrl}/repos/${repository.full_name}/hooks/${webhookId}/pings`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'webhook-gateway'
        }
      });

      return {
        success: response.ok,
        status: response.status,
        error: response.ok ? null : await response.text()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getWebhookDeliveries(repository, webhookId, limit = 10) {
    try {
      const response = await fetch(`${this.baseUrl}/repos/${repository.full_name}/hooks/${webhookId}/deliveries?per_page=${limit}`, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'webhook-gateway'
        }
      });

      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error(`Failed to get webhook deliveries: ${error.message}`);
      return [];
    }
  }

  async setupAllWebhooks() {
    try {
      console.log(chalk.blue('🐙 Starting GitHub webhook setup...\n'));

      // Discover repositories
      const resources = await this.discoverResources();
      
      if (resources.repositories.length === 0) {
        console.log(chalk.yellow('No repositories found'));
        return { success: true, summary: 'No repositories to configure' };
      }

      // Validate existing webhooks
      const validation = await this.validateWebhooks(resources.repositories);

      // Create missing webhooks
      let createResults = { created: [], failed: [] };
      if (validation.missing.length > 0) {
        createResults = await this.createWebhooks(validation.missing);
      }

      // Fix invalid webhooks
      let fixResults = { fixed: [], failed: [] };
      if (validation.invalid.length > 0) {
        fixResults = await this.fixWebhooks(validation.invalid);
      }

      // Generate summary
      const summary = {
        total_repositories: resources.repositories.length,
        valid_webhooks: validation.valid.length,
        created_webhooks: createResults.created.length,
        fixed_webhooks: fixResults.fixed.length,
        failed_operations: createResults.failed.length + fixResults.failed.length,
        organizations: resources.organizations
      };

      console.log(chalk.blue('\n🎯 GitHub Setup Complete!'));
      console.log(chalk.green(`   ✅ Total repositories: ${summary.total_repositories}`));
      console.log(chalk.green(`   ✅ Valid webhooks: ${summary.valid_webhooks}`));
      console.log(chalk.green(`   ✅ Created webhooks: ${summary.created_webhooks}`));
      console.log(chalk.green(`   ✅ Fixed webhooks: ${summary.fixed_webhooks}`));
      
      if (summary.failed_operations > 0) {
        console.log(chalk.red(`   ❌ Failed operations: ${summary.failed_operations}`));
      }

      return {
        success: summary.failed_operations === 0,
        summary,
        details: {
          validation,
          createResults,
          fixResults
        }
      };

    } catch (error) {
      console.error(chalk.red(`GitHub webhook setup failed: ${error.message}`));
      return {
        success: false,
        error: error.message
      };
    }
  }
}