/**
 * Webhook Signature Validator
 * Validates webhook signatures for GitHub, Linear, and Slack
 */

import crypto from 'crypto';

export class WebhookValidator {
    constructor() {
        this.githubSecret = process.env.GITHUB_WEBHOOK_SECRET;
        this.linearSecret = process.env.LINEAR_WEBHOOK_SECRET;
        this.slackSecret = process.env.SLACK_SIGNING_SECRET;
    }

    /**
     * Validate GitHub webhook signature
     * @param {Buffer} payload - Raw request body
     * @param {string} signature - X-Hub-Signature-256 header
     * @returns {boolean}
     */
    validateGitHubSignature(payload, signature) {
        if (!this.githubSecret || !signature) {
            console.warn('GitHub webhook secret or signature missing');
            return false;
        }

        const expectedSignature = 'sha256=' + crypto
            .createHmac('sha256', this.githubSecret)
            .update(payload)
            .digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }

    /**
     * Validate Linear webhook signature
     * @param {Buffer} payload - Raw request body
     * @param {string} signature - Linear-Signature header
     * @returns {boolean}
     */
    validateLinearSignature(payload, signature) {
        if (!this.linearSecret || !signature) {
            console.warn('Linear webhook secret or signature missing');
            return false;
        }

        const expectedSignature = crypto
            .createHmac('sha256', this.linearSecret)
            .update(payload)
            .digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }

    /**
     * Validate Slack webhook signature
     * @param {Buffer} payload - Raw request body
     * @param {string} signature - X-Slack-Signature header
     * @param {string} timestamp - X-Slack-Request-Timestamp header
     * @returns {boolean}
     */
    validateSlackSignature(payload, signature, timestamp) {
        if (!this.slackSecret || !signature || !timestamp) {
            console.warn('Slack webhook secret, signature, or timestamp missing');
            return false;
        }

        // Check if timestamp is within 5 minutes
        const currentTime = Math.floor(Date.now() / 1000);
        const requestTime = parseInt(timestamp);
        
        if (Math.abs(currentTime - requestTime) > 300) {
            console.warn('Slack webhook timestamp too old');
            return false;
        }

        const baseString = `v0:${timestamp}:${payload}`;
        const expectedSignature = 'v0=' + crypto
            .createHmac('sha256', this.slackSecret)
            .update(baseString)
            .digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }

    /**
     * Generate webhook signature for testing
     * @param {string} source - 'github', 'linear', or 'slack'
     * @param {Buffer|string} payload - Request payload
     * @param {string} timestamp - Timestamp (for Slack)
     * @returns {string}
     */
    generateSignature(source, payload, timestamp = null) {
        switch (source) {
            case 'github':
                if (!this.githubSecret) throw new Error('GitHub webhook secret not configured');
                return 'sha256=' + crypto
                    .createHmac('sha256', this.githubSecret)
                    .update(payload)
                    .digest('hex');

            case 'linear':
                if (!this.linearSecret) throw new Error('Linear webhook secret not configured');
                return crypto
                    .createHmac('sha256', this.linearSecret)
                    .update(payload)
                    .digest('hex');

            case 'slack':
                if (!this.slackSecret) throw new Error('Slack signing secret not configured');
                if (!timestamp) timestamp = Math.floor(Date.now() / 1000);
                const baseString = `v0:${timestamp}:${payload}`;
                return 'v0=' + crypto
                    .createHmac('sha256', this.slackSecret)
                    .update(baseString)
                    .digest('hex');

            default:
                throw new Error(`Unsupported webhook source: ${source}`);
        }
    }

    /**
     * Validate webhook configuration
     * @returns {object} Validation results
     */
    validateConfiguration() {
        const results = {
            github: {
                configured: !!this.githubSecret,
                valid: false
            },
            linear: {
                configured: !!this.linearSecret,
                valid: false
            },
            slack: {
                configured: !!this.slackSecret,
                valid: false
            }
        };

        // Test GitHub secret
        if (this.githubSecret) {
            try {
                const testPayload = Buffer.from('test');
                const signature = this.generateSignature('github', testPayload);
                results.github.valid = this.validateGitHubSignature(testPayload, signature);
            } catch (error) {
                results.github.error = error.message;
            }
        }

        // Test Linear secret
        if (this.linearSecret) {
            try {
                const testPayload = Buffer.from('test');
                const signature = this.generateSignature('linear', testPayload);
                results.linear.valid = this.validateLinearSignature(testPayload, signature);
            } catch (error) {
                results.linear.error = error.message;
            }
        }

        // Test Slack secret
        if (this.slackSecret) {
            try {
                const testPayload = Buffer.from('test');
                const timestamp = Math.floor(Date.now() / 1000).toString();
                const signature = this.generateSignature('slack', testPayload, timestamp);
                results.slack.valid = this.validateSlackSignature(testPayload, signature, timestamp);
            } catch (error) {
                results.slack.error = error.message;
            }
        }

        return results;
    }
}

