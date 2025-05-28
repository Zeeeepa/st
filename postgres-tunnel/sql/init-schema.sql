-- Event System Database Schema
-- Comprehensive schema for GitHub, Linear, and Slack events

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- GitHub Events Table
CREATE TABLE IF NOT EXISTS github_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    action VARCHAR(100),
    repository_name VARCHAR(255),
    repository_full_name VARCHAR(255),
    repository_id BIGINT,
    sender_login VARCHAR(255),
    sender_id BIGINT,
    organization VARCHAR(255),
    
    -- Event-specific data
    pull_request_number INTEGER,
    pull_request_title TEXT,
    pull_request_state VARCHAR(50),
    issue_number INTEGER,
    issue_title TEXT,
    issue_state VARCHAR(50),
    commit_sha VARCHAR(40),
    commit_message TEXT,
    branch_name VARCHAR(255),
    tag_name VARCHAR(255),
    
    -- Metadata
    payload JSONB NOT NULL,
    headers JSONB,
    signature VARCHAR(255),
    delivery_id VARCHAR(255),
    
    -- Timestamps
    event_timestamp TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Processing status
    status VARCHAR(50) DEFAULT 'received',
    error_message TEXT,
    retry_count INTEGER DEFAULT 0
);

-- Linear Events Table
CREATE TABLE IF NOT EXISTS linear_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    action VARCHAR(100),
    
    -- Linear-specific data
    team_id VARCHAR(255),
    team_name VARCHAR(255),
    project_id VARCHAR(255),
    project_name VARCHAR(255),
    issue_id VARCHAR(255),
    issue_identifier VARCHAR(100),
    issue_title TEXT,
    issue_state VARCHAR(100),
    issue_priority INTEGER,
    assignee_id VARCHAR(255),
    assignee_name VARCHAR(255),
    creator_id VARCHAR(255),
    creator_name VARCHAR(255),
    
    -- Comment data
    comment_id VARCHAR(255),
    comment_body TEXT,
    
    -- Metadata
    payload JSONB NOT NULL,
    headers JSONB,
    signature VARCHAR(255),
    delivery_id VARCHAR(255),
    
    -- Timestamps
    event_timestamp TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Processing status
    status VARCHAR(50) DEFAULT 'received',
    error_message TEXT,
    retry_count INTEGER DEFAULT 0
);

-- Slack Events Table
CREATE TABLE IF NOT EXISTS slack_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_subtype VARCHAR(100),
    
    -- Slack-specific data
    team_id VARCHAR(255),
    team_domain VARCHAR(255),
    channel_id VARCHAR(255),
    channel_name VARCHAR(255),
    channel_type VARCHAR(50),
    user_id VARCHAR(255),
    user_name VARCHAR(255),
    bot_id VARCHAR(255),
    
    -- Message data
    message_text TEXT,
    message_ts VARCHAR(50),
    thread_ts VARCHAR(50),
    
    -- File data
    file_id VARCHAR(255),
    file_name VARCHAR(255),
    file_type VARCHAR(100),
    
    -- Metadata
    payload JSONB NOT NULL,
    headers JSONB,
    signature VARCHAR(255),
    
    -- Timestamps
    event_timestamp TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Processing status
    status VARCHAR(50) DEFAULT 'received',
    error_message TEXT,
    retry_count INTEGER DEFAULT 0
);

-- Webhook Deliveries Table (for tracking delivery attempts)
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_id VARCHAR(255) UNIQUE NOT NULL,
    webhook_source VARCHAR(50) NOT NULL, -- 'github', 'linear', 'slack'
    event_type VARCHAR(100) NOT NULL,
    target_url VARCHAR(500) NOT NULL,
    
    -- Request details
    request_headers JSONB,
    request_body JSONB,
    request_method VARCHAR(10) DEFAULT 'POST',
    
    -- Response details
    response_status INTEGER,
    response_headers JSONB,
    response_body TEXT,
    response_time_ms INTEGER,
    
    -- Delivery status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'delivered', 'failed', 'retrying'
    attempt_count INTEGER DEFAULT 1,
    max_attempts INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    
    -- Error tracking
    error_message TEXT,
    error_code VARCHAR(100)
);

-- Event Metadata Table (for processing statistics and monitoring)
CREATE TABLE IF NOT EXISTS event_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    source VARCHAR(50) NOT NULL, -- 'github', 'linear', 'slack'
    event_type VARCHAR(100) NOT NULL,
    
    -- Counts
    total_events INTEGER DEFAULT 0,
    successful_events INTEGER DEFAULT 0,
    failed_events INTEGER DEFAULT 0,
    retried_events INTEGER DEFAULT 0,
    
    -- Performance metrics
    avg_processing_time_ms NUMERIC(10,2),
    min_processing_time_ms INTEGER,
    max_processing_time_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(date, source, event_type)
);

-- Webhook Configuration Table (for managing webhook endpoints)
CREATE TABLE IF NOT EXISTS webhook_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(50) NOT NULL, -- 'github', 'linear', 'slack'
    webhook_id VARCHAR(255),
    webhook_url VARCHAR(500) NOT NULL,
    secret VARCHAR(255),
    
    -- Configuration
    events TEXT[], -- Array of event types to listen for
    active BOOLEAN DEFAULT true,
    
    -- Repository/Team specific (for GitHub/Linear)
    repository_id BIGINT,
    repository_name VARCHAR(255),
    team_id VARCHAR(255),
    team_name VARCHAR(255),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_delivery_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'error'
    error_message TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_github_events_event_type ON github_events(event_type);
CREATE INDEX IF NOT EXISTS idx_github_events_repository ON github_events(repository_full_name);
CREATE INDEX IF NOT EXISTS idx_github_events_received_at ON github_events(received_at);
CREATE INDEX IF NOT EXISTS idx_github_events_status ON github_events(status);
CREATE INDEX IF NOT EXISTS idx_github_events_sender ON github_events(sender_login);

CREATE INDEX IF NOT EXISTS idx_linear_events_event_type ON linear_events(event_type);
CREATE INDEX IF NOT EXISTS idx_linear_events_team ON linear_events(team_id);
CREATE INDEX IF NOT EXISTS idx_linear_events_received_at ON linear_events(received_at);
CREATE INDEX IF NOT EXISTS idx_linear_events_status ON linear_events(status);
CREATE INDEX IF NOT EXISTS idx_linear_events_issue ON linear_events(issue_id);

CREATE INDEX IF NOT EXISTS idx_slack_events_event_type ON slack_events(event_type);
CREATE INDEX IF NOT EXISTS idx_slack_events_channel ON slack_events(channel_id);
CREATE INDEX IF NOT EXISTS idx_slack_events_received_at ON slack_events(received_at);
CREATE INDEX IF NOT EXISTS idx_slack_events_status ON slack_events(status);
CREATE INDEX IF NOT EXISTS idx_slack_events_user ON slack_events(user_id);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_source ON webhook_deliveries(webhook_source);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(created_at);

CREATE INDEX IF NOT EXISTS idx_event_metadata_date_source ON event_metadata(date, source);
CREATE INDEX IF NOT EXISTS idx_webhook_configurations_source ON webhook_configurations(source);

-- Create views for common queries
CREATE OR REPLACE VIEW recent_events AS
SELECT 
    'github' as source,
    event_type,
    repository_full_name as identifier,
    sender_login as actor,
    received_at,
    status
FROM github_events 
WHERE received_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'

UNION ALL

SELECT 
    'linear' as source,
    event_type,
    COALESCE(issue_identifier, team_name) as identifier,
    creator_name as actor,
    received_at,
    status
FROM linear_events 
WHERE received_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'

UNION ALL

SELECT 
    'slack' as source,
    event_type,
    channel_name as identifier,
    user_name as actor,
    received_at,
    status
FROM slack_events 
WHERE received_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'

ORDER BY received_at DESC;

CREATE OR REPLACE VIEW event_summary AS
SELECT 
    DATE(received_at) as date,
    'github' as source,
    event_type,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE status = 'processed') as successful_events,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_events
FROM github_events 
WHERE received_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY DATE(received_at), event_type

UNION ALL

SELECT 
    DATE(received_at) as date,
    'linear' as source,
    event_type,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE status = 'processed') as successful_events,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_events
FROM linear_events 
WHERE received_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY DATE(received_at), event_type

UNION ALL

SELECT 
    DATE(received_at) as date,
    'slack' as source,
    event_type,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE status = 'processed') as successful_events,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_events
FROM slack_events 
WHERE received_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY DATE(received_at), event_type

ORDER BY date DESC, source, event_type;

-- Function to update event metadata
CREATE OR REPLACE FUNCTION update_event_metadata()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO event_metadata (date, source, event_type, total_events, successful_events, failed_events)
    VALUES (
        CURRENT_DATE,
        CASE 
            WHEN TG_TABLE_NAME = 'github_events' THEN 'github'
            WHEN TG_TABLE_NAME = 'linear_events' THEN 'linear'
            WHEN TG_TABLE_NAME = 'slack_events' THEN 'slack'
        END,
        NEW.event_type,
        1,
        CASE WHEN NEW.status = 'processed' THEN 1 ELSE 0 END,
        CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END
    )
    ON CONFLICT (date, source, event_type) 
    DO UPDATE SET
        total_events = event_metadata.total_events + 1,
        successful_events = event_metadata.successful_events + 
            CASE WHEN NEW.status = 'processed' THEN 1 ELSE 0 END,
        failed_events = event_metadata.failed_events + 
            CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update metadata
CREATE TRIGGER github_events_metadata_trigger
    AFTER INSERT ON github_events
    FOR EACH ROW EXECUTE FUNCTION update_event_metadata();

CREATE TRIGGER linear_events_metadata_trigger
    AFTER INSERT ON linear_events
    FOR EACH ROW EXECUTE FUNCTION update_event_metadata();

CREATE TRIGGER slack_events_metadata_trigger
    AFTER INSERT ON slack_events
    FOR EACH ROW EXECUTE FUNCTION update_event_metadata();

-- Insert sample data for testing
INSERT INTO github_events (
    event_id, event_type, action, repository_name, repository_full_name, 
    sender_login, payload, event_timestamp
) VALUES (
    'sample-github-event-1',
    'push',
    'push',
    'test-repo',
    'user/test-repo',
    'testuser',
    '{"ref": "refs/heads/main", "commits": []}',
    CURRENT_TIMESTAMP
) ON CONFLICT (event_id) DO NOTHING;

INSERT INTO linear_events (
    event_id, event_type, action, team_name, issue_title, 
    creator_name, payload, event_timestamp
) VALUES (
    'sample-linear-event-1',
    'Issue',
    'create',
    'Engineering',
    'Sample issue for testing',
    'testuser',
    '{"issue": {"title": "Sample issue"}}',
    CURRENT_TIMESTAMP
) ON CONFLICT (event_id) DO NOTHING;

INSERT INTO slack_events (
    event_id, event_type, channel_name, user_name, 
    message_text, payload, event_timestamp
) VALUES (
    'sample-slack-event-1',
    'message',
    'general',
    'testuser',
    'Hello, this is a test message',
    '{"text": "Hello, this is a test message"}',
    CURRENT_TIMESTAMP
) ON CONFLICT (event_id) DO NOTHING;

