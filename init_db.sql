-- Enhanced Webhook Gateway Database Schema v2.0
-- This script handles both new installations and migrations from existing schemas

-- First, check if the main table exists
DO $$ 
DECLARE
    table_exists boolean;
BEGIN
    -- Check if webhook_events table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'webhook_events'
    ) INTO table_exists;

    -- Only perform column migrations if table exists
    IF table_exists THEN
        -- Check if received_at exists and rename to created_at
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'webhook_events' 
                   AND column_name = 'received_at'
                   AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                  WHERE table_name = 'webhook_events' 
                                  AND column_name = 'created_at')) THEN
            ALTER TABLE webhook_events RENAME COLUMN received_at TO created_at;
        END IF;

        -- Add missing columns to existing webhook_events table
        -- Add columns only if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'source') THEN
            ALTER TABLE webhook_events ADD COLUMN source TEXT NOT NULL DEFAULT 'unknown';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'event_type') THEN
            ALTER TABLE webhook_events ADD COLUMN event_type TEXT NOT NULL DEFAULT 'unknown';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'payload') THEN
            ALTER TABLE webhook_events ADD COLUMN payload JSONB NOT NULL DEFAULT '{}'::jsonb;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'repository') THEN
            ALTER TABLE webhook_events ADD COLUMN repository TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'repository_id') THEN
            ALTER TABLE webhook_events ADD COLUMN repository_id TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'organization') THEN
            ALTER TABLE webhook_events ADD COLUMN organization TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'organization_id') THEN
            ALTER TABLE webhook_events ADD COLUMN organization_id TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'actor') THEN
            ALTER TABLE webhook_events ADD COLUMN actor TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'actor_id') THEN
            ALTER TABLE webhook_events ADD COLUMN actor_id TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'actor_type') THEN
            ALTER TABLE webhook_events ADD COLUMN actor_type TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'actor_email') THEN
            ALTER TABLE webhook_events ADD COLUMN actor_email TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'channel') THEN
            ALTER TABLE webhook_events ADD COLUMN channel TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'channel_id') THEN
            ALTER TABLE webhook_events ADD COLUMN channel_id TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'channel_type') THEN
            ALTER TABLE webhook_events ADD COLUMN channel_type TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'target_entity') THEN
            ALTER TABLE webhook_events ADD COLUMN target_entity TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'target_entity_id') THEN
            ALTER TABLE webhook_events ADD COLUMN target_entity_id TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'target_entity_type') THEN
            ALTER TABLE webhook_events ADD COLUMN target_entity_type TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'headers') THEN
            ALTER TABLE webhook_events ADD COLUMN headers JSONB;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'metadata') THEN
            ALTER TABLE webhook_events ADD COLUMN metadata JSONB;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'additional_context') THEN
            ALTER TABLE webhook_events ADD COLUMN additional_context JSONB;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'raw_event_type') THEN
            ALTER TABLE webhook_events ADD COLUMN raw_event_type TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'action') THEN
            ALTER TABLE webhook_events ADD COLUMN action TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'delivery_id') THEN
            ALTER TABLE webhook_events ADD COLUMN delivery_id TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'webhook_id') THEN
            ALTER TABLE webhook_events ADD COLUMN webhook_id TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'timestamp') THEN
            ALTER TABLE webhook_events ADD COLUMN timestamp TIMESTAMPTZ;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'created_at') THEN
            ALTER TABLE webhook_events ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'processed_at') THEN
            ALTER TABLE webhook_events ADD COLUMN processed_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'version') THEN
            ALTER TABLE webhook_events ADD COLUMN version TEXT DEFAULT '2.0';
        END IF;

        -- Update constraint if needed
        -- Drop old constraint if exists
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'webhook_events_source_check' 
                   AND table_name = 'webhook_events') THEN
            ALTER TABLE webhook_events DROP CONSTRAINT webhook_events_source_check;
        END IF;
        
        -- Add new constraint
        ALTER TABLE webhook_events ADD CONSTRAINT webhook_events_source_check 
            CHECK (source IN ('github', 'linear', 'slack', 'unknown'));
    END IF;
END $$;

-- Create tables (will be skipped if they already exist)
-- Main events table with additional fields
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  version TEXT DEFAULT '2.0',
  CONSTRAINT webhook_events_source_check CHECK (source IN ('github', 'linear', 'slack', 'unknown'))
);

-- Failed events table for retry mechanism
CREATE TABLE IF NOT EXISTS webhook_events_failed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  date DATE NOT NULL,
  hour INTEGER NOT NULL,
  count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source, event_type, date, hour)
);

-- Event archive table for old events
CREATE TABLE IF NOT EXISTS webhook_events_archive (
  LIKE webhook_events INCLUDING ALL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_webhook_events_source ON webhook_events(source);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_repository ON webhook_events(repository);
CREATE INDEX IF NOT EXISTS idx_webhook_events_actor ON webhook_events(actor);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_delivery_id ON webhook_events(delivery_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_source_event_type ON webhook_events(source, event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_organization ON webhook_events(organization);
CREATE INDEX IF NOT EXISTS idx_webhook_events_channel_id ON webhook_events(channel_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_target_entity_id ON webhook_events(target_entity_id);

-- GIN index for JSONB columns
CREATE INDEX IF NOT EXISTS idx_webhook_events_payload_gin ON webhook_events USING GIN(payload);
CREATE INDEX IF NOT EXISTS idx_webhook_events_metadata_gin ON webhook_events USING GIN(metadata);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_webhook_events_search ON webhook_events USING GIN(
  to_tsvector('english', 
    COALESCE(repository, '') || ' ' || 
    COALESCE(actor, '') || ' ' || 
    COALESCE(event_type, '') || ' ' ||
    COALESCE(organization, '') || ' ' ||
    COALESCE(target_entity, '')
  )
);

-- Enable Row Level Security
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events_failed ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_event_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events_archive ENABLE ROW LEVEL SECURITY;

-- Create policies (if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'webhook_events_policy' AND tablename = 'webhook_events') THEN
        CREATE POLICY "webhook_events_policy" ON webhook_events FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'webhook_events_failed_policy' AND tablename = 'webhook_events_failed') THEN
        CREATE POLICY "webhook_events_failed_policy" ON webhook_events_failed FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'webhook_event_metrics_policy' AND tablename = 'webhook_event_metrics') THEN
        CREATE POLICY "webhook_event_metrics_policy" ON webhook_event_metrics FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'webhook_events_archive_policy' AND tablename = 'webhook_events_archive') THEN
        CREATE POLICY "webhook_events_archive_policy" ON webhook_events_archive FOR ALL USING (true);
    END IF;
END $$;

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

-- Function to get event statistics
CREATE OR REPLACE FUNCTION get_event_statistics(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_source TEXT DEFAULT NULL,
  p_event_type TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH stats AS (
    SELECT
      COUNT(*) AS total_events,
      COUNT(DISTINCT DATE(created_at)) AS active_days,
      COUNT(DISTINCT actor) AS unique_actors,
      COUNT(DISTINCT repository) AS unique_repositories,
      MIN(created_at) AS first_event,
      MAX(created_at) AS last_event,
      AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) AS avg_processing_time_seconds
    FROM webhook_events
    WHERE
      created_at BETWEEN p_start_date AND p_end_date
      AND (p_source IS NULL OR source = p_source)
      AND (p_event_type IS NULL OR event_type = p_event_type)
  ),
  hourly_distribution AS (
    SELECT
      EXTRACT(HOUR FROM created_at) AS hour,
      COUNT(*) AS count
    FROM webhook_events
    WHERE
      created_at BETWEEN p_start_date AND p_end_date
      AND (p_source IS NULL OR source = p_source)
      AND (p_event_type IS NULL OR event_type = p_event_type)
    GROUP BY EXTRACT(HOUR FROM created_at)
    ORDER BY hour
  ),
  top_actors AS (
    SELECT
      actor,
      COUNT(*) AS event_count
    FROM webhook_events
    WHERE
      created_at BETWEEN p_start_date AND p_end_date
      AND (p_source IS NULL OR source = p_source)
      AND (p_event_type IS NULL OR event_type = p_event_type)
      AND actor IS NOT NULL
    GROUP BY actor
    ORDER BY event_count DESC
    LIMIT 10
  ),
  top_repositories AS (
    SELECT
      repository,
      COUNT(*) AS event_count
    FROM webhook_events
    WHERE
      created_at BETWEEN p_start_date AND p_end_date
      AND (p_source IS NULL OR source = p_source)
      AND (p_event_type IS NULL OR event_type = p_event_type)
      AND repository IS NOT NULL
    GROUP BY repository
    ORDER BY event_count DESC
    LIMIT 10
  )
  SELECT jsonb_build_object(
    'summary', (SELECT row_to_json(stats.*) FROM stats),
    'hourly_distribution', (SELECT jsonb_agg(row_to_json(hourly_distribution.*)) FROM hourly_distribution),
    'top_actors', (SELECT jsonb_agg(row_to_json(top_actors.*)) FROM top_actors),
    'top_repositories', (SELECT jsonb_agg(row_to_json(top_repositories.*)) FROM top_repositories)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to search events with full-text search
CREATE OR REPLACE FUNCTION search_events(
  p_query TEXT,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_source TEXT DEFAULT NULL,
  p_event_type TEXT DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  source TEXT,
  event_type TEXT,
  repository TEXT,
  actor TEXT,
  created_at TIMESTAMPTZ,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.source,
    e.event_type,
    e.repository,
    e.actor,
    e.created_at,
    ts_rank(
      to_tsvector('english', 
        COALESCE(e.repository, '') || ' ' || 
        COALESCE(e.actor, '') || ' ' || 
        COALESCE(e.event_type, '') || ' ' ||
        COALESCE(e.organization, '') || ' ' ||
        COALESCE(e.target_entity, '')
      ),
      plainto_tsquery('english', p_query)
    ) AS relevance
  FROM webhook_events e
  WHERE
    to_tsvector('english', 
      COALESCE(e.repository, '') || ' ' || 
      COALESCE(e.actor, '') || ' ' || 
      COALESCE(e.event_type, '') || ' ' ||
      COALESCE(e.organization, '') || ' ' ||
      COALESCE(e.target_entity, '')
    ) @@ plainto_tsquery('english', p_query)
    AND (p_source IS NULL OR e.source = p_source)
    AND (p_event_type IS NULL OR e.event_type = p_event_type)
  ORDER BY relevance DESC, e.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
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
    SELECT * FROM webhook_events
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

-- Function to cleanup failed events
CREATE OR REPLACE FUNCTION cleanup_failed_events(p_days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM webhook_events_failed
    WHERE 
      failed_at < CURRENT_TIMESTAMP - (p_days_to_keep || ' days')::INTERVAL
      OR (resolved = TRUE AND resolved_at < CURRENT_TIMESTAMP - INTERVAL '7 days')
    RETURNING 1
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
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

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Webhook Gateway Database Schema v2.0 deployed successfully!';
    RAISE NOTICE 'Tables created: webhook_events, webhook_events_failed, webhook_event_metrics, webhook_events_archive';
    RAISE NOTICE 'Functions created: increment_event_metrics, get_event_aggregations, get_event_statistics, search_events, archive_old_events, cleanup_failed_events';
    RAISE NOTICE 'Indexes and policies have been set up for optimal performance.';
END $$;