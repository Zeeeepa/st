// src/utils/postgresql.js - Enhanced PostgreSQL Database Operations
import pg from 'pg';
import crypto from 'crypto';

const { Pool } = pg;

// Connection pools
let pool = null;
let isInitialized = false;

// Database schema
const SCHEMA_SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main webhook events table
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    repository VARCHAR(255),
    repository_id VARCHAR(100),
    organization VARCHAR(255),
    organization_id VARCHAR(100),
    actor VARCHAR(255),
    actor_id VARCHAR(100),
    actor_type VARCHAR(50),
    actor_email VARCHAR(255),
    channel VARCHAR(255),
    channel_id VARCHAR(100),
    channel_type VARCHAR(50),
    target_entity VARCHAR(255),
    target_entity_id VARCHAR(100),
    target_entity_type VARCHAR(50),
    headers JSONB,
    metadata JSONB,
    additional_context JSONB,
    raw_event_type VARCHAR(100),
    action VARCHAR(100),
    delivery_id VARCHAR(100),
    webhook_id VARCHAR(100),
    timestamp TIMESTAMPTZ,
    request_id VARCHAR(100),
    event_hash VARCHAR(64) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Failed events table for retry mechanism
CREATE TABLE IF NOT EXISTS webhook_events_failed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_event_id UUID,
    source VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    error_message TEXT,
    error_details JSONB,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event metrics table
CREATE TABLE IF NOT EXISTS webhook_event_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    source VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    total_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    duplicate_count INTEGER DEFAULT 0,
    avg_processing_time_ms NUMERIC(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, source, event_type)
);

-- Archived events table
CREATE TABLE IF NOT EXISTS webhook_events_archive (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_event_id UUID NOT NULL,
    source VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    archived_at TIMESTAMPTZ DEFAULT NOW(),
    archive_reason VARCHAR(100) DEFAULT 'retention_policy'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_events_source ON webhook_events(source);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_repository ON webhook_events(repository);
CREATE INDEX IF NOT EXISTS idx_webhook_events_organization ON webhook_events(organization);
CREATE INDEX IF NOT EXISTS idx_webhook_events_actor ON webhook_events(actor);
CREATE INDEX IF NOT EXISTS idx_webhook_events_delivery_id ON webhook_events(delivery_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_request_id ON webhook_events(request_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_timestamp ON webhook_events(timestamp);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_source_type_date ON webhook_events(source, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_org_repo_date ON webhook_events(organization, repository, created_at);

-- JSONB indexes for payload queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_payload_gin ON webhook_events USING GIN(payload);
CREATE INDEX IF NOT EXISTS idx_webhook_events_metadata_gin ON webhook_events USING GIN(metadata);

-- Failed events indexes
CREATE INDEX IF NOT EXISTS idx_webhook_events_failed_retry ON webhook_events_failed(next_retry_at) WHERE retry_count < max_retries;
CREATE INDEX IF NOT EXISTS idx_webhook_events_failed_source ON webhook_events_failed(source);

-- Metrics indexes
CREATE INDEX IF NOT EXISTS idx_webhook_event_metrics_date ON webhook_event_metrics(date);
CREATE INDEX IF NOT EXISTS idx_webhook_event_metrics_source ON webhook_event_metrics(source);

-- Archive indexes
CREATE INDEX IF NOT EXISTS idx_webhook_events_archive_date ON webhook_events_archive(archived_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_archive_source ON webhook_events_archive(source);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_webhook_events_updated_at ON webhook_events;
CREATE TRIGGER update_webhook_events_updated_at
    BEFORE UPDATE ON webhook_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_webhook_events_failed_updated_at ON webhook_events_failed;
CREATE TRIGGER update_webhook_events_failed_updated_at
    BEFORE UPDATE ON webhook_events_failed
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_webhook_event_metrics_updated_at ON webhook_event_metrics;
CREATE TRIGGER update_webhook_event_metrics_updated_at
    BEFORE UPDATE ON webhook_event_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to generate event hash for deduplication
CREATE OR REPLACE FUNCTION generate_event_hash(
    p_source VARCHAR,
    p_event_type VARCHAR,
    p_delivery_id VARCHAR,
    p_payload JSONB
) RETURNS VARCHAR AS $$
BEGIN
    -- Create hash from source, event_type, delivery_id, and key payload fields
    RETURN encode(
        digest(
            CONCAT(
                COALESCE(p_source, ''),
                COALESCE(p_event_type, ''),
                COALESCE(p_delivery_id, ''),
                COALESCE(p_payload::text, '')
            ),
            'sha256'
        ),
        'hex'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old events
CREATE OR REPLACE FUNCTION cleanup_old_events(retention_days INTEGER DEFAULT 90)
RETURNS TABLE(archived_count INTEGER, deleted_count INTEGER) AS $$
DECLARE
    cutoff_date TIMESTAMPTZ;
    archived_events INTEGER;
    deleted_events INTEGER;
BEGIN
    cutoff_date := NOW() - INTERVAL '1 day' * retention_days;
    
    -- Archive old events
    INSERT INTO webhook_events_archive (original_event_id, source, event_type, payload, archive_reason)
    SELECT id, source, event_type, payload, 'retention_policy'
    FROM webhook_events
    WHERE created_at < cutoff_date;
    
    GET DIAGNOSTICS archived_events = ROW_COUNT;
    
    -- Delete archived events from main table
    DELETE FROM webhook_events WHERE created_at < cutoff_date;
    
    GET DIAGNOSTICS deleted_events = ROW_COUNT;
    
    RETURN QUERY SELECT archived_events, deleted_events;
END;
$$ LANGUAGE plpgsql;

-- Function to get event statistics
CREATE OR REPLACE FUNCTION get_event_statistics(
    start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours',
    end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
    source VARCHAR,
    event_type VARCHAR,
    total_count BIGINT,
    unique_repositories BIGINT,
    unique_actors BIGINT,
    first_event TIMESTAMPTZ,
    last_event TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        we.source,
        we.event_type,
        COUNT(*) as total_count,
        COUNT(DISTINCT we.repository) as unique_repositories,
        COUNT(DISTINCT we.actor) as unique_actors,
        MIN(we.created_at) as first_event,
        MAX(we.created_at) as last_event
    FROM webhook_events we
    WHERE we.created_at BETWEEN start_date AND end_date
    GROUP BY we.source, we.event_type
    ORDER BY total_count DESC;
END;
$$ LANGUAGE plpgsql;
`;

// Initialize database connection and schema
export async function initDatabase(config) {
  try {
    console.log('🔄 Initializing PostgreSQL database...');
    
    // Create connection pool
    pool = new Pool({
      user: config.database.user,
      password: config.database.password,
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: config.database.ssl || false
    });
    
    // Test connection
    const client = await pool.connect();
    
    try {
      // Create schema
      console.log('📋 Creating database schema...');
      await client.query(SCHEMA_SQL);
      console.log('✅ Database schema created successfully');
      
      isInitialized = true;
    } finally {
      client.release();
    }
    
    console.log('✅ PostgreSQL database initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error.message);
    throw error;
  }
}

// Check database health
export async function checkDatabaseHealth(config) {
  const start = Date.now();
  
  try {
    if (!pool) {
      throw new Error('Database not initialized');
    }
    
    const client = await pool.connect();
    
    try {
      // Simple health check query
      await client.query('SELECT NOW() as current_time, version() as pg_version');
      
      const responseTime = Date.now() - start;
      
      return {
        healthy: true,
        responseTime,
        timestamp: new Date().toISOString()
      };
    } finally {
      client.release();
    }
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      responseTime: Date.now() - start,
      timestamp: new Date().toISOString()
    };
  }
}

// Generate event hash for deduplication
function generateEventHash(event) {
  const hashData = {
    source: event.source,
    event_type: event.event_type,
    delivery_id: event.delivery_id,
    // Include key payload fields for better deduplication
    repository: event.repository,
    organization: event.organization,
    actor: event.actor,
    timestamp: event.timestamp
  };
  
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(hashData))
    .digest('hex');
}

// Store single event
export async function storeEvent(event, config) {
  try {
    if (!pool) {
      throw new Error('Database not initialized');
    }
    
    const client = await pool.connect();
    
    try {
      // Generate event hash for deduplication
      const eventHash = generateEventHash(event);
      
      // Check for duplicate
      const duplicateCheck = await client.query(
        'SELECT id FROM webhook_events WHERE event_hash = $1',
        [eventHash]
      );
      
      if (duplicateCheck.rows.length > 0) {
        console.log(`⚠️ Duplicate event detected: ${event.source}/${event.event_type}`);
        return { success: true, duplicate: true, id: duplicateCheck.rows[0].id };
      }
      
      // Insert event
      const result = await client.query(`
        INSERT INTO webhook_events (
          source, event_type, payload, repository, repository_id, organization, organization_id,
          actor, actor_id, actor_type, actor_email, channel, channel_id, channel_type,
          target_entity, target_entity_id, target_entity_type, headers, metadata, additional_context,
          raw_event_type, action, delivery_id, webhook_id, timestamp, request_id, event_hash
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
        ) RETURNING id
      `, [
        event.source, event.event_type, event.payload, event.repository, event.repository_id,
        event.organization, event.organization_id, event.actor, event.actor_id, event.actor_type,
        event.actor_email, event.channel, event.channel_id, event.channel_type, event.target_entity,
        event.target_entity_id, event.target_entity_type, event.headers, event.metadata,
        event.additional_context, event.raw_event_type, event.action, event.delivery_id,
        event.webhook_id, event.timestamp, event.request_id, eventHash
      ]);
      
      // Update metrics
      await updateEventMetrics(client, event, 'success');
      
      console.log(`✅ Event stored: ${event.source}/${event.event_type} (${result.rows[0].id})`);
      return { success: true, duplicate: false, id: result.rows[0].id };
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Failed to store event:', error.message);
    
    // Store failed event for retry
    if (config.enableRetry) {
      await storeFailedEvent(event, error.message, config);
    }
    
    return { success: false, error: error.message };
  }
}

// Store batch of events
export async function storeBatchEvents(events, config) {
  const results = {
    stored: [],
    duplicates: [],
    failed: []
  };
  
  if (!pool) {
    throw new Error('Database not initialized');
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    for (const event of events) {
      try {
        // Generate event hash for deduplication
        const eventHash = generateEventHash(event);
        
        // Check for duplicate
        const duplicateCheck = await client.query(
          'SELECT id FROM webhook_events WHERE event_hash = $1',
          [eventHash]
        );
        
        if (duplicateCheck.rows.length > 0) {
          results.duplicates.push({ event, id: duplicateCheck.rows[0].id });
          continue;
        }
        
        // Insert event
        const result = await client.query(`
          INSERT INTO webhook_events (
            source, event_type, payload, repository, repository_id, organization, organization_id,
            actor, actor_id, actor_type, actor_email, channel, channel_id, channel_type,
            target_entity, target_entity_id, target_entity_type, headers, metadata, additional_context,
            raw_event_type, action, delivery_id, webhook_id, timestamp, request_id, event_hash
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
          ) RETURNING id
        `, [
          event.source, event.event_type, event.payload, event.repository, event.repository_id,
          event.organization, event.organization_id, event.actor, event.actor_id, event.actor_type,
          event.actor_email, event.channel, event.channel_id, event.channel_type, event.target_entity,
          event.target_entity_id, event.target_entity_type, event.headers, event.metadata,
          event.additional_context, event.raw_event_type, event.action, event.delivery_id,
          event.webhook_id, event.timestamp, event.request_id, eventHash
        ]);
        
        // Update metrics
        await updateEventMetrics(client, event, 'success');
        
        results.stored.push({ event, id: result.rows[0].id });
        
      } catch (error) {
        console.error(`❌ Failed to store event in batch: ${error.message}`);
        results.failed.push({ event, error: error.message });
        
        // Update metrics for failed event
        await updateEventMetrics(client, event, 'failed');
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`📦 Batch processed: ${results.stored.length} stored, ${results.duplicates.length} duplicates, ${results.failed.length} failed`);
    
    // Store failed events for retry
    if (config.enableRetry && results.failed.length > 0) {
      for (const failedEvent of results.failed) {
        await storeFailedEvent(failedEvent.event, failedEvent.error, config);
      }
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Batch transaction failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
  
  return results;
}

// Store failed event for retry
async function storeFailedEvent(event, errorMessage, config) {
  try {
    if (!pool) return;
    
    const client = await pool.connect();
    
    try {
      const nextRetryAt = new Date(Date.now() + (config.retryDelay || 500) * Math.pow(2, 0));
      
      await client.query(`
        INSERT INTO webhook_events_failed (
          source, event_type, payload, error_message, error_details, max_retries, next_retry_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        event.source,
        event.event_type,
        event.payload,
        errorMessage,
        { originalEvent: event },
        config.maxRetries || 3,
        nextRetryAt
      ]);
      
      console.log(`💾 Failed event stored for retry: ${event.source}/${event.event_type}`);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Failed to store failed event:', error.message);
  }
}

// Update event metrics
async function updateEventMetrics(client, event, status) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    await client.query(`
      INSERT INTO webhook_event_metrics (date, source, event_type, total_count, success_count, failed_count)
      VALUES ($1, $2, $3, 1, $4, $5)
      ON CONFLICT (date, source, event_type)
      DO UPDATE SET
        total_count = webhook_event_metrics.total_count + 1,
        success_count = webhook_event_metrics.success_count + $4,
        failed_count = webhook_event_metrics.failed_count + $5,
        updated_at = NOW()
    `, [
      today,
      event.source,
      event.event_type,
      status === 'success' ? 1 : 0,
      status === 'failed' ? 1 : 0
    ]);
  } catch (error) {
    console.error('❌ Failed to update metrics:', error.message);
  }
}

// Get metrics
export async function getMetrics(config) {
  try {
    if (!pool) {
      throw new Error('Database not initialized');
    }
    
    const client = await pool.connect();
    
    try {
      // Get overall statistics
      const overallStats = await client.query(`
        SELECT 
          COUNT(*) as total_events,
          COUNT(DISTINCT source) as unique_sources,
          COUNT(DISTINCT repository) as unique_repositories,
          COUNT(DISTINCT organization) as unique_organizations,
          MIN(created_at) as first_event,
          MAX(created_at) as last_event
        FROM webhook_events
      `);
      
      // Get statistics by source
      const sourceStats = await client.query(`
        SELECT 
          source,
          COUNT(*) as total_events,
          COUNT(DISTINCT event_type) as unique_event_types,
          MIN(created_at) as first_event,
          MAX(created_at) as last_event
        FROM webhook_events
        GROUP BY source
        ORDER BY total_events DESC
      `);
      
      // Get recent activity (last 24 hours)
      const recentActivity = await client.query(`
        SELECT 
          source,
          event_type,
          COUNT(*) as count
        FROM webhook_events
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY source, event_type
        ORDER BY count DESC
        LIMIT 20
      `);
      
      // Get failed events count
      const failedEvents = await client.query(`
        SELECT COUNT(*) as failed_count
        FROM webhook_events_failed
        WHERE retry_count < max_retries
      `);
      
      // Get database size information
      const dbSize = await client.query(`
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) as database_size,
          pg_size_pretty(pg_total_relation_size('webhook_events')) as events_table_size
      `);
      
      return {
        overall: overallStats.rows[0],
        by_source: sourceStats.rows,
        recent_activity: recentActivity.rows,
        failed_events: failedEvents.rows[0],
        database: dbSize.rows[0],
        timestamp: new Date().toISOString()
      };
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Failed to get metrics:', error.message);
    throw error;
  }
}

// Retry failed events
export async function retryFailedEvents(config) {
  try {
    if (!pool) {
      throw new Error('Database not initialized');
    }
    
    const client = await pool.connect();
    
    try {
      // Get events ready for retry
      const failedEvents = await client.query(`
        SELECT * FROM webhook_events_failed
        WHERE retry_count < max_retries
        AND next_retry_at <= NOW()
        ORDER BY created_at
        LIMIT 100
      `);
      
      const results = {
        retried: 0,
        succeeded: 0,
        failed: 0
      };
      
      for (const failedEvent of failedEvents.rows) {
        try {
          // Attempt to store the event again
          const originalEvent = failedEvent.error_details.originalEvent;
          const result = await storeEvent(originalEvent, config);
          
          if (result.success) {
            // Remove from failed events table
            await client.query('DELETE FROM webhook_events_failed WHERE id = $1', [failedEvent.id]);
            results.succeeded++;
          } else {
            // Update retry count and next retry time
            const nextRetryAt = new Date(Date.now() + (config.retryDelay || 500) * Math.pow(2, failedEvent.retry_count + 1));
            
            await client.query(`
              UPDATE webhook_events_failed
              SET retry_count = retry_count + 1, next_retry_at = $1, updated_at = NOW()
              WHERE id = $2
            `, [nextRetryAt, failedEvent.id]);
            
            results.failed++;
          }
          
          results.retried++;
          
        } catch (error) {
          console.error(`❌ Failed to retry event ${failedEvent.id}:`, error.message);
          results.failed++;
        }
      }
      
      if (results.retried > 0) {
        console.log(`🔄 Retry completed: ${results.retried} attempted, ${results.succeeded} succeeded, ${results.failed} failed`);
      }
      
      return results;
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Failed to retry events:', error.message);
    throw error;
  }
}

// Cleanup old events
export async function cleanupOldEvents(config) {
  try {
    if (!pool) {
      throw new Error('Database not initialized');
    }
    
    const client = await pool.connect();
    
    try {
      const result = await client.query('SELECT * FROM cleanup_old_events($1)', [config.dataRetentionDays || 90]);
      
      const { archived_count, deleted_count } = result.rows[0];
      
      console.log(`🧹 Cleanup completed: ${archived_count} events archived, ${deleted_count} events deleted`);
      
      return { archived: archived_count, deleted: deleted_count };
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Failed to cleanup old events:', error.message);
    throw error;
  }
}

// Close database connection
export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    isInitialized = false;
    console.log('🔌 Database connection closed');
  }
}

// Export pool for advanced usage
export { pool };

