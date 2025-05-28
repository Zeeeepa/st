/**
 * Monitoring Service
 * Provides health checks, metrics, and monitoring for the event system
 */

export class MonitoringService {
    constructor(database) {
        this.db = database;
        this.startTime = new Date();
    }

    /**
     * Get comprehensive health status
     */
    async getHealthStatus() {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: this.getUptime(),
            version: '1.0.0',
            services: {}
        };

        try {
            // Database health
            const dbHealth = await this.db.healthCheck();
            health.services.database = dbHealth;

            // Environment checks
            health.services.environment = this.checkEnvironment();

            // Webhook configuration checks
            health.services.webhooks = this.checkWebhookConfiguration();

            // Overall status
            const allHealthy = Object.values(health.services).every(
                service => service.status === 'healthy' || service.status === 'connected'
            );

            if (!allHealthy) {
                health.status = 'degraded';
            }

        } catch (error) {
            health.status = 'unhealthy';
            health.error = error.message;
        }

        return health;
    }

    /**
     * Get system metrics
     */
    async getMetrics() {
        const metrics = {
            timestamp: new Date().toISOString(),
            uptime: this.getUptime(),
            system: this.getSystemMetrics(),
            database: await this.getDatabaseMetrics(),
            events: await this.getEventMetrics(),
            webhooks: await this.getWebhookMetrics()
        };

        return metrics;
    }

    /**
     * Get event summary for specified days
     */
    async getEventSummary(days = 7) {
        try {
            const summary = await this.db.getEventSummary(days);
            
            // Group by date and source
            const grouped = {};
            summary.forEach(row => {
                const date = row.date;
                if (!grouped[date]) {
                    grouped[date] = {
                        date,
                        github: { total: 0, successful: 0, failed: 0 },
                        linear: { total: 0, successful: 0, failed: 0 },
                        slack: { total: 0, successful: 0, failed: 0 }
                    };
                }
                
                grouped[date][row.source] = {
                    total: parseInt(row.total_events),
                    successful: parseInt(row.successful_events),
                    failed: parseInt(row.failed_events)
                };
            });

            return {
                period: `${days} days`,
                summary: Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date))
            };

        } catch (error) {
            throw new Error(`Failed to get event summary: ${error.message}`);
        }
    }

    /**
     * Get system uptime
     */
    getUptime() {
        const uptimeMs = Date.now() - this.startTime.getTime();
        const uptimeSeconds = Math.floor(uptimeMs / 1000);
        
        const days = Math.floor(uptimeSeconds / 86400);
        const hours = Math.floor((uptimeSeconds % 86400) / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = uptimeSeconds % 60;

        return {
            milliseconds: uptimeMs,
            seconds: uptimeSeconds,
            formatted: `${days}d ${hours}h ${minutes}m ${seconds}s`
        };
    }

    /**
     * Check environment configuration
     */
    checkEnvironment() {
        const required = [
            'POSTGRES_HOST',
            'POSTGRES_DB',
            'POSTGRES_USER',
            'POSTGRES_PASSWORD'
        ];

        const optional = [
            'GITHUB_WEBHOOK_SECRET',
            'LINEAR_WEBHOOK_SECRET',
            'SLACK_SIGNING_SECRET',
            'CLOUDFLARE_WORKER_URL'
        ];

        const missing = required.filter(key => !process.env[key]);
        const configured = optional.filter(key => process.env[key]);

        return {
            status: missing.length === 0 ? 'healthy' : 'degraded',
            required: {
                total: required.length,
                configured: required.length - missing.length,
                missing
            },
            optional: {
                total: optional.length,
                configured: configured.length,
                available: configured
            }
        };
    }

    /**
     * Check webhook configuration
     */
    checkWebhookConfiguration() {
        const webhooks = {
            github: {
                secret: !!process.env.GITHUB_WEBHOOK_SECRET,
                token: !!process.env.GITHUB_TOKEN
            },
            linear: {
                secret: !!process.env.LINEAR_WEBHOOK_SECRET,
                apiKey: !!process.env.LINEAR_API_KEY
            },
            slack: {
                secret: !!process.env.SLACK_SIGNING_SECRET,
                token: !!process.env.SLACK_BOT_TOKEN
            }
        };

        const configuredCount = Object.values(webhooks).filter(
            config => Object.values(config).some(Boolean)
        ).length;

        return {
            status: configuredCount > 0 ? 'healthy' : 'warning',
            configured: configuredCount,
            total: 3,
            details: webhooks
        };
    }

    /**
     * Get system metrics
     */
    getSystemMetrics() {
        const memUsage = process.memoryUsage();
        
        return {
            memory: {
                rss: this.formatBytes(memUsage.rss),
                heapTotal: this.formatBytes(memUsage.heapTotal),
                heapUsed: this.formatBytes(memUsage.heapUsed),
                external: this.formatBytes(memUsage.external)
            },
            cpu: {
                usage: process.cpuUsage()
            },
            node: {
                version: process.version,
                platform: process.platform,
                arch: process.arch
            }
        };
    }

    /**
     * Get database metrics
     */
    async getDatabaseMetrics() {
        try {
            const stats = await this.db.getStatistics();
            
            return {
                status: 'connected',
                tables: stats,
                totalEvents: stats.github_events + stats.linear_events + stats.slack_events
            };

        } catch (error) {
            return {
                status: 'error',
                error: error.message
            };
        }
    }

    /**
     * Get event metrics
     */
    async getEventMetrics() {
        try {
            const recentEvents = await this.db.getEvents({ limit: 1000 });
            
            const bySource = recentEvents.reduce((acc, event) => {
                acc[event.source] = (acc[event.source] || 0) + 1;
                return acc;
            }, {});

            const byStatus = recentEvents.reduce((acc, event) => {
                acc[event.status] = (acc[event.status] || 0) + 1;
                return acc;
            }, {});

            const byHour = recentEvents.reduce((acc, event) => {
                const hour = new Date(event.received_at).getHours();
                acc[hour] = (acc[hour] || 0) + 1;
                return acc;
            }, {});

            return {
                total: recentEvents.length,
                bySource,
                byStatus,
                byHour,
                recent: recentEvents.slice(0, 10)
            };

        } catch (error) {
            return {
                error: error.message
            };
        }
    }

    /**
     * Get webhook metrics
     */
    async getWebhookMetrics() {
        try {
            const deliveries = await this.db.query(`
                SELECT 
                    webhook_source,
                    status,
                    COUNT(*) as count,
                    AVG(response_time_ms) as avg_response_time,
                    MAX(created_at) as last_delivery
                FROM webhook_deliveries 
                WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
                GROUP BY webhook_source, status
                ORDER BY webhook_source, status
            `);

            const bySource = {};
            deliveries.rows.forEach(row => {
                if (!bySource[row.webhook_source]) {
                    bySource[row.webhook_source] = {};
                }
                bySource[row.webhook_source][row.status] = {
                    count: parseInt(row.count),
                    avgResponseTime: parseFloat(row.avg_response_time) || 0,
                    lastDelivery: row.last_delivery
                };
            });

            return {
                last24Hours: bySource,
                summary: deliveries.rows.reduce((acc, row) => {
                    acc.total += parseInt(row.count);
                    if (row.status === 'delivered') {
                        acc.successful += parseInt(row.count);
                    } else if (row.status === 'failed') {
                        acc.failed += parseInt(row.count);
                    }
                    return acc;
                }, { total: 0, successful: 0, failed: 0 })
            };

        } catch (error) {
            return {
                error: error.message
            };
        }
    }

    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Log performance metric
     */
    logPerformance(operation, duration, metadata = {}) {
        console.log(`[PERF] ${operation}: ${duration}ms`, metadata);
    }

    /**
     * Log error with context
     */
    logError(error, context = {}) {
        console.error(`[ERROR] ${error.message}`, {
            stack: error.stack,
            context,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Create alert for critical issues
     */
    createAlert(level, message, details = {}) {
        const alert = {
            level, // 'info', 'warning', 'error', 'critical'
            message,
            details,
            timestamp: new Date().toISOString(),
            service: 'event-processing-system'
        };

        console.log(`[ALERT:${level.toUpperCase()}] ${message}`, details);
        
        // In production, you might want to send this to an alerting service
        // like PagerDuty, Slack, or email notifications
        
        return alert;
    }
}

