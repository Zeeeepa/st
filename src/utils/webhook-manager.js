/**
 * Webhook Manager
 * Manages webhook configurations and validates webhook endpoints
 */

import fetch from 'node-fetch';

export class WebhookManager {
    constructor() {
        this.githubToken = process.env.GITHUB_TOKEN;
        this.linearApiKey = process.env.LINEAR_API_KEY;
        this.slackBotToken = process.env.SLACK_BOT_TOKEN;
        this.webhookBaseUrl = process.env.CLOUDFLARE_WORKER_URL || `http://localhost:${process.env.SERVER_PORT || 3000}`;
    }

    /**
     * Setup webhooks for all configured services
     */
    async setupWebhooks(source, options = {}) {
        const results = {
            source,
            success: false,
            webhooks: [],
            errors: []
        };

        try {
            switch (source) {
                case 'github':
                    results.webhooks = await this.setupGitHubWebhooks(options.repositories);
                    break;
                case 'linear':
                    results.webhooks = await this.setupLinearWebhooks(options.teams);
                    break;
                case 'slack':
                    results.webhooks = await this.setupSlackWebhooks();
                    break;
                case 'all':
                    const githubResult = await this.setupGitHubWebhooks(options.repositories);
                    const linearResult = await this.setupLinearWebhooks(options.teams);
                    const slackResult = await this.setupSlackWebhooks();
                    
                    results.webhooks = [
                        ...githubResult,
                        ...linearResult,
                        ...slackResult
                    ];
                    break;
                default:
                    throw new Error(`Unsupported webhook source: ${source}`);
            }

            results.success = true;
            return results;

        } catch (error) {
            results.errors.push(error.message);
            return results;
        }
    }

    /**
     * Setup GitHub webhooks for repositories
     */
    async setupGitHubWebhooks(repositories = []) {
        if (!this.githubToken) {
            throw new Error('GitHub token not configured');
        }

        const webhooks = [];
        const webhookUrl = `${this.webhookBaseUrl}/webhook/github`;

        try {
            // Get all repositories if none specified
            if (repositories.length === 0) {
                repositories = await this.getGitHubRepositories();
            }

            for (const repo of repositories) {
                try {
                    const webhook = await this.createGitHubWebhook(repo, webhookUrl);
                    webhooks.push({
                        repository: repo,
                        webhookId: webhook.id,
                        url: webhook.config.url,
                        events: webhook.events,
                        active: webhook.active,
                        status: 'created'
                    });
                } catch (error) {
                    webhooks.push({
                        repository: repo,
                        status: 'failed',
                        error: error.message
                    });
                }
            }

            return webhooks;

        } catch (error) {
            throw new Error(`GitHub webhook setup failed: ${error.message}`);
        }
    }

    /**
     * Setup Linear webhooks for teams
     */
    async setupLinearWebhooks(teams = []) {
        if (!this.linearApiKey) {
            throw new Error('Linear API key not configured');
        }

        const webhooks = [];
        const webhookUrl = `${this.webhookBaseUrl}/webhook/linear`;

        try {
            // Get all teams if none specified
            if (teams.length === 0) {
                teams = await this.getLinearTeams();
            }

            for (const team of teams) {
                try {
                    const webhook = await this.createLinearWebhook(team, webhookUrl);
                    webhooks.push({
                        team: team,
                        webhookId: webhook.id,
                        url: webhook.url,
                        events: ['Issue', 'Comment', 'Project'],
                        active: true,
                        status: 'created'
                    });
                } catch (error) {
                    webhooks.push({
                        team: team,
                        status: 'failed',
                        error: error.message
                    });
                }
            }

            return webhooks;

        } catch (error) {
            throw new Error(`Linear webhook setup failed: ${error.message}`);
        }
    }

    /**
     * Setup Slack webhooks (manual configuration required)
     */
    async setupSlackWebhooks() {
        const webhookUrl = `${this.webhookBaseUrl}/webhook/slack`;
        
        return [{
            service: 'slack',
            url: webhookUrl,
            status: 'manual_configuration_required',
            instructions: [
                '1. Go to your Slack app settings at https://api.slack.com/apps',
                '2. Navigate to Event Subscriptions',
                `3. Add Request URL: ${webhookUrl}`,
                '4. Subscribe to the events you want to track',
                '5. Save changes and reinstall the app'
            ]
        }];
    }

    /**
     * Get GitHub repositories
     */
    async getGitHubRepositories() {
        const response = await fetch('https://api.github.com/user/repos?per_page=100', {
            headers: {
                'Authorization': `token ${this.githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.statusText}`);
        }

        const repos = await response.json();
        return repos.map(repo => repo.full_name);
    }

    /**
     * Create GitHub webhook
     */
    async createGitHubWebhook(repository, webhookUrl) {
        const [owner, repo] = repository.split('/');
        
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${this.githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: 'web',
                active: true,
                events: ['*'], // All events
                config: {
                    url: webhookUrl,
                    content_type: 'json',
                    secret: process.env.GITHUB_WEBHOOK_SECRET,
                    insecure_ssl: '0'
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`GitHub webhook creation failed: ${error.message}`);
        }

        return await response.json();
    }

    /**
     * Get Linear teams
     */
    async getLinearTeams() {
        const query = `
            query {
                teams {
                    nodes {
                        id
                        name
                        key
                    }
                }
            }
        `;

        const response = await fetch('https://api.linear.app/graphql', {
            method: 'POST',
            headers: {
                'Authorization': this.linearApiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            throw new Error(`Linear API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.data.teams.nodes;
    }

    /**
     * Create Linear webhook
     */
    async createLinearWebhook(team, webhookUrl) {
        const mutation = `
            mutation WebhookCreate($input: WebhookCreateInput!) {
                webhookCreate(input: $input) {
                    success
                    webhook {
                        id
                        url
                        enabled
                    }
                }
            }
        `;

        const variables = {
            input: {
                url: webhookUrl,
                teamId: team.id,
                resourceTypes: ['Issue', 'Comment', 'Project'],
                secret: process.env.LINEAR_WEBHOOK_SECRET
            }
        };

        const response = await fetch('https://api.linear.app/graphql', {
            method: 'POST',
            headers: {
                'Authorization': this.linearApiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: mutation, variables })
        });

        if (!response.ok) {
            throw new Error(`Linear API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.data.webhookCreate.success) {
            throw new Error('Linear webhook creation failed');
        }

        return data.data.webhookCreate.webhook;
    }

    /**
     * Validate all webhook endpoints
     */
    async validateAllWebhooks() {
        const results = {
            github: await this.validateWebhookEndpoint('/webhook/github'),
            linear: await this.validateWebhookEndpoint('/webhook/linear'),
            slack: await this.validateWebhookEndpoint('/webhook/slack'),
            health: await this.validateWebhookEndpoint('/health')
        };

        return {
            timestamp: new Date().toISOString(),
            baseUrl: this.webhookBaseUrl,
            results,
            allValid: Object.values(results).every(r => r.status === 'ok')
        };
    }

    /**
     * Validate webhook endpoint
     */
    async validateWebhookEndpoint(endpoint) {
        try {
            const url = `${this.webhookBaseUrl}${endpoint}`;
            const response = await fetch(url, {
                method: endpoint === '/health' ? 'GET' : 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: endpoint !== '/health' ? JSON.stringify({ test: true }) : undefined
            });

            return {
                endpoint,
                url,
                status: response.ok ? 'ok' : 'error',
                statusCode: response.status,
                statusText: response.statusText
            };

        } catch (error) {
            return {
                endpoint,
                url: `${this.webhookBaseUrl}${endpoint}`,
                status: 'error',
                error: error.message
            };
        }
    }

    /**
     * List configured webhooks
     */
    async listWebhooks() {
        const webhooks = {
            github: [],
            linear: [],
            slack: []
        };

        try {
            // Get GitHub webhooks
            if (this.githubToken) {
                const repos = await this.getGitHubRepositories();
                for (const repo of repos.slice(0, 5)) { // Limit to first 5 for demo
                    try {
                        const [owner, repoName] = repo.split('/');
                        const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/hooks`, {
                            headers: {
                                'Authorization': `token ${this.githubToken}`,
                                'Accept': 'application/vnd.github.v3+json'
                            }
                        });

                        if (response.ok) {
                            const hooks = await response.json();
                            webhooks.github.push({
                                repository: repo,
                                hooks: hooks.map(h => ({
                                    id: h.id,
                                    url: h.config.url,
                                    events: h.events,
                                    active: h.active
                                }))
                            });
                        }
                    } catch (error) {
                        console.error(`Failed to get webhooks for ${repo}:`, error);
                    }
                }
            }

            // Get Linear webhooks
            if (this.linearApiKey) {
                const query = `
                    query {
                        webhooks {
                            nodes {
                                id
                                url
                                enabled
                                team {
                                    name
                                }
                            }
                        }
                    }
                `;

                const response = await fetch('https://api.linear.app/graphql', {
                    method: 'POST',
                    headers: {
                        'Authorization': this.linearApiKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ query })
                });

                if (response.ok) {
                    const data = await response.json();
                    webhooks.linear = data.data.webhooks.nodes;
                }
            }

            // Slack webhooks (manual configuration)
            webhooks.slack = [{
                note: 'Slack webhooks require manual configuration in your Slack app settings',
                expectedUrl: `${this.webhookBaseUrl}/webhook/slack`
            }];

        } catch (error) {
            console.error('Error listing webhooks:', error);
        }

        return webhooks;
    }
}

