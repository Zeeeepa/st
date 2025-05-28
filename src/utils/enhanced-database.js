/**
 * Enhanced Database Manager
 * Comprehensive PostgreSQL integration for event processing
 */

import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

const { Pool } = pg;

export class DatabaseManager {
    constructor() {
        this.pool = null;
        this.config = {
            host: process.env.POSTGRES_HOST || 'localhost',
            port: parseInt(process.env.POSTGRES_PORT) || 5432,
            database: process.env.POSTGRES_DB || 'events_db',
            user: process.env.POSTGRES_USER || 'events_user',
            password: process.env.POSTGRES_PASSWORD,
            ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
            max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
            idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
            connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
        };
    }

    async initialize() {
        try {
            this.pool = new Pool(this.config);
            
            // Test connection
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            
            console.log('✅ Database connection pool initialized');
            return true;
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        }
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
            console.log('✅ Database connection pool closed');
        }
    }

    async query(text, params = []) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(text, params);
            return result;
        } finally {
            client.release();
        }
    }

    async transaction(callback) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // GitHub Events
    async insertGitHubEvent(eventData) {
        const {
            eventId,
            eventType,
            action,
            repositoryName,
            repositoryFullName,
            repositoryId,
            senderLogin,
            senderId,
            organization,
            pullRequestNumber,
            pullRequestTitle,
            pullRequestState,
            issueNumber,
            issueTitle,
            issueState,
            commitSha,
            commitMessage,
            branchName,
            tagName,
            payload,
            headers,
            signature,
            deliveryId,
            eventTimestamp
        } = eventData;

        const query = `
            INSERT INTO github_events (
                event_id, event_type, action, repository_name, repository_full_name,
                repository_id, sender_login, sender_id, organization,
                pull_request_number, pull_request_title, pull_request_state,
                issue_number, issue_title, issue_state,
                commit_sha, commit_message, branch_name, tag_name,
                payload, headers, signature, delivery_id, event_timestamp
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19,
                $20, $21, $22, $23, $24
            ) RETURNING id
        `;

        const values = [
            eventId, eventType, action, repositoryName, repositoryFullName,
            repositoryId, senderLogin, senderId, organization,
            pullRequestNumber, pullRequestTitle, pullRequestState,
            issueNumber, issueTitle, issueState,
            commitSha, commitMessage, branchName, tagName,
            JSON.stringify(payload), JSON.stringify(headers), signature, deliveryId, eventTimestamp
        ];

        const result = await this.query(query, values);
        return result.rows[0];
    }

    // Linear Events
    async insertLinearEvent(eventData) {
        const {
            eventId,
            eventType,
            action,
            teamId,
            teamName,
            projectId,
            projectName,
            issueId,
            issueIdentifier,
            issueTitle,
            issueState,
            issuePriority,
            assigneeId,
            assigneeName,
            creatorId,
            creatorName,
            commentId,
            commentBody,
            payload,
            headers,
            signature,
            deliveryId,
            eventTimestamp
        } = eventData;

        const query = `
            INSERT INTO linear_events (
                event_id, event_type, action, team_id, team_name,
                project_id, project_name, issue_id, issue_identifier,
                issue_title, issue_state, issue_priority,
                assignee_id, assignee_name, creator_id, creator_name,
                comment_id, comment_body,
                payload, headers, signature, delivery_id, event_timestamp
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18,
                $19, $20, $21, $22, $23
            ) RETURNING id
        `;

        const values = [
            eventId, eventType, action, teamId, teamName,
            projectId, projectName, issueId, issueIdentifier,
            issueTitle, issueState, issuePriority,
            assigneeId, assigneeName, creatorId, creatorName,
            commentId, commentBody,
            JSON.stringify(payload), JSON.stringify(headers), signature, deliveryId, eventTimestamp
        ];

        const result = await this.query(query, values);
        return result.rows[0];
    }

    // Slack Events
    async insertSlackEvent(eventData) {
        const {
            eventId,
            eventType,
            eventSubtype,
            teamId,
            teamDomain,
            channelId,
            channelName,
            channelType,
            userId,
            userName,
            botId,
            messageText,
            messageTs,
            threadTs,
            fileId,
            fileName,
            fileType,
            payload,
            headers,
            signature,
            eventTimestamp
        } = eventData;

        const query = `
            INSERT INTO slack_events (
                event_id, event_type, event_subtype, team_id, team_domain,
                channel_id, channel_name, channel_type, user_id, user_name,
                bot_id, message_text, message_ts, thread_ts,
                file_id, file_name, file_type,
                payload, headers, signature, event_timestamp
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17,
                $18, $19, $20, $21
            ) RETURNING id
        `;

        const values = [
            eventId, eventType, eventSubtype, teamId, teamDomain,
            channelId, channelName, channelType, userId, userName,
            botId, messageText, messageTs, threadTs,
            fileId, fileName, fileType,
            JSON.stringify(payload), JSON.stringify(headers), signature, eventTimestamp
        ];

        const result = await this.query(query, values);
        return result.rows[0];
    }

    // Webhook Deliveries
    async insertWebhookDelivery(deliveryData) {
        const {
            deliveryId,
            webhookSource,
            eventType,
            targetUrl,
            requestHeaders,
            requestBody,
            requestMethod = 'POST',
            responseStatus,
            responseHeaders,
            responseBody,
            responseTimeMs,
            status = 'pending',
            attemptCount = 1,
            maxAttempts = 3,
            nextRetryAt,
            errorMessage,
            errorCode
        } = deliveryData;

        const query = `
            INSERT INTO webhook_deliveries (
                delivery_id, webhook_source, event_type, target_url,
                request_headers, request_body, request_method,
                response_status, response_headers, response_body, response_time_ms,
                status, attempt_count, max_attempts, next_retry_at,
                error_message, error_code
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17
            ) RETURNING id
        `;

        const values = [
            deliveryId, webhookSource, eventType, targetUrl,
            JSON.stringify(requestHeaders), JSON.stringify(requestBody), requestMethod,
            responseStatus, JSON.stringify(responseHeaders), responseBody, responseTimeMs,
            status, attemptCount, maxAttempts, nextRetryAt,
            errorMessage, errorCode
        ];

        const result = await this.query(query, values);
        return result.rows[0];
    }

    // Webhook Configurations
    async insertWebhookConfiguration(configData) {
        const {
            source,
            webhookId,
            webhookUrl,
            secret,
            events,
            active = true,
            repositoryId,
            repositoryName,
            teamId,
            teamName,
            status = 'active'
        } = configData;

        const query = `
            INSERT INTO webhook_configurations (
                source, webhook_id, webhook_url, secret, events,
                active, repository_id, repository_name, team_id, team_name, status
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
            ) RETURNING id
        `;

        const values = [
            source, webhookId, webhookUrl, secret, events,
            active, repositoryId, repositoryName, teamId, teamName, status
        ];

        const result = await this.query(query, values);
        return result.rows[0];
    }

    // Query Events
    async getEvents(options = {}) {
        const {
            source,
            type,
            limit = 100,
            offset = 0,
            startDate,
            endDate,
            status
        } = options;

        let query = '';
        let values = [];
        let paramCount = 0;

        if (source === 'github' || !source) {
            query += `
                SELECT 'github' as source, event_type, repository_full_name as identifier,
                       sender_login as actor, received_at, status, payload
                FROM github_events
                WHERE 1=1
            `;

            if (type) {
                query += ` AND event_type = $${++paramCount}`;
                values.push(type);
            }
            if (startDate) {
                query += ` AND received_at >= $${++paramCount}`;
                values.push(startDate);
            }
            if (endDate) {
                query += ` AND received_at <= $${++paramCount}`;
                values.push(endDate);
            }
            if (status) {
                query += ` AND status = $${++paramCount}`;
                values.push(status);
            }
        }

        if (source === 'linear' || !source) {
            if (query) query += ' UNION ALL ';
            
            const linearParamOffset = paramCount;
            query += `
                SELECT 'linear' as source, event_type, 
                       COALESCE(issue_identifier, team_name) as identifier,
                       creator_name as actor, received_at, status, payload
                FROM linear_events
                WHERE 1=1
            `;

            if (type) {
                query += ` AND event_type = $${++paramCount}`;
                if (paramCount > linearParamOffset + 1) values.push(type);
            }
            if (startDate) {
                query += ` AND received_at >= $${++paramCount}`;
                if (paramCount > linearParamOffset + 1) values.push(startDate);
            }
            if (endDate) {
                query += ` AND received_at <= $${++paramCount}`;
                if (paramCount > linearParamOffset + 1) values.push(endDate);
            }
            if (status) {
                query += ` AND status = $${++paramCount}`;
                if (paramCount > linearParamOffset + 1) values.push(status);
            }
        }

        if (source === 'slack' || !source) {
            if (query) query += ' UNION ALL ';
            
            const slackParamOffset = paramCount;
            query += `
                SELECT 'slack' as source, event_type, channel_name as identifier,
                       user_name as actor, received_at, status, payload
                FROM slack_events
                WHERE 1=1
            `;

            if (type) {
                query += ` AND event_type = $${++paramCount}`;
                if (paramCount > slackParamOffset + 1) values.push(type);
            }
            if (startDate) {
                query += ` AND received_at >= $${++paramCount}`;
                if (paramCount > slackParamOffset + 1) values.push(startDate);
            }
            if (endDate) {
                query += ` AND received_at <= $${++paramCount}`;
                if (paramCount > slackParamOffset + 1) values.push(endDate);
            }
            if (status) {
                query += ` AND status = $${++paramCount}`;
                if (paramCount > slackParamOffset + 1) values.push(status);
            }
        }

        query += ` ORDER BY received_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
        values.push(limit, offset);

        const result = await this.query(query, values);
        return result.rows;
    }

    // Get Event Summary
    async getEventSummary(days = 7) {
        const query = `
            SELECT 
                DATE(received_at) as date,
                source,
                event_type,
                COUNT(*) as total_events,
                COUNT(*) FILTER (WHERE status = 'processed') as successful_events,
                COUNT(*) FILTER (WHERE status = 'failed') as failed_events
            FROM (
                SELECT 'github' as source, event_type, received_at, status FROM github_events
                WHERE received_at > CURRENT_TIMESTAMP - INTERVAL '${days} days'
                UNION ALL
                SELECT 'linear' as source, event_type, received_at, status FROM linear_events
                WHERE received_at > CURRENT_TIMESTAMP - INTERVAL '${days} days'
                UNION ALL
                SELECT 'slack' as source, event_type, received_at, status FROM slack_events
                WHERE received_at > CURRENT_TIMESTAMP - INTERVAL '${days} days'
            ) events
            GROUP BY DATE(received_at), source, event_type
            ORDER BY date DESC, source, event_type
        `;

        const result = await this.query(query);
        return result.rows;
    }

    // Health Check
    async healthCheck() {
        try {
            const result = await this.query('SELECT NOW() as timestamp, version() as version');
            return {
                status: 'healthy',
                database: 'connected',
                timestamp: result.rows[0].timestamp,
                version: result.rows[0].version
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                database: 'disconnected',
                error: error.message
            };
        }
    }

    // Get Database Statistics
    async getStatistics() {
        const queries = [
            'SELECT COUNT(*) as github_events FROM github_events',
            'SELECT COUNT(*) as linear_events FROM linear_events',
            'SELECT COUNT(*) as slack_events FROM slack_events',
            'SELECT COUNT(*) as webhook_deliveries FROM webhook_deliveries',
            'SELECT COUNT(*) as webhook_configurations FROM webhook_configurations'
        ];

        const results = await Promise.all(queries.map(query => this.query(query)));
        
        return {
            github_events: parseInt(results[0].rows[0].github_events),
            linear_events: parseInt(results[1].rows[0].linear_events),
            slack_events: parseInt(results[2].rows[0].slack_events),
            webhook_deliveries: parseInt(results[3].rows[0].webhook_deliveries),
            webhook_configurations: parseInt(results[4].rows[0].webhook_configurations)
        };
    }

    // Update Event Status
    async updateEventStatus(source, eventId, status, errorMessage = null) {
        const table = `${source}_events`;
        const query = `
            UPDATE ${table} 
            SET status = $1, error_message = $2, processed_at = CURRENT_TIMESTAMP
            WHERE event_id = $3
            RETURNING id
        `;

        const result = await this.query(query, [status, errorMessage, eventId]);
        return result.rows[0];
    }
}

