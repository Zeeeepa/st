// src/worker.js - Enhanced with Debug Logging
import { Router } from 'itty-router';
import { getConfig, validateConfig } from './config.js';
import { initPostgreSQL, storeEvent, storeBatchEvents } from './utils/postgresql.js';
import { handleGitHubWebhook } from './handlers/github.js';
import { handleLinearWebhook } from './handlers/linear.js';
import { handleSlackWebhook } from './handlers/slack.js';

// Create router instance
const router = Router();

// Batch queue for events
const eventQueue = [];
let batchTimer = null;

// Initialize configuration
let config;
let isInitialized = false;

async function initialize(env) {
  if (!isInitialized) {
    config = getConfig(env);
    validateConfig(config);
    initPostgreSQL(config);
    isInitialized = true;
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

// Health check endpoint
router.get('/health', async (request, env) => {
  try {
    await initialize(env);
    
    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0',
      worker: config.workerId,
      environment: config.workerEnvironment
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// Metrics endpoint
router.get('/metrics', async (request, env) => {
  try {
    await initialize(env);
    
    // Get metrics from queue
    const metrics = {
      queue_size: eventQueue.length,
      processed_total: 0, // Would need to track this
      failed_total: 0, // Would need to track this
      timestamp: new Date().toISOString()
    };
    
    return new Response(JSON.stringify({ metrics }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// GitHub webhook endpoint
router.post('/webhook/github', async (request, env) => {
  try {
    await initialize(env);
    
    debugLog('info', 'GitHub webhook received');
    
    // Clone request BEFORE consuming the body
    const clonedRequest = request.clone();
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);
    const headers = Object.fromEntries(clonedRequest.headers);
    
    debugLog('debug', 'GitHub payload received', {
      event: headers['x-github-event'],
      action: payload.action,
      repository: payload.repository?.full_name
    });
    
    const result = await handleGitHubWebhook(rawBody, payload, headers, config);
    
    if (!result.isValid) {
      debugLog('warn', 'GitHub signature validation failed', result.error);
      return new Response(JSON.stringify({ error: result.error }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    debugLog('info', 'GitHub event processed', {
      eventType: result.eventType,
      repository: result.repository,
      actor: result.actor
    });
    
    // Process event
    await processEvent('github', result, env);
    
    return new Response(JSON.stringify({ 
      success: true, 
      event: result.eventType 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    debugLog('error', 'GitHub webhook error', error.message);
    console.error('GitHub webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// Linear webhook endpoint
router.post('/webhook/linear', async (request, env) => {
  try {
    await initialize(env);
    
    debugLog('info', 'Linear webhook received');
    
    // Clone request BEFORE consuming the body
    const clonedRequest = request.clone();
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);
    const headers = Object.fromEntries(clonedRequest.headers);
    
    debugLog('debug', 'Linear payload received', {
      type: payload.type,
      action: payload.action,
      organizationId: payload.organizationId,
      webhookId: payload.webhookId,
      dataId: payload.data?.id,
      dataTitle: payload.data?.title,
      dataIdentifier: payload.data?.identifier
    });
    
    const result = await handleLinearWebhook(rawBody, payload, headers, config);
    
    if (!result.isValid) {
      debugLog('warn', 'Linear signature validation failed', result.error);
      return new Response(JSON.stringify({ error: result.error }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    debugLog('info', 'Linear event processed', {
      eventType: result.eventType,
      targetEntity: result.targetEntity,
      organization: result.organization,
      actor: result.actor
    });
    
    // Process event
    await processEvent('linear', result, env);
    
    debugLog('info', 'Linear event stored successfully');
    
    return new Response(JSON.stringify({ 
      success: true, 
      event: result.eventType 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    debugLog('error', 'Linear webhook error', error.message);
    console.error('Linear webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// Slack webhook endpoint
router.post('/webhook/slack', async (request, env) => {
  try {
    await initialize(env);
    
    debugLog('info', 'Slack webhook received');
    
    // Clone request BEFORE consuming the body
    const clonedRequest = request.clone();
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);
    const headers = Object.fromEntries(clonedRequest.headers);
    
    debugLog('debug', 'Slack payload received', {
      type: payload.type,
      event: payload.event?.type,
      team: payload.team_id,
      user: payload.event?.user || payload.user_id
    });
    
    const result = await handleSlackWebhook(rawBody, payload, headers, config);
    
    if (!result.isValid) {
      debugLog('warn', 'Slack signature validation failed', result.error);
      return new Response(JSON.stringify({ error: result.error }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Handle Slack URL verification
    if (result.eventType === 'url_verification') {
      debugLog('info', 'Slack URL verification challenge received');
      return new Response(result.challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    debugLog('info', 'Slack event processed', {
      eventType: result.eventType,
      workspace: result.repository,
      actor: result.actor
    });
    
    // Process event
    await processEvent('slack', result, env);
    
    return new Response(JSON.stringify({ 
      success: true, 
      event: result.eventType 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    debugLog('error', 'Slack webhook error', error.message);
    console.error('Slack webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// Process and queue events
async function processEvent(source, eventData, env) {
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
        await processBatch(env);
      } else {
        // Set timer for batch processing
        if (!batchTimer) {
          debugLog('info', `Setting batch timer for ${config.batchInterval}ms`);
          batchTimer = setTimeout(async () => {
            await processBatch(env);
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
async function processBatch(env) {
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
router.all('*', () => new Response('Not Found', { status: 404 }));

// Export worker
export default {
  async fetch(request, env, ctx) {
    try {
      return await router.handle(request, env, ctx);
    } catch (error) {
      debugLog('error', 'Worker error', error.message);
      console.error('Worker error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
  
  async scheduled(event, env, ctx) {
    await initialize(env);
    
    // Process any remaining events in queue
    if (eventQueue.length > 0) {
      ctx.waitUntil(processBatch(env));
    }
    
    // Add any scheduled tasks here
    console.log('Scheduled event triggered:', event.cron);
  }
};
