/**
 * Event Processor
 * Processes and stores webhook events from GitHub, Linear, and Slack
 */

import { v4 as uuidv4 } from 'uuid';

export class EventProcessor {
    constructor(database) {
        this.db = database;
        this.batchEnabled = process.env.ENABLE_BATCHING === 'true';
        this.batchSize = parseInt(process.env.BATCH_SIZE) || 100;
        this.batchInterval = parseInt(process.env.BATCH_INTERVAL) || 5000;
        
        this.eventBatch = [];
        this.batchTimer = null;
        
        if (this.batchEnabled) {
            this.startBatchProcessor();
        }
    }

    /**
     * Process GitHub webhook event
     */
    async processGitHubEvent(eventData) {
        const { eventType, deliveryId, payload, headers, signature, requestId } = eventData;
        
        try {
            const eventId = deliveryId || uuidv4();
            
            // Extract relevant data from payload
            const extractedData = this.extractGitHubData(eventType, payload);
            
            const githubEvent = {
                eventId,
                eventType,
                action: payload.action,
                repositoryName: payload.repository?.name,
                repositoryFullName: payload.repository?.full_name,
                repositoryId: payload.repository?.id,
                senderLogin: payload.sender?.login,
                senderId: payload.sender?.id,
                organization: payload.organization?.login,
                ...extractedData,
                payload,
                headers,
                signature,
                deliveryId,
                eventTimestamp: new Date()
            };

            if (this.batchEnabled) {
                this.addToBatch('github', githubEvent);
            } else {
                await this.db.insertGitHubEvent(githubEvent);
            }

            // Log webhook delivery
            await this.logWebhookDelivery({
                deliveryId: eventId,
                webhookSource: 'github',
                eventType,
                status: 'delivered',
                requestHeaders: headers,
                requestBody: payload
            });

            return { eventId, status: 'processed' };

        } catch (error) {
            console.error('GitHub event processing error:', error);
            
            // Log failed delivery
            await this.logWebhookDelivery({
                deliveryId: deliveryId || uuidv4(),
                webhookSource: 'github',
                eventType,
                status: 'failed',
                errorMessage: error.message,
                requestHeaders: headers,
                requestBody: payload
            });

            throw error;
        }
    }

    /**
     * Process Linear webhook event
     */
    async processLinearEvent(eventData) {
        const { payload, headers, signature, requestId } = eventData;
        
        try {
            const eventId = payload.webhookId || uuidv4();
            const eventType = payload.type;
            const action = payload.action;
            
            // Extract relevant data from payload
            const extractedData = this.extractLinearData(payload);
            
            const linearEvent = {
                eventId,
                eventType,
                action,
                ...extractedData,
                payload,
                headers,
                signature,
                deliveryId: eventId,
                eventTimestamp: new Date(payload.createdAt || Date.now())
            };

            if (this.batchEnabled) {
                this.addToBatch('linear', linearEvent);
            } else {
                await this.db.insertLinearEvent(linearEvent);
            }

            // Log webhook delivery
            await this.logWebhookDelivery({
                deliveryId: eventId,
                webhookSource: 'linear',
                eventType,
                status: 'delivered',
                requestHeaders: headers,
                requestBody: payload
            });

            return { eventId, status: 'processed' };

        } catch (error) {
            console.error('Linear event processing error:', error);
            
            // Log failed delivery
            await this.logWebhookDelivery({
                deliveryId: payload.webhookId || uuidv4(),
                webhookSource: 'linear',
                eventType: payload.type,
                status: 'failed',
                errorMessage: error.message,
                requestHeaders: headers,
                requestBody: payload
            });

            throw error;
        }
    }

    /**
     * Process Slack webhook event
     */
    async processSlackEvent(eventData) {
        const { payload, headers, signature, requestId } = eventData;
        
        try {
            const eventId = payload.event_id || uuidv4();
            const eventType = payload.event?.type || payload.type;
            
            // Extract relevant data from payload
            const extractedData = this.extractSlackData(payload);
            
            const slackEvent = {
                eventId,
                eventType,
                eventSubtype: payload.event?.subtype,
                ...extractedData,
                payload,
                headers,
                signature,
                eventTimestamp: new Date(payload.event?.ts ? payload.event.ts * 1000 : Date.now())
            };

            if (this.batchEnabled) {
                this.addToBatch('slack', slackEvent);
            } else {
                await this.db.insertSlackEvent(slackEvent);
            }

            // Log webhook delivery
            await this.logWebhookDelivery({
                deliveryId: eventId,
                webhookSource: 'slack',
                eventType,
                status: 'delivered',
                requestHeaders: headers,
                requestBody: payload
            });

            return { eventId, status: 'processed' };

        } catch (error) {
            console.error('Slack event processing error:', error);
            
            // Log failed delivery
            await this.logWebhookDelivery({
                deliveryId: payload.event_id || uuidv4(),
                webhookSource: 'slack',
                eventType: payload.event?.type || payload.type,
                status: 'failed',
                errorMessage: error.message,
                requestHeaders: headers,
                requestBody: payload
            });

            throw error;
        }
    }

    /**
     * Extract GitHub-specific data from payload
     */
    extractGitHubData(eventType, payload) {
        const data = {};

        switch (eventType) {
            case 'pull_request':
                data.pullRequestNumber = payload.pull_request?.number;
                data.pullRequestTitle = payload.pull_request?.title;
                data.pullRequestState = payload.pull_request?.state;
                break;

            case 'issues':
                data.issueNumber = payload.issue?.number;
                data.issueTitle = payload.issue?.title;
                data.issueState = payload.issue?.state;
                break;

            case 'push':
                data.commitSha = payload.head_commit?.id;
                data.commitMessage = payload.head_commit?.message;
                data.branchName = payload.ref?.replace('refs/heads/', '');
                break;

            case 'create':
            case 'delete':
                if (payload.ref_type === 'tag') {
                    data.tagName = payload.ref;
                } else if (payload.ref_type === 'branch') {
                    data.branchName = payload.ref;
                }
                break;

            case 'release':
                data.tagName = payload.release?.tag_name;
                break;
        }

        return data;
    }

    /**
     * Extract Linear-specific data from payload
     */
    extractLinearData(payload) {
        const data = {};

        if (payload.data) {
            const item = payload.data;

            // Team data
            if (item.team) {
                data.teamId = item.team.id;
                data.teamName = item.team.name;
            }

            // Project data
            if (item.project) {
                data.projectId = item.project.id;
                data.projectName = item.project.name;
            }

            // Issue data
            if (item.id && payload.type === 'Issue') {
                data.issueId = item.id;
                data.issueIdentifier = item.identifier;
                data.issueTitle = item.title;
                data.issueState = item.state?.name;
                data.issuePriority = item.priority;
                
                if (item.assignee) {
                    data.assigneeId = item.assignee.id;
                    data.assigneeName = item.assignee.name;
                }
                
                if (item.creator) {
                    data.creatorId = item.creator.id;
                    data.creatorName = item.creator.name;
                }
            }

            // Comment data
            if (payload.type === 'Comment') {
                data.commentId = item.id;
                data.commentBody = item.body;
                
                if (item.issue) {
                    data.issueId = item.issue.id;
                    data.issueIdentifier = item.issue.identifier;
                    data.issueTitle = item.issue.title;
                }
                
                if (item.user) {
                    data.creatorId = item.user.id;
                    data.creatorName = item.user.name;
                }
            }
        }

        return data;
    }

    /**
     * Extract Slack-specific data from payload
     */
    extractSlackData(payload) {
        const data = {};

        if (payload.team_id) {
            data.teamId = payload.team_id;
        }

        if (payload.team_domain) {
            data.teamDomain = payload.team_domain;
        }

        if (payload.event) {
            const event = payload.event;

            // Channel data
            if (event.channel) {
                data.channelId = event.channel;
            }
            if (event.channel_type) {
                data.channelType = event.channel_type;
            }

            // User data
            if (event.user) {
                data.userId = event.user;
            }
            if (event.bot_id) {
                data.botId = event.bot_id;
            }

            // Message data
            if (event.text) {
                data.messageText = event.text;
            }
            if (event.ts) {
                data.messageTs = event.ts;
            }
            if (event.thread_ts) {
                data.threadTs = event.thread_ts;
            }

            // File data
            if (event.file) {
                data.fileId = event.file.id;
                data.fileName = event.file.name;
                data.fileType = event.file.filetype;
            }
        }

        return data;
    }

    /**
     * Log webhook delivery
     */
    async logWebhookDelivery(deliveryData) {
        try {
            await this.db.insertWebhookDelivery(deliveryData);
        } catch (error) {
            console.error('Failed to log webhook delivery:', error);
        }
    }

    /**
     * Add event to batch for processing
     */
    addToBatch(source, eventData) {
        this.eventBatch.push({ source, data: eventData });
        
        if (this.eventBatch.length >= this.batchSize) {
            this.processBatch();
        }
    }

    /**
     * Start batch processor
     */
    startBatchProcessor() {
        this.batchTimer = setInterval(() => {
            if (this.eventBatch.length > 0) {
                this.processBatch();
            }
        }, this.batchInterval);
    }

    /**
     * Process batch of events
     */
    async processBatch() {
        if (this.eventBatch.length === 0) return;

        const batch = [...this.eventBatch];
        this.eventBatch = [];

        try {
            await this.db.transaction(async (client) => {
                for (const { source, data } of batch) {
                    switch (source) {
                        case 'github':
                            await this.db.insertGitHubEvent(data);
                            break;
                        case 'linear':
                            await this.db.insertLinearEvent(data);
                            break;
                        case 'slack':
                            await this.db.insertSlackEvent(data);
                            break;
                    }
                }
            });

            console.log(`✅ Processed batch of ${batch.length} events`);

        } catch (error) {
            console.error('❌ Batch processing failed:', error);
            
            // Re-add failed events to batch for retry
            this.eventBatch.unshift(...batch);
        }
    }

    /**
     * Stop batch processor
     */
    stopBatchProcessor() {
        if (this.batchTimer) {
            clearInterval(this.batchTimer);
            this.batchTimer = null;
        }

        // Process remaining events
        if (this.eventBatch.length > 0) {
            this.processBatch();
        }
    }
}

