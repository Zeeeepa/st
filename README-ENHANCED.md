# Enhanced Event Processing System

A comprehensive webhook gateway that captures and stores events from GitHub, Linear, and Slack in PostgreSQL, with secure access via Cloudflare Tunnel for Codegen integration.

## 🚀 Features

### Core Capabilities
- **Multi-Platform Events**: GitHub, Linear, and Slack webhook processing
- **PostgreSQL Storage**: Comprehensive event schema with full-text search
- **Cloudflare Tunnel**: Secure database access without exposed ports
- **Codegen Integration**: Read-only database access for AI analysis
- **Real-time Processing**: High-performance event ingestion and storage
- **Webhook Management**: Automated webhook setup and validation

### Security & Performance
- **Signature Validation**: Cryptographic verification for all webhooks
- **Rate Limiting**: Protection against abuse and spam
- **Batch Processing**: Configurable batching for high-volume events
- **Connection Pooling**: Optimized database connections
- **SSL/TLS Encryption**: End-to-end encrypted connections

### Monitoring & Analytics
- **Health Checks**: Comprehensive system health monitoring
- **Metrics Dashboard**: Real-time performance and usage metrics
- **Event Analytics**: Detailed event statistics and trends
- **Error Tracking**: Comprehensive error logging and alerting

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   GitHub API    │    │   Linear API     │    │   Slack API     │
│   Webhooks      │    │   Webhooks       │    │   Webhooks      │
└─────────┬───────┘    └─────────┬────────┘    └─────────┬───────┘
          │                      │                       │
          └──────────────────────┼───────────────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │  Enhanced Event Server   │
                    │  • Signature Validation  │
                    │  • Event Processing      │
                    │  • Batch Operations      │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │     PostgreSQL DB        │
                    │  • Event Storage         │
                    │  • Analytics Views       │
                    │  • Full-text Search      │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │   Cloudflare Tunnel      │
                    │  • Secure Access         │
                    │  • No Exposed Ports      │
                    │  • SSL Encryption        │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │      Codegen AI          │
                    │  • Read-only Access      │
                    │  • Event Analysis        │
                    │  • Insights Generation   │
                    └──────────────────────────┘
```

## 🚀 Quick Start

### One-Command Setup

```bash
# Complete system setup
npm run setup:enhanced-system
```

This single command will:
- ✅ Install and configure PostgreSQL
- ✅ Set up Cloudflare Tunnel authentication
- ✅ Create secure database tunnel
- ✅ Initialize event schema
- ✅ Configure webhook endpoints
- ✅ Validate entire system
- ✅ Generate Codegen connection details

### Manual Setup

If you prefer step-by-step setup:

```bash
# 1. Setup PostgreSQL + Cloudflare Tunnel
npm run setup:postgres-tunnel

# 2. Start the tunnel
npm run tunnel:service

# 3. Start the enhanced server
npm run enhanced:start

# 4. Test the connection
npm run tunnel:test
```

## 📋 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=events_db
POSTGRES_USER=events_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_CODEGEN_USER=codegen_readonly
POSTGRES_CODEGEN_PASSWORD=codegen_secure_password

# Cloudflare Configuration
CLOUDFLARE_DOMAIN=yourdomain.com
CLOUDFLARE_SUBDOMAIN=events-db
CLOUDFLARE_TUNNEL_NAME=events-tunnel

# Webhook Secrets
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret
LINEAR_WEBHOOK_SECRET=your_linear_webhook_secret
SLACK_SIGNING_SECRET=your_slack_signing_secret

# API Keys (for webhook setup)
GITHUB_TOKEN=your_github_personal_access_token
LINEAR_API_KEY=your_linear_api_key
SLACK_BOT_TOKEN=your_slack_bot_token

# Server Configuration
SERVER_PORT=3000
NODE_ENV=production
```

### Webhook Configuration

The system automatically configures webhooks for:

#### GitHub
- **Events**: All events (`*`)
- **URL**: `https://your-tunnel-url/webhook/github`
- **Content Type**: `application/json`
- **Secret**: Uses `GITHUB_WEBHOOK_SECRET`

#### Linear
- **Events**: Issues, Comments, Projects
- **URL**: `https://your-tunnel-url/webhook/linear`
- **Secret**: Uses `LINEAR_WEBHOOK_SECRET`

#### Slack
- **URL**: `https://your-tunnel-url/webhook/slack`
- **Events**: Configurable in Slack app settings
- **Verification**: Uses `SLACK_SIGNING_SECRET`

## 🗄️ Database Schema

### Core Tables

#### `github_events`
Stores all GitHub webhook events with extracted metadata:
- Repository information
- Pull request details
- Issue tracking
- Commit information
- User actions

#### `linear_events`
Stores Linear webhook events:
- Issue lifecycle
- Project updates
- Team activities
- Comment threads
- State changes

#### `slack_events`
Stores Slack events:
- Message activities
- Channel events
- User interactions
- File sharing
- Bot activities

#### `webhook_deliveries`
Tracks webhook delivery attempts:
- Delivery status
- Response times
- Retry attempts
- Error tracking

#### `event_metadata`
Aggregated statistics:
- Daily event counts
- Success/failure rates
- Performance metrics

### Views

#### `recent_events`
Unified view of recent events from all sources

#### `event_summary`
Daily aggregated statistics by source and event type

## 🔧 API Endpoints

### Webhook Endpoints
- `POST /webhook/github` - GitHub webhook handler
- `POST /webhook/linear` - Linear webhook handler
- `POST /webhook/slack` - Slack webhook handler

### Management Endpoints
- `GET /health` - System health check
- `GET /metrics` - Performance metrics
- `GET /events` - Query events with filters
- `GET /events/summary` - Event statistics
- `GET /webhooks` - List configured webhooks
- `POST /webhooks/setup` - Setup webhooks
- `POST /webhooks/validate` - Validate webhook endpoints

### Codegen Integration
- `GET /codegen/connection-info` - Database connection details

## 🔐 Security

### Webhook Validation
- **GitHub**: SHA-256 HMAC signature validation
- **Linear**: HMAC signature validation
- **Slack**: Request signature and timestamp validation

### Database Security
- **Read-only User**: Codegen has limited SELECT permissions
- **Encrypted Connections**: All connections use SSL/TLS
- **No Exposed Ports**: Database access only via Cloudflare Tunnel

### Network Security
- **Rate Limiting**: Configurable request limits
- **CORS Protection**: Restricted cross-origin requests
- **Helmet.js**: Security headers and protections

## 📊 Monitoring

### Health Checks
```bash
# Check system health
curl http://localhost:3000/health

# Check tunnel status
npm run tunnel:status

# Test database connection
npm run tunnel:test
```

### Metrics
```bash
# View system metrics
curl http://localhost:3000/metrics

# View event summary
curl http://localhost:3000/events/summary?days=7
```

### Logs
```bash
# View tunnel logs
npm run tunnel:logs

# View server logs (if running as service)
journalctl -u enhanced-event-server -f
```

## 🚀 Deployment

### Local Development
```bash
# Start in development mode
npm run enhanced:dev

# Start tunnel in foreground
npm run tunnel:start
```

### Production Deployment
```bash
# Start tunnel as service
npm run tunnel:service

# Start server as service
npm run enhanced:start

# Verify everything is running
npm run tunnel:status
```

### Docker Deployment
```bash
# Build and start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f
```

## 🔗 Codegen Integration

### Connection Details
After setup, you'll receive connection details like:

```
Host: events-db.yourdomain.com
Port: 5432
Database: events_db
Username: codegen_readonly
Password: [generated_secure_password]
SSL Mode: require
```

### Available Data
Codegen can query:
- **All webhook events** from GitHub, Linear, and Slack
- **Event metadata** and statistics
- **Delivery tracking** and performance metrics
- **Aggregated views** for analysis

### Example Queries
```sql
-- Recent events across all platforms
SELECT * FROM recent_events LIMIT 100;

-- Event summary by source
SELECT source, COUNT(*) as total_events 
FROM recent_events 
GROUP BY source;

-- GitHub pull request events
SELECT repository_full_name, pull_request_title, action, received_at
FROM github_events 
WHERE event_type = 'pull_request' 
ORDER BY received_at DESC;

-- Linear issue activity
SELECT team_name, issue_title, action, creator_name, received_at
FROM linear_events 
WHERE event_type = 'Issue' 
ORDER BY received_at DESC;
```

## 🛠️ Management Commands

### Tunnel Management
```bash
npm run tunnel:start      # Start in foreground
npm run tunnel:service    # Start as background service
npm run tunnel:stop       # Stop tunnel service
npm run tunnel:status     # Check status
npm run tunnel:test       # Test connection
```

### Server Management
```bash
npm run enhanced:start    # Start enhanced server
npm run enhanced:dev      # Start in development mode
npm run start:original    # Start original server
```

### Database Management
```bash
npm run setup:db          # Setup database
npm run setup:db:fix      # Fix authentication issues
npm run health:check      # Check database health
```

### Webhook Management
```bash
npm run setup:webhooks    # Setup all webhooks
```

## 🔍 Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection manually
psql -h localhost -U events_user -d events_db

# Fix authentication
npm run setup:db:fix
```

#### Tunnel Not Working
```bash
# Check tunnel status
npm run tunnel:status

# Restart tunnel
npm run tunnel:stop
npm run tunnel:service

# Check Cloudflare authentication
cloudflared tunnel list
```

#### Webhook Validation Failing
```bash
# Validate webhook configuration
curl -X POST http://localhost:3000/webhooks/validate

# Check webhook secrets in .env file
# Ensure secrets match those configured in GitHub/Linear/Slack
```

### Log Locations
- **Tunnel Logs**: `journalctl -u events-tunnel -f` (Linux) or `~/Library/Logs/com.cloudflare.events-tunnel.log` (macOS)
- **Server Logs**: Console output or configured log files
- **Database Logs**: `/var/log/postgresql/` (Linux)

## 📈 Performance Tuning

### Database Optimization
```sql
-- Analyze table statistics
ANALYZE github_events;
ANALYZE linear_events;
ANALYZE slack_events;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes;
```

### Batch Processing
Configure in `.env`:
```env
ENABLE_BATCHING=true
BATCH_SIZE=100
BATCH_INTERVAL=5000
```

### Connection Pooling
```env
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Create GitHub issues for bugs or feature requests
- **Logs**: Check system logs for detailed error information
- **Health Checks**: Use built-in health endpoints for diagnostics

---

**🎉 Your Enhanced Event Processing System is ready to capture and analyze all your development events!**

