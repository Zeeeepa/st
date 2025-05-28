// src/utils/postgresql.js - PostgreSQL Database Client
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

const { Pool } = pg;

let dbPool = null;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;
const BATCH_SIZE = 100;
const DEDUPLICATION_WINDOW_MS = 5000; // 5 seconds

// In-memory cache for deduplication
const eventCache = new Map();
const CACHE_CLEANUP_INTERVAL = 60000; // 1 minute

/**
 * Initialize the PostgreSQL connection pool
 */
export async function initDatabase(config) {
  if (!config.database) {
    throw new Error('Missing database configuration');
  }
  
  try {
    // First, try to connect to the specific database
    dbPool = new Pool({
      user: config.database.user,
      password: config.database.password,
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test the connection
    const client = await dbPool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    console.log(`✅ Connected to PostgreSQL database: ${config.database.name}`);
  } catch (error) {
    console.log(`⚠️  Database '${config.database.name}' not found, attempting to create it...`);
    
    // Try to create the database
    await createDatabase(config);
    
    // Now connect to the newly created database
    dbPool = new Pool({
      user: config.database.user,
      password: config.database.password,
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    console.log(`✅ Connected to PostgreSQL database: ${config.database.name}`);
  }
  
  // Initialize database schema
  await initializeSchema();
  
  // Start cache cleanup interval
  startCacheCleanup();
  
  return dbPool;
}

/**
 * Create the database if it doesn't exist
 */
async function createDatabase(config) {
  const adminPool = new Pool({
    user: config.database.user,
    password: config.database.password,
    host: config.database.host,
    port: config.database.port,
    database: 'postgres', // Connect to default postgres database
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  try {
    const client = await adminPool.connect();
    
    // Check if database exists
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [config.database.name]
    );
    
    if (result.rows.length === 0) {
      // Create the database
      await client.query(`CREATE DATABASE "${config.database.name}"`);
      console.log(`✅ Created database: ${config.database.name}`);
    } else {
      console.log(`✅ Database already exists: ${config.database.name}`);
    }
    
    client.release();
  } catch (error) {
    console.error('Error creating database:', error);
    throw error;
  } finally {
    await adminPool.end();
  }
}

/**
 * Initialize database schema
 */
async function initializeSchema() {
  const client = await dbPool.connect();
  
  try {
    // Read and execute the schema SQL
    const schemaSQL = `
      -- Enhanced Webhook Gateway Database Schema v3.0
      -- PostgreSQL Local Database Schema

      -- Enable UUID extension
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      -- Main events table
      CREATE TABLE IF NOT EXISTS webhook_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        source TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload JSONB NOT NULL,
        repository TEXT,
        repository_id TEXT,
        organization TEXT,
        organization_id TEXT,
        actor TEXT,
        actor_id TEXT,
        actor_type TEXT,
        actor_email TEXT,
        channel TEXT,
        channel_id TEXT,
        channel_type TEXT,
        target_entity TEXT,
        target_entity_id TEXT,
        target_entity_type TEXT,
        headers JSONB,
        metadata JSONB,
        additional_context JSONB,
        raw_event_type TEXT,
        action TEXT,
        delivery_id TEXT,
        webhook_id TEXT,
        timestamp TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        processed_at TIMESTAMPTZ DEFAULT NOW(),
        version TEXT DEFAULT '3.0',
        CONSTRAINT webhook_events_source_check CHECK (source IN ('github', 'linear', 'slack', 'unknown'))
      );

      -- Failed events table for retry mechanism
      CREATE TABLE IF NOT EXISTS webhook_events_failed (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        source TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload JSONB NOT NULL,
        error_message TEXT,
        original_data JSONB,
        failed_at TIMESTAMPTZ DEFAULT NOW(),
        retry_count INTEGER DEFAULT 0,
        last_retry_at TIMESTAMPTZ,
        last_error TEXT,
        resolved BOOLEAN DEFAULT FALSE,
        resolved_at TIMESTAMPTZ
      );

      -- Event metrics table for analytics
      CREATE TABLE IF NOT EXISTS webhook_event_metrics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        source TEXT NOT NULL,
        event_type TEXT NOT NULL,
        date DATE NOT NULL,
        hour INTEGER NOT NULL,
        count INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_updated TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(source, event_type, date, hour)
      );

      -- Archive table for old events
      CREATE TABLE IF NOT EXISTS webhook_events_archive (
        id UUID PRIMARY KEY,
        source TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload JSONB NOT NULL,
        repository TEXT,
        repository_id TEXT,
        organization TEXT,
        organization_id TEXT,
        actor TEXT,
        actor_id TEXT,
        actor_type TEXT,
        actor_email TEXT,
        channel TEXT,
        channel_id TEXT,
        channel_type TEXT,
        target_entity TEXT,
        target_entity_id TEXT,
        target_entity_type TEXT,
        headers JSONB,
        metadata JSONB,
        additional_context JSONB,
        raw_event_type TEXT,
        action TEXT,
        delivery_id TEXT,
        webhook_id TEXT,
        timestamp TIMESTAMPTZ,
        created_at TIMESTAMPTZ,
        processed_at TIMESTAMPTZ,
        archived_at TIMESTAMPTZ DEFAULT NOW(),
        version TEXT DEFAULT '3.0'
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_webhook_events_source ON webhook_events(source);
      CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);
      CREATE INDEX IF NOT EXISTS idx_webhook_events_repository ON webhook_events(repository);
      CREATE INDEX IF NOT EXISTS idx_webhook_events_actor ON webhook_events(actor);
      CREATE INDEX IF NOT EXISTS idx_webhook_events_organization ON webhook_events(organization);
      CREATE INDEX IF NOT EXISTS idx_webhook_events_delivery_id ON webhook_events(delivery_id);
      CREATE INDEX IF NOT EXISTS idx_webhook_events_webhook_id ON webhook_events(webhook_id);
      CREATE INDEX IF NOT EXISTS idx_webhook_events_source_event_type ON webhook_events(source, event_type);
      CREATE INDEX IF NOT EXISTS idx_webhook_events_source_created_at ON webhook_events(source, created_at);

      -- JSONB indexes for payload search
      CREATE INDEX IF NOT EXISTS idx_webhook_events_payload_gin ON webhook_events USING GIN(payload);
      CREATE INDEX IF NOT EXISTS idx_webhook_events_metadata_gin ON webhook_events USING GIN(metadata);

      -- Indexes for failed events
      CREATE INDEX IF NOT EXISTS idx_webhook_events_failed_source ON webhook_events_failed(source);
      CREATE INDEX IF NOT EXISTS idx_webhook_events_failed_failed_at ON webhook_events_failed(failed_at);
      CREATE INDEX IF NOT EXISTS idx_webhook_events_failed_resolved ON webhook_events_failed(resolved);

      -- Indexes for metrics
      CREATE INDEX IF NOT EXISTS idx_webhook_event_metrics_source_date ON webhook_event_metrics(source, date);
      CREATE INDEX IF NOT EXISTS idx_webhook_event_metrics_date_hour ON webhook_event_metrics(date, hour);

      -- Function to increment event metrics atomically
      CREATE OR REPLACE FUNCTION increment_event_metrics(
        p_source TEXT,
        p_event_type TEXT,
        p_count INTEGER DEFAULT 1
      ) RETURNS VOID AS $$
      BEGIN
        INSERT INTO webhook_event_metrics (source, event_type, date, hour, count)
        VALUES (
          p_source,
          p_event_type,
          CURRENT_DATE,
          EXTRACT(HOUR FROM CURRENT_TIMESTAMP),
          p_count
        )
        ON CONFLICT (source, event_type, date, hour)
        DO UPDATE SET
          count = webhook_event_metrics.count + p_count,
          last_updated = NOW();
      END;
      $$ LANGUAGE plpgsql;

      -- Function to get event aggregations
      CREATE OR REPLACE FUNCTION get_event_aggregations(p_filters JSONB DEFAULT '{}')
      RETURNS JSONB AS $$
      DECLARE
        result JSONB;
      BEGIN
        WITH aggregations AS (
          SELECT
            COUNT(*) AS total_events,
            COUNT(DISTINCT source) AS unique_sources,
            COUNT(DISTINCT event_type) AS unique_event_types,
            COUNT(DISTINCT repository) AS unique_repositories,
            COUNT(DISTINCT actor) AS unique_actors,
            COUNT(DISTINCT organization) AS unique_organizations,
            jsonb_agg(DISTINCT source) AS sources,
            jsonb_agg(DISTINCT event_type) AS event_types
          FROM webhook_events
          WHERE
            (p_filters->>'source' IS NULL OR source = p_filters->>'source')
            AND (p_filters->>'event_type' IS NULL OR event_type = p_filters->>'event_type')
            AND (p_filters->>'repository' IS NULL OR repository = p_filters->>'repository')
            AND (p_filters->>'actor' IS NULL OR actor = p_filters->>'actor')
        ),
        by_source AS (
          SELECT
            source,
            COUNT(*) AS count
          FROM webhook_events
          WHERE
            (p_filters->>'source' IS NULL OR source = p_filters->>'source')
          GROUP BY source
        ),
        by_event_type AS (
          SELECT
            event_type,
            COUNT(*) AS count
          FROM webhook_events
          WHERE
            (p_filters->>'event_type' IS NULL OR event_type = p_filters->>'event_type')
          GROUP BY event_type
          ORDER BY count DESC
          LIMIT 10
        ),
        by_day AS (
          SELECT
            DATE(created_at) AS date,
            COUNT(*) AS count
          FROM webhook_events
          WHERE
            created_at >= CURRENT_DATE - INTERVAL '30 days'
            AND (p_filters->>'source' IS NULL OR source = p_filters->>'source')
          GROUP BY DATE(created_at)
          ORDER BY date DESC
        )
        SELECT jsonb_build_object(
          'totals', (SELECT row_to_json(aggregations.*) FROM aggregations),
          'by_source', (SELECT jsonb_agg(row_to_json(by_source.*)) FROM by_source),
          'by_event_type', (SELECT jsonb_agg(row_to_json(by_event_type.*)) FROM by_event_type),
          'by_day', (SELECT jsonb_agg(row_to_json(by_day.*)) FROM by_day)
        ) INTO result;
        
        RETURN result;
      END;
      $$ LANGUAGE plpgsql;

      -- Function to archive old events
      CREATE OR REPLACE FUNCTION archive_old_events(p_cutoff_date TIMESTAMPTZ)
      RETURNS INTEGER AS $$
      DECLARE
        archived_count INTEGER;
      BEGIN
        -- Move old events to archive table
        WITH moved AS (
          INSERT INTO webhook_events_archive
          SELECT *, NOW() as archived_at FROM webhook_events
          WHERE created_at < p_cutoff_date
          RETURNING 1
        )
        SELECT COUNT(*) INTO archived_count FROM moved;
        
        -- Delete archived events from main table
        DELETE FROM webhook_events
        WHERE created_at < p_cutoff_date;
        
        RETURN archived_count;
      END;
      $$ LANGUAGE plpgsql;

      -- Trigger to update processed_at timestamp
      CREATE OR REPLACE FUNCTION update_processed_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.processed_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Drop trigger if exists and recreate
      DROP TRIGGER IF EXISTS update_webhook_events_processed_at ON webhook_events;

      CREATE TRIGGER update_webhook_events_processed_at
        BEFORE INSERT OR UPDATE ON webhook_events
        FOR EACH ROW
        EXECUTE FUNCTION update_processed_at();
    `;

    await client.query(schemaSQL);
    console.log('✅ Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Retry an operation with exponential backoff
 */
async function retryOperation(operation, maxRetries = MAX_RETRIES) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(`Operation failed (attempt ${attempt + 1}/${maxRetries}): ${error.message}`);
      
      // Don't retry for certain errors
      if (error.code === '23505') { // Unique violation
        break;
      }
      
      // Exponential backoff
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Generate a unique event hash for deduplication
 */
function generateEventHash(eventData) {
  const hashData = {
    source: eventData.source,
    event_type: eventData.event_type,
    delivery_id: eventData.delivery_id,
    webhook_id: eventData.webhook_id,
    actor_id: eventData.actor_id,
    target_entity_id: eventData.target_entity_id,
    timestamp: eventData.timestamp
  };
  
  return JSON.stringify(hashData);
}

/**
 * Check if event is duplicate
 */
function isDuplicateEvent(eventData) {
  const hash = generateEventHash(eventData);
  const now = Date.now();
  
  if (eventCache.has(hash)) {
    const cachedTime = eventCache.get(hash);
    if (now - cachedTime < DEDUPLICATION_WINDOW_MS) {
      return true;
    }
  }
  
  eventCache.set(hash, now);
  return false;
}

/**
 * Start cache cleanup interval
 */
function startCacheCleanup() {
  setInterval(() => {
    const now = Date.now();
    for (const [hash, timestamp] of eventCache.entries()) {
      if (now - timestamp > DEDUPLICATION_WINDOW_MS) {
        eventCache.delete(hash);
      }
    }
  }, CACHE_CLEANUP_INTERVAL);
}

/**
 * Store a single event in the database
 */
export async function storeEvent(eventData, config) {
  try {
    if (!dbPool) {
      await initDatabase(config);
    }
    
    // Check for duplicates
    if (isDuplicateEvent(eventData)) {
      console.log('Duplicate event detected, skipping storage');
      return {
        success: true,
        duplicate: true,
        id: null
      };
    }
    
    return await retryOperation(async () => {
      const client = await dbPool.connect();
      
      try {
        const query = `
          INSERT INTO webhook_events (
            source, event_type, payload, repository, repository_id, organization, organization_id,
            actor, actor_id, actor_type, actor_email, channel, channel_id, channel_type,
            target_entity, target_entity_id, target_entity_type, headers, metadata, additional_context,
            raw_event_type, action, delivery_id, webhook_id, timestamp, created_at, version
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
          ) RETURNING id
        `;
        
        const values = [
          eventData.source,
          eventData.event_type,
          JSON.stringify(eventData.payload),
          eventData.repository,
          eventData.repository_id,
          eventData.organization,
          eventData.organization_id,
          eventData.actor,
          eventData.actor_id,
          eventData.actor_type,
          eventData.actor_email,
          eventData.channel,
          eventData.channel_id,
          eventData.channel_type,
          eventData.target_entity,
          eventData.target_entity_id,
          eventData.target_entity_type,
          JSON.stringify(eventData.headers),
          JSON.stringify(eventData.metadata),
          JSON.stringify(eventData.additional_context),
          eventData.raw_event_type,
          eventData.action,
          eventData.delivery_id,
          eventData.webhook_id,
          eventData.timestamp,
          eventData.created_at || new Date().toISOString(),
          '3.0'
        ];
        
        const result = await client.query(query, values);
        
        // Update metrics
        await updateEventMetrics(eventData.source, eventData.event_type, config);
        
        return {
          success: true,
          duplicate: false,
          id: result.rows[0].id
        };
      } finally {
        client.release();
      }
    });
  } catch (error) {
    console.error('Error storing event:', error);
    
    // Store in failed events table
    await storeFailedEvent(eventData, error.message);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Store multiple events in batch
 */
export async function storeBatchEvents(events, config) {
  if (!events || events.length === 0) {
    return {
      success: true,
      stored: [],
      duplicates: [],
      failed: []
    };
  }
  
  try {
    if (!dbPool) {
      await initDatabase(config);
    }
    
    const results = {
      stored: [],
      duplicates: [],
      failed: []
    };
    
    // Filter out duplicates
    const uniqueEvents = events.filter(event => {
      if (isDuplicateEvent(event)) {
        results.duplicates.push(event);
        return false;
      }
      return true;
    });
    
    if (uniqueEvents.length === 0) {
      return { ...results, success: true };
    }
    
    return await retryOperation(async () => {
      const client = await dbPool.connect();
      
      try {
        await client.query('BEGIN');
        
        const query = `
          INSERT INTO webhook_events (
            source, event_type, payload, repository, repository_id, organization, organization_id,
            actor, actor_id, actor_type, actor_email, channel, channel_id, channel_type,
            target_entity, target_entity_id, target_entity_type, headers, metadata, additional_context,
            raw_event_type, action, delivery_id, webhook_id, timestamp, created_at, version
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
          ) RETURNING id
        `;
        
        for (const event of uniqueEvents) {
          try {
            const values = [
              event.source,
              event.event_type,
              JSON.stringify(event.payload),
              event.repository,
              event.repository_id,
              event.organization,
              event.organization_id,
              event.actor,
              event.actor_id,
              event.actor_type,
              event.actor_email,
              event.channel,
              event.channel_id,
              event.channel_type,
              event.target_entity,
              event.target_entity_id,
              event.target_entity_type,
              JSON.stringify(event.headers),
              JSON.stringify(event.metadata),
              JSON.stringify(event.additional_context),
              event.raw_event_type,
              event.action,
              event.delivery_id,
              event.webhook_id,
              event.timestamp,
              event.created_at || new Date().toISOString(),
              '3.0'
            ];
            
            const result = await client.query(query, values);
            results.stored.push({ ...event, id: result.rows[0].id });
            
            // Update metrics
            await updateEventMetrics(event.source, event.event_type, config);
          } catch (error) {
            console.error('Error storing individual event in batch:', error);
            results.failed.push({ event, error: error.message });
          }
        }
        
        await client.query('COMMIT');
        
        return { ...results, success: true };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    });
  } catch (error) {
    console.error('Error storing batch events:', error);
    
    // Store all events as failed
    for (const event of events) {
      await storeFailedEvent(event, error.message);
    }
    
    return {
      success: false,
      error: error.message,
      stored: [],
      duplicates: [],
      failed: events.map(event => ({ event, error: error.message }))
    };
  }
}

/**
 * Store failed event for retry
 */
async function storeFailedEvent(eventData, errorMessage) {
  try {
    if (!dbPool) return;
    
    const client = await dbPool.connect();
    
    try {
      const query = `
        INSERT INTO webhook_events_failed (
          source, event_type, payload, error_message, original_data, failed_at, retry_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      const values = [
        eventData.source,
        eventData.event_type,
        JSON.stringify(eventData.payload),
        errorMessage,
        JSON.stringify(eventData),
        new Date().toISOString(),
        0
      ];
      
      await client.query(query, values);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error storing failed event:', error);
  }
}

/**
 * Update event metrics
 */
async function updateEventMetrics(source, eventType, config, count = 1) {
  try {
    if (!dbPool) {
      await initDatabase(config);
    }
    
    const client = await dbPool.connect();
    
    try {
      await client.query('SELECT increment_event_metrics($1, $2, $3)', [source, eventType, count]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating metrics:', error);
  }
}

/**
 * Get events with filtering and pagination
 */
export async function getEvents(options = {}, config) {
  try {
    if (!dbPool) {
      await initDatabase(config);
    }
    
    const client = await dbPool.connect();
    
    try {
      const limit = options.limit || 100;
      const offset = options.offset || 0;
      
      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramIndex = 1;
      
      // Add filters
      if (options.source) {
        whereClause += ` AND source = $${paramIndex}`;
        params.push(options.source);
        paramIndex++;
      }
      
      if (options.event_type) {
        whereClause += ` AND event_type = $${paramIndex}`;
        params.push(options.event_type);
        paramIndex++;
      }
      
      if (options.repository) {
        whereClause += ` AND repository = $${paramIndex}`;
        params.push(options.repository);
        paramIndex++;
      }
      
      if (options.actor) {
        whereClause += ` AND actor = $${paramIndex}`;
        params.push(options.actor);
        paramIndex++;
      }
      
      if (options.startDate) {
        whereClause += ` AND created_at >= $${paramIndex}`;
        params.push(options.startDate);
        paramIndex++;
      }
      
      if (options.endDate) {
        whereClause += ` AND created_at <= $${paramIndex}`;
        params.push(options.endDate);
        paramIndex++;
      }
      
      const query = `
        SELECT * FROM webhook_events 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      params.push(limit, offset);
      
      const result = await client.query(query, params);
      
      // Get total count if requested
      let totalCount = null;
      if (options.includeCount) {
        const countQuery = `SELECT COUNT(*) FROM webhook_events ${whereClause}`;
        const countResult = await client.query(countQuery, params.slice(0, -2)); // Remove limit and offset
        totalCount = parseInt(countResult.rows[0].count);
      }
      
      return {
        success: true,
        data: result.rows,
        pagination: {
          limit,
          offset,
          hasMore: result.rows.length === limit,
          totalCount
        }
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error retrieving events:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get database health status
 */
export async function checkDatabaseHealth(config) {
  try {
    if (!dbPool) {
      await initDatabase(config);
    }
    
    const startTime = Date.now();
    const client = await dbPool.connect();
    
    try {
      await client.query('SELECT NOW()');
      const responseTime = Date.now() - startTime;
      
      // Check if response time is acceptable
      const isHealthy = responseTime < 5000; // 5 second threshold
      
      return {
        success: true,
        status: isHealthy ? 'healthy' : 'degraded',
        responseTime,
        timestamp: new Date().toISOString(),
        database: 'postgresql'
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database health check failed:', error);
    return {
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
      database: 'postgresql'
    };
  }
}

/**
 * Close database connection
 */
export async function closeDatabase() {
  if (dbPool) {
    await dbPool.end();
    dbPool = null;
    console.log('✅ Database connection closed');
  }
}

