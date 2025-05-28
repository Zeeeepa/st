// src/server.js - Express Server for Local Webhook Gateway
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { getConfig, validateConfig } from './config.js';
import { initDatabase, storeEvent, storeBatchEvents } from './utils/postgresql.js';
import { handleGitHubEvent } from './handlers/github.js';
import { handleLinearEvent } from './handlers/linear.js';
import { handleSlackEvent } from './handlers/slack.js';

// Create Express app
const app = express();

// Batch queue for events
const eventQueue = [];
let batchTimer = null;

// Initialize configuration
let config;
let isInitialized = false;

async function initialize() {
  if (!isInitialized) {
    config = getConfig();
    validateConfig(config);
    await initDatabase(config);
    isInitialized = true;
    console.log('✅ Webhook Gateway initialized successfully');
  }
  return config;
}

// Enhanced logging function
function debugLog(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (data) {
    console.log(logEntry, JSON.stringify(data, null, 2));
  } else {
    console.log(logEntry);
  }
}

// Middleware setup
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Raw body middleware for webhook signature verification
app.use('/webhook', express.raw({ type: 'application/json', limit: '10mb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await initialize();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '3.0',
      server: config.serverId || 'webhook-gateway',
      environment: config.environment || 'development',
      database: 'postgresql',
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    await initialize();
    
    const metrics = {
      queue_size: eventQueue.length,
      processed_total: 0, // Would need to track this
      failed_total: 0, // Would need to track this
      timestamp: new Date().toISOString(),
      memory_usage: process.memoryUsage(),
      uptime: process.uptime()
    };
    
    res.json({ metrics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GitHub webhook endpoint
app.post('/webhook/github', async (req, res) => {
  try {
    await initialize();
    
    debugLog('info', 'GitHub webhook received');
    
    const rawBody = req.body.toString();
    const payload = JSON.parse(rawBody);
    const headers = req.headers;
    
    debugLog('debug', 'GitHub payload received', {
      event: headers['x-github-event'],
      action: payload.action,
      repository: payload.repository?.full_name
    });
    
    const result = await handleGitHubEvent(rawBody, payload, headers, config);
    
    if (!result.isValid) {
      debugLog('warn', 'GitHub signature validation failed', result.error);
      return res.status(401).json({ error: result.error });
    }
    
    debugLog('info', 'GitHub event processed', {
      eventType: result.eventType,
      repository: result.repository,
      actor: result.actor
    });
    
    // Process event
    await processEvent('github', result);
    
    res.json({ 
      success: true, 
      event: result.eventType 
    });
  } catch (error) {
    debugLog('error', 'GitHub webhook error', error.message);
    console.error('GitHub webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Linear webhook endpoint
app.post('/webhook/linear', async (req, res) => {
  try {
    await initialize();
    
    debugLog('info', 'Linear webhook received');
    
    const rawBody = req.body.toString();
    const payload = JSON.parse(rawBody);
    const headers = req.headers;
    
    debugLog('debug', 'Linear payload received', {
      type: payload.type,
      action: payload.action,
      organizationId: payload.organizationId,
      webhookId: payload.webhookId,
      dataId: payload.data?.id,
      dataTitle: payload.data?.title,
      dataIdentifier: payload.data?.identifier
    });
    
    const result = await handleLinearEvent(rawBody, payload, headers, config);
    
    if (!result.isValid) {
      debugLog('warn', 'Linear signature validation failed', result.error);
      return res.status(401).json({ error: result.error });
    }
    
    debugLog('info', 'Linear event processed', {
      eventType: result.eventType,
      targetEntity: result.targetEntity,
      organization: result.organization,
      actor: result.actor
    });
    
    // Process event
    await processEvent('linear', result);
    
    debugLog('info', 'Linear event stored successfully');
    
    res.json({ 
      success: true, 
      event: result.eventType 
    });
  } catch (error) {
    debugLog('error', 'Linear webhook error', error.message);
    console.error('Linear webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Slack webhook endpoint
app.post('/webhook/slack', async (req, res) => {
  try {
    await initialize();
    
    debugLog('info', 'Slack webhook received');
    
    const rawBody = req.body.toString();
    const payload = JSON.parse(rawBody);
    const headers = req.headers;
    
    debugLog('debug', 'Slack payload received', {
      type: payload.type,
      event: payload.event?.type,
      team: payload.team_id,
      user: payload.event?.user || payload.user_id
    });
    
    const result = await handleSlackEvent(rawBody, payload, headers, config);
    
    if (!result.isValid) {
      debugLog('warn', 'Slack signature validation failed', result.error);
      return res.status(401).json({ error: result.error });
    }
    
    // Handle Slack URL verification
    if (result.eventType === 'url_verification') {
      debugLog('info', 'Slack URL verification challenge received');
      return res.status(200).send(result.challenge);
    }
    
    debugLog('info', 'Slack event processed', {
      eventType: result.eventType,
      workspace: result.repository,
      actor: result.actor
    });
    
    // Process event
    await processEvent('slack', result);
    
    res.json({ 
      success: true, 
      event: result.eventType 
    });
  } catch (error) {
    debugLog('error', 'Slack webhook error', error.message);
    console.error('Slack webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process and queue events
async function processEvent(source, eventData) {
  try {
    debugLog('info', `Processing ${source} event`, {
      eventType: eventData.eventType,
      batchingEnabled: config.enableBatching
    });
    
    const event = {
      source,
      event_type: eventData.eventType,
      payload: eventData,
      repository: eventData.repository,
      repository_id: eventData.repositoryId,
      organization: eventData.organization,
      organization_id: eventData.organizationId,
      actor: eventData.actor,
      actor_id: eventData.actorId,
      actor_type: eventData.actorType,
      actor_email: eventData.actorEmail,
      channel: eventData.channel,
      channel_id: eventData.channelId,
      channel_type: eventData.channelType,
      target_entity: eventData.targetEntity,
      target_entity_id: eventData.targetEntityId,
      target_entity_type: eventData.targetEntityType,
      headers: eventData.headers,
      metadata: eventData.metadata,
      additional_context: eventData.additionalContext,
      raw_event_type: eventData.rawEventType,
      action: eventData.action,
      delivery_id: eventData.deliveryId,
      webhook_id: eventData.webhookId,
      timestamp: eventData.timestamp,
      created_at: new Date().toISOString()
    };
    
    if (config.enableBatching) {
      // Add to queue
      eventQueue.push(event);
      debugLog('info', `Event added to batch queue (${eventQueue.length}/${config.batchSize})`);
      
      // Process batch if queue is full
      if (eventQueue.length >= config.batchSize) {
        debugLog('info', 'Batch queue full, processing batch');
        await processBatch();
      } else {
        // Set timer for batch processing
        if (!batchTimer) {
          debugLog('info', `Setting batch timer for ${config.batchInterval}ms`);
          batchTimer = setTimeout(async () => {
            await processBatch();
          }, config.batchInterval);
        }
      }
    } else {
      // Process immediately
      debugLog('info', 'Processing event immediately (batching disabled)');
      const result = await storeEvent(event, config);
      debugLog('info', 'Event stored', { success: result.success, duplicate: result.duplicate });
    }
  } catch (error) {
    debugLog('error', 'Error processing event', error.message);
    throw error;
  }
}

// Process batch of events
async function processBatch() {
  if (eventQueue.length === 0) return;
  
  debugLog('info', `Processing batch of ${eventQueue.length} events`);
  
  const events = [...eventQueue];
  eventQueue.length = 0; // Clear queue
  
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }
  
  try {
    const result = await storeBatchEvents(events, config);
    debugLog('info', 'Batch processed', {
      stored: result.stored?.length || 0,
      duplicates: result.duplicates?.length || 0,
      failed: result.failed?.length || 0
    });
  } catch (error) {
    debugLog('error', 'Batch processing error', error.message);
    console.error('Batch processing error:', error);
    // Add back to queue for retry
    eventQueue.unshift(...events);
  }
}

// Default 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  debugLog('error', 'Express error', error.message);
  console.error('Express error:', error);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  // Process any remaining events in queue
  if (eventQueue.length > 0) {
    console.log(`Processing ${eventQueue.length} remaining events...`);
    await processBatch();
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  
  // Process any remaining events in queue
  if (eventQueue.length > 0) {
    console.log(`Processing ${eventQueue.length} remaining events...`);
    await processBatch();
  }
  
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

async function startServer() {
  try {
    await initialize();
    
    app.listen(PORT, HOST, () => {
      console.log(`🚀 Webhook Gateway v3.0 running on http://${HOST}:${PORT}`);
      console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
      console.log(`📈 Metrics: http://${HOST}:${PORT}/metrics`);
      console.log(`🔗 GitHub webhooks: http://${HOST}:${PORT}/webhook/github`);
      console.log(`🔗 Linear webhooks: http://${HOST}:${PORT}/webhook/linear`);
      console.log(`🔗 Slack webhooks: http://${HOST}:${PORT}/webhook/slack`);
      console.log(`💾 Database: PostgreSQL (local)`);
      console.log(`🎯 Environment: ${config.environment || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;

