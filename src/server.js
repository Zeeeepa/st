// src/server.js - Enhanced Express.js Webhook Gateway v3.0
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { getConfig, validateConfig, printConfigSummary } from './config.js';
import { initDatabase, checkDatabaseHealth, storeEvent, storeBatchEvents, getMetrics } from './utils/postgresql.js';
import { handleGitHubEvent } from './handlers/github.js';
import { handleLinearEvent } from './handlers/linear.js';
import { handleSlackEvent } from './handlers/slack.js';
import { debugLog } from './utils/logger.js';
import net from 'net';

// Initialize Express app
const app = express();

// Global configuration
let config;
let isInitialized = false;

// Batch queue for events
const eventQueue = [];
let batchTimer = null;

// Metrics tracking
const metrics = {
  requests: 0,
  events_processed: 0,
  events_failed: 0,
  events_duplicated: 0,
  uptime_start: new Date(),
  last_event: null
};

// Enhanced logging function
function debugLog(level, message, data = null, requestId = null) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level.toUpperCase()}]${requestId ? ` [${requestId}]` : ''} ${message}`;
  
  if (data) {
    console.log(logEntry, JSON.stringify(data, null, 2));
  } else {
    console.log(logEntry);
  }
}

// Initialize application
async function initialize() {
  if (!isInitialized) {
    try {
      config = getConfig();
      debugLog('info', 'Initializing webhook gateway...');
      printConfigSummary(config);
      
      // Validate configuration
      const validationErrors = validateConfig(config);
      if (validationErrors.length > 0) {
        debugLog('error', 'Configuration validation failed', validationErrors, null);
        throw new Error('Configuration validation failed');
      }
      
      // Initialize database
      await initDatabase(config);
      
      // Test database connection
      await checkDatabaseHealth(config);
      
      isInitialized = true;
      debugLog('info', 'Webhook gateway initialized successfully');
    } catch (error) {
      debugLog('error', 'Failed to initialize webhook gateway', error.message);
      throw error;
    }
  }
  return config;
}

// Function to find an available port
async function findAvailablePort(startPort = 3000, maxPort = 3010) {
  for (let port = startPort; port <= maxPort; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available ports found between ${startPort} and ${maxPort}`);
}

// Check if a port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

// Request ID middleware
app.use((req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true,
  credentials: true,
  optionsSuccessStatus: 200
}));

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: config?.rateLimitWindow || 60000, // 1 minute
  max: config?.rateLimitMaxRequests || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((config?.rateLimitWindow || 60000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    debugLog('warn', 'Rate limit exceeded', { ip: req.ip }, req.requestId);
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil((config?.rateLimitWindow || 60000) / 1000)
    });
  }
});

app.use('/webhook', limiter);

// Request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => {
      debugLog('info', `HTTP: ${message.trim()}`);
    }
  }
}));

// Body parsing with size limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Request metrics middleware
app.use((req, res, next) => {
  metrics.requests++;
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    debugLog('debug', 'Request completed', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent')
    }, req.requestId);
  });
  
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await initialize();
    
    // Perform comprehensive health checks
    const dbHealth = await checkDatabaseHealth(config);
    const uptime = Math.floor((Date.now() - metrics.uptime_start.getTime()) / 1000);
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '3.0.0',
      server_id: config.serverId,
      environment: config.nodeEnv,
      uptime_seconds: uptime,
      database: {
        status: dbHealth.healthy ? 'connected' : 'disconnected',
        response_time_ms: dbHealth.responseTime,
        last_check: dbHealth.timestamp
      },
      queue: {
        size: eventQueue.length,
        batching_enabled: config.enableBatching
      },
      metrics: {
        total_requests: metrics.requests,
        events_processed: metrics.events_processed,
        events_failed: metrics.events_failed,
        events_duplicated: metrics.events_duplicated,
        last_event: metrics.last_event
      }
    };
    
    debugLog('debug', 'Health check performed', healthStatus, req.requestId);
    res.json(healthStatus);
  } catch (error) {
    debugLog('error', 'Health check failed', error.message, req.requestId);
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
    
    const dbMetrics = await getMetrics(config);
    const uptime = Math.floor((Date.now() - metrics.uptime_start.getTime()) / 1000);
    
    const metricsData = {
      server: {
        uptime_seconds: uptime,
        total_requests: metrics.requests,
        events_processed: metrics.events_processed,
        events_failed: metrics.events_failed,
        events_duplicated: metrics.events_duplicated,
        queue_size: eventQueue.length,
        last_event: metrics.last_event
      },
      database: dbMetrics,
      timestamp: new Date().toISOString()
    };
    
    debugLog('debug', 'Metrics retrieved', metricsData, req.requestId);
    res.json({ metrics: metricsData });
  } catch (error) {
    debugLog('error', 'Failed to retrieve metrics', error.message, req.requestId);
    res.status(500).json({ error: error.message });
  }
});

// Input validation middleware
const webhookValidation = [
  body().custom((value, { req }) => {
    if (!req.rawBody || req.rawBody.length === 0) {
      throw new Error('Request body is required');
    }
    return true;
  })
];

// GitHub webhook endpoint
app.post('/webhook/github', webhookValidation, async (req, res) => {
  try {
    await initialize();
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      debugLog('warn', 'GitHub webhook validation failed', errors.array(), req.requestId);
      return res.status(400).json({ errors: errors.array() });
    }
    
    debugLog('info', 'GitHub webhook received', null, req.requestId);
    
    const rawBody = req.rawBody.toString();
    const payload = req.body;
    const headers = req.headers;
    
    debugLog('debug', 'GitHub payload received', {
      event: headers['x-github-event'],
      action: payload.action,
      repository: payload.repository?.full_name,
      delivery: headers['x-github-delivery']
    }, req.requestId);
    
    const result = await handleGitHubEvent(rawBody, payload, headers, config);
    
    if (!result.isValid) {
      debugLog('warn', 'GitHub signature validation failed', result.error, req.requestId);
      return res.status(401).json({ error: result.error });
    }
    
    debugLog('info', 'GitHub event processed', {
      eventType: result.eventType,
      repository: result.repository,
      actor: result.actor
    }, req.requestId);
    
    // Process event
    await processEvent('github', result, req.requestId);
    
    res.json({ 
      success: true, 
      event: result.eventType,
      request_id: req.requestId
    });
  } catch (error) {
    debugLog('error', 'GitHub webhook error', error.message, req.requestId);
    metrics.events_failed++;
    res.status(500).json({ 
      error: error.message,
      request_id: req.requestId
    });
  }
});

// Linear webhook endpoint
app.post('/webhook/linear', webhookValidation, async (req, res) => {
  try {
    await initialize();
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      debugLog('warn', 'Linear webhook validation failed', errors.array(), req.requestId);
      return res.status(400).json({ errors: errors.array() });
    }
    
    debugLog('info', 'Linear webhook received', null, req.requestId);
    
    const rawBody = req.rawBody.toString();
    const payload = req.body;
    const headers = req.headers;
    
    debugLog('debug', 'Linear payload received', {
      type: payload.type,
      action: payload.action,
      organizationId: payload.organizationId,
      webhookId: payload.webhookId,
      dataId: payload.data?.id,
      dataTitle: payload.data?.title,
      dataIdentifier: payload.data?.identifier
    }, req.requestId);
    
    const result = await handleLinearEvent(rawBody, payload, headers, config);
    
    if (!result.isValid) {
      debugLog('warn', 'Linear signature validation failed', result.error, req.requestId);
      return res.status(401).json({ error: result.error });
    }
    
    debugLog('info', 'Linear event processed', {
      eventType: result.eventType,
      targetEntity: result.targetEntity,
      organization: result.organization,
      actor: result.actor
    }, req.requestId);
    
    // Process event
    await processEvent('linear', result, req.requestId);
    
    debugLog('info', 'Linear event stored successfully', null, req.requestId);
    
    res.json({ 
      success: true, 
      event: result.eventType,
      request_id: req.requestId
    });
  } catch (error) {
    debugLog('error', 'Linear webhook error', error.message, req.requestId);
    metrics.events_failed++;
    res.status(500).json({ 
      error: error.message,
      request_id: req.requestId
    });
  }
});

// Slack webhook endpoint
app.post('/webhook/slack', webhookValidation, async (req, res) => {
  try {
    await initialize();
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      debugLog('warn', 'Slack webhook validation failed', errors.array(), req.requestId);
      return res.status(400).json({ errors: errors.array() });
    }
    
    debugLog('info', 'Slack webhook received', null, req.requestId);
    
    const rawBody = req.rawBody.toString();
    const payload = req.body;
    const headers = req.headers;
    
    debugLog('debug', 'Slack payload received', {
      type: payload.type,
      event: payload.event?.type,
      team: payload.team_id,
      user: payload.event?.user || payload.user_id
    }, req.requestId);
    
    const result = await handleSlackEvent(rawBody, payload, headers, config);
    
    if (!result.isValid) {
      debugLog('warn', 'Slack signature validation failed', result.error, req.requestId);
      return res.status(401).json({ error: result.error });
    }
    
    // Handle Slack URL verification
    if (result.eventType === 'url_verification') {
      debugLog('info', 'Slack URL verification challenge received', null, req.requestId);
      return res.status(200).send(result.challenge);
    }
    
    debugLog('info', 'Slack event processed', {
      eventType: result.eventType,
      workspace: result.repository,
      actor: result.actor
    }, req.requestId);
    
    // Process event
    await processEvent('slack', result, req.requestId);
    
    res.json({ 
      success: true, 
      event: result.eventType,
      request_id: req.requestId
    });
  } catch (error) {
    debugLog('error', 'Slack webhook error', error.message, req.requestId);
    metrics.events_failed++;
    res.status(500).json({ 
      error: error.message,
      request_id: req.requestId
    });
  }
});

// Process and queue events
async function processEvent(source, eventData, requestId) {
  try {
    debugLog('info', `Processing ${source} event`, {
      eventType: eventData.eventType,
      batchingEnabled: config.enableBatching
    }, requestId);
    
    const event = {
      id: uuidv4(),
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
      request_id: requestId,
      created_at: new Date().toISOString()
    };
    
    if (config.enableBatching) {
      // Add to queue
      eventQueue.push(event);
      debugLog('info', `Event added to batch queue (${eventQueue.length}/${config.batchSize})`, null, requestId);
      
      // Process batch if queue is full
      if (eventQueue.length >= config.batchSize) {
        debugLog('info', 'Batch queue full, processing batch', null, requestId);
        await processBatch();
      } else {
        // Set timer for batch processing
        if (!batchTimer) {
          debugLog('info', `Setting batch timer for ${config.batchInterval}ms`, null, requestId);
          batchTimer = setTimeout(async () => {
            await processBatch();
          }, config.batchInterval);
        }
      }
    } else {
      // Process immediately
      debugLog('info', 'Processing event immediately (batching disabled)', null, requestId);
      const result = await storeEvent(event, config);
      
      if (result.success) {
        metrics.events_processed++;
        if (result.duplicate) {
          metrics.events_duplicated++;
        }
      } else {
        metrics.events_failed++;
      }
      
      metrics.last_event = new Date().toISOString();
      debugLog('info', 'Event stored', { 
        success: result.success, 
        duplicate: result.duplicate 
      }, requestId);
    }
  } catch (error) {
    debugLog('error', 'Error processing event', error.message, requestId);
    metrics.events_failed++;
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
    
    // Update metrics
    metrics.events_processed += result.stored?.length || 0;
    metrics.events_duplicated += result.duplicates?.length || 0;
    metrics.events_failed += result.failed?.length || 0;
    metrics.last_event = new Date().toISOString();
    
    debugLog('info', 'Batch processed', {
      stored: result.stored?.length || 0,
      duplicates: result.duplicates?.length || 0,
      failed: result.failed?.length || 0
    });
  } catch (error) {
    debugLog('error', 'Batch processing error', error.message);
    metrics.events_failed += events.length;
    // Add back to queue for retry
    eventQueue.unshift(...events);
  }
}

// Error handling middleware
app.use((error, req, res, next) => {
  debugLog('error', 'Unhandled error', error.message, req.requestId);
  res.status(500).json({
    error: 'Internal server error',
    request_id: req.requestId,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  debugLog('warn', '404 Not Found', { url: req.originalUrl }, req.requestId);
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
    request_id: req.requestId
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  debugLog('info', 'SIGTERM received, shutting down gracefully');
  
  // Process remaining events
  if (eventQueue.length > 0) {
    debugLog('info', `Processing ${eventQueue.length} remaining events before shutdown`);
    await processBatch();
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  debugLog('info', 'SIGINT received, shutting down gracefully');
  
  // Process remaining events
  if (eventQueue.length > 0) {
    debugLog('info', `Processing ${eventQueue.length} remaining events before shutdown`);
    await processBatch();
  }
  
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    await initialize();
    
    const configPort = config.port || 3000;
    const host = config.host || 'localhost';
    
    // Find an available port starting from the configured port
    const port = await findAvailablePort(configPort, configPort + 10);
    
    if (port !== configPort) {
      debugLog('info', `⚠️ Port ${configPort} is in use, using port ${port} instead`);
    }
    
    app.listen(port, host, () => {
      debugLog('info', `🚀 Webhook Gateway v3.0 started successfully`);
      debugLog('info', `📡 Server running on http://${host}:${port}`);
      debugLog('info', `🔗 GitHub webhooks: http://${host}:${port}/webhook/github`);
      debugLog('info', `🔗 Linear webhooks: http://${host}:${port}/webhook/linear`);
      debugLog('info', `🔗 Slack webhooks: http://${host}:${port}/webhook/slack`);
      debugLog('info', `💚 Health check: http://${host}:${port}/health`);
      debugLog('info', `📊 Metrics: http://${host}:${port}/metrics`);
      debugLog('info', `🌍 Environment: ${config.nodeEnv}`);
      debugLog('info', `🗄️  Database: ${config.database.host}:${config.database.port}/${config.database.name}`);
    });
  } catch (error) {
    debugLog('error', 'Failed to start server', error.message);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export default app;
