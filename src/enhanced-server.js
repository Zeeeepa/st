#!/usr/bin/env node

/**
 * Enhanced Event Processing Server
 * Comprehensive webhook gateway for GitHub, Linear, and Slack events
 * with PostgreSQL storage and Cloudflare tunnel integration
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import enhanced modules
import { DatabaseManager } from './utils/enhanced-database.js';
import { WebhookValidator } from './utils/webhook-validator.js';
import { EventProcessor } from './utils/event-processor.js';
import { WebhookManager } from './utils/webhook-manager.js';
import { MonitoringService } from './utils/monitoring-service.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EnhancedEventServer {
    constructor() {
        this.app = express();
        this.port = process.env.SERVER_PORT || 3000;
        this.db = new DatabaseManager();
        this.validator = new WebhookValidator();
        this.processor = new EventProcessor(this.db);
        this.webhookManager = new WebhookManager();
        this.monitoring = new MonitoringService(this.db);
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                },
            },
        }));

        // CORS configuration
        this.app.use(cors({
            origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-GitHub-Event', 'X-GitHub-Delivery', 'X-Hub-Signature-256', 'X-Slack-Signature', 'X-Slack-Request-Timestamp'],
        }));

        // Compression
        this.app.use(compression());

        // Rate limiting
        const limiter = rateLimit({
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'), // 1 minute
            max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // limit each IP to 1000 requests per windowMs
            message: {
                error: 'Too many requests from this IP, please try again later.',
                retryAfter: '60 seconds'
            },
            standardHeaders: true,
            legacyHeaders: false,
        });
        this.app.use(limiter);

        // Logging
        this.app.use(morgan('combined'));

        // Body parsing with size limits
        this.app.use(express.json({ 
            limit: '10mb',
            verify: (req, res, buf) => {
                req.rawBody = buf;
            }
        }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Request ID middleware
        this.app.use((req, res, next) => {
            req.id = uuidv4();
            res.setHeader('X-Request-ID', req.id);
            next();
        });
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', async (req, res) => {
            try {
                const health = await this.monitoring.getHealthStatus();
                res.status(health.status === 'healthy' ? 200 : 503).json(health);
            } catch (error) {
                res.status(503).json({
                    status: 'unhealthy',
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Metrics endpoint
        this.app.get('/metrics', async (req, res) => {
            try {
                const metrics = await this.monitoring.getMetrics();
                res.json(metrics);
            } catch (error) {
                res.status(500).json({
                    error: 'Failed to retrieve metrics',
                    message: error.message
                });
            }
        });

        // GitHub webhook endpoint
        this.app.post('/webhook/github', async (req, res) => {
            try {
                const eventType = req.headers['x-github-event'];
                const deliveryId = req.headers['x-github-delivery'];
                const signature = req.headers['x-hub-signature-256'];

                // Validate webhook signature
                if (!this.validator.validateGitHubSignature(req.rawBody, signature)) {
                    return res.status(401).json({ error: 'Invalid signature' });
                }

                // Process the event
                const result = await this.processor.processGitHubEvent({
                    eventType,
                    deliveryId,
                    payload: req.body,
                    headers: req.headers,
                    signature,
                    requestId: req.id
                });

                res.status(200).json({
                    success: true,
                    eventId: result.eventId,
                    message: 'Event processed successfully'
                });

            } catch (error) {
                console.error('GitHub webhook error:', error);
                res.status(500).json({
                    error: 'Failed to process GitHub webhook',
                    message: error.message,
                    requestId: req.id
                });
            }
        });

        // Linear webhook endpoint
        this.app.post('/webhook/linear', async (req, res) => {
            try {
                const signature = req.headers['linear-signature'];

                // Validate webhook signature
                if (!this.validator.validateLinearSignature(req.rawBody, signature)) {
                    return res.status(401).json({ error: 'Invalid signature' });
                }

                // Process the event
                const result = await this.processor.processLinearEvent({
                    payload: req.body,
                    headers: req.headers,
                    signature,
                    requestId: req.id
                });

                res.status(200).json({
                    success: true,
                    eventId: result.eventId,
                    message: 'Event processed successfully'
                });

            } catch (error) {
                console.error('Linear webhook error:', error);
                res.status(500).json({
                    error: 'Failed to process Linear webhook',
                    message: error.message,
                    requestId: req.id
                });
            }
        });

        // Slack webhook endpoint
        this.app.post('/webhook/slack', async (req, res) => {
            try {
                const signature = req.headers['x-slack-signature'];
                const timestamp = req.headers['x-slack-request-timestamp'];

                // Handle Slack URL verification
                if (req.body.type === 'url_verification') {
                    return res.json({ challenge: req.body.challenge });
                }

                // Validate webhook signature
                if (!this.validator.validateSlackSignature(req.rawBody, signature, timestamp)) {
                    return res.status(401).json({ error: 'Invalid signature' });
                }

                // Process the event
                const result = await this.processor.processSlackEvent({
                    payload: req.body,
                    headers: req.headers,
                    signature,
                    requestId: req.id
                });

                res.status(200).json({
                    success: true,
                    eventId: result.eventId,
                    message: 'Event processed successfully'
                });

            } catch (error) {
                console.error('Slack webhook error:', error);
                res.status(500).json({
                    error: 'Failed to process Slack webhook',
                    message: error.message,
                    requestId: req.id
                });
            }
        });

        // Webhook management endpoints
        this.app.get('/webhooks', async (req, res) => {
            try {
                const webhooks = await this.webhookManager.listWebhooks();
                res.json(webhooks);
            } catch (error) {
                res.status(500).json({
                    error: 'Failed to list webhooks',
                    message: error.message
                });
            }
        });

        this.app.post('/webhooks/setup', async (req, res) => {
            try {
                const { source, repositories, teams } = req.body;
                const result = await this.webhookManager.setupWebhooks(source, { repositories, teams });
                res.json(result);
            } catch (error) {
                res.status(500).json({
                    error: 'Failed to setup webhooks',
                    message: error.message
                });
            }
        });

        this.app.post('/webhooks/validate', async (req, res) => {
            try {
                const result = await this.webhookManager.validateAllWebhooks();
                res.json(result);
            } catch (error) {
                res.status(500).json({
                    error: 'Failed to validate webhooks',
                    message: error.message
                });
            }
        });

        // Event query endpoints
        this.app.get('/events', async (req, res) => {
            try {
                const { source, type, limit = 100, offset = 0, startDate, endDate } = req.query;
                const events = await this.db.getEvents({
                    source,
                    type,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    startDate,
                    endDate
                });
                res.json(events);
            } catch (error) {
                res.status(500).json({
                    error: 'Failed to retrieve events',
                    message: error.message
                });
            }
        });

        this.app.get('/events/summary', async (req, res) => {
            try {
                const { days = 7 } = req.query;
                const summary = await this.monitoring.getEventSummary(parseInt(days));
                res.json(summary);
            } catch (error) {
                res.status(500).json({
                    error: 'Failed to retrieve event summary',
                    message: error.message
                });
            }
        });

        // Database connection info for Codegen
        this.app.get('/codegen/connection-info', (req, res) => {
            const connectionInfo = {
                host: process.env.TUNNEL_URL,
                port: 5432,
                database: process.env.POSTGRES_DB,
                username: process.env.POSTGRES_CODEGEN_USER,
                ssl_mode: process.env.SSL_MODE || 'require',
                tables: [
                    'github_events',
                    'linear_events', 
                    'slack_events',
                    'webhook_deliveries',
                    'event_metadata',
                    'webhook_configurations'
                ],
                views: [
                    'recent_events',
                    'event_summary'
                ],
                note: 'Read-only access for Codegen integration'
            };
            
            res.json(connectionInfo);
        });

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                name: 'Enhanced Event Processing Server',
                version: '1.0.0',
                description: 'Comprehensive webhook gateway for GitHub, Linear, and Slack events',
                endpoints: {
                    health: '/health',
                    metrics: '/metrics',
                    webhooks: {
                        github: '/webhook/github',
                        linear: '/webhook/linear',
                        slack: '/webhook/slack'
                    },
                    management: {
                        list: '/webhooks',
                        setup: '/webhooks/setup',
                        validate: '/webhooks/validate'
                    },
                    events: {
                        list: '/events',
                        summary: '/events/summary'
                    },
                    codegen: '/codegen/connection-info'
                },
                timestamp: new Date().toISOString()
            });
        });
    }

    setupErrorHandling() {
        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                error: 'Not Found',
                message: `Route ${req.method} ${req.path} not found`,
                timestamp: new Date().toISOString()
            });
        });

        // Global error handler
        this.app.use((error, req, res, next) => {
            console.error('Unhandled error:', error);
            
            res.status(error.status || 500).json({
                error: 'Internal Server Error',
                message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
                requestId: req.id,
                timestamp: new Date().toISOString()
            });
        });
    }

    async start() {
        try {
            // Initialize database connection
            await this.db.initialize();
            console.log('✅ Database connection established');

            // Start the server
            this.server = this.app.listen(this.port, () => {
                console.log(`🚀 Enhanced Event Processing Server running on port ${this.port}`);
                console.log(`📊 Health check: http://localhost:${this.port}/health`);
                console.log(`📈 Metrics: http://localhost:${this.port}/metrics`);
                console.log(`🔗 Codegen info: http://localhost:${this.port}/codegen/connection-info`);
            });

            // Graceful shutdown handling
            process.on('SIGTERM', () => this.shutdown());
            process.on('SIGINT', () => this.shutdown());

        } catch (error) {
            console.error('❌ Failed to start server:', error);
            process.exit(1);
        }
    }

    async shutdown() {
        console.log('🛑 Shutting down server...');
        
        if (this.server) {
            this.server.close(() => {
                console.log('✅ HTTP server closed');
            });
        }

        if (this.db) {
            await this.db.close();
            console.log('✅ Database connection closed');
        }

        process.exit(0);
    }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const server = new EnhancedEventServer();
    server.start().catch(error => {
        console.error('❌ Failed to start Enhanced Event Processing Server:', error);
        process.exit(1);
    });
}

export { EnhancedEventServer };

