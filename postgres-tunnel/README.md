# PostgreSQL + Cloudflare Tunnel for Event System

This module provides secure PostgreSQL database access via Cloudflare Tunnel for the event processing system.

## Features

- 🔐 **Secure Tunnel**: Cloudflare Tunnel for secure database access
- 📊 **Event Storage**: Comprehensive event schema for GitHub/Linear/Slack
- 🚀 **Auto-Setup**: Automated configuration and validation
- 🔍 **Monitoring**: Health checks and connection validation
- 📈 **Scalable**: Optimized for high-volume event processing

## Quick Start

```bash
# Setup PostgreSQL + Cloudflare Tunnel
npm run setup:postgres-tunnel

# Start tunnel service
npm run tunnel:start

# Test connection
npm run tunnel:test
```

## Configuration

Edit `.env` with your settings:

```env
# Cloudflare Configuration
CLOUDFLARE_TUNNEL_NAME=events-tunnel
CLOUDFLARE_DOMAIN=yourdomain.com
CLOUDFLARE_SUBDOMAIN=events-db

# PostgreSQL Configuration
POSTGRES_DB=events_db
POSTGRES_USER=events_user
POSTGRES_PASSWORD=your_secure_password
```

## Database Schema

The system automatically creates tables for:
- `github_events` - GitHub webhook events
- `linear_events` - Linear webhook events  
- `slack_events` - Slack webhook events
- `webhook_deliveries` - Delivery tracking
- `event_metadata` - Event processing metadata

## Security

- Read-only database user for external access
- Encrypted connections via Cloudflare Tunnel
- No exposed ports on local firewall
- Webhook signature validation

