# Webhook Gateway v3.0 - PostgreSQL Edition

A comprehensive webhook gateway built with Express.js that automatically captures and stores events from GitHub, Linear, and Slack in a local PostgreSQL database. Designed for robust event processing with enterprise-grade features.

## ✨ Features

- 🔄 **Multi-Platform Support**: GitHub, Linear, and Slack webhooks
- 🗄️ **PostgreSQL Storage**: Local database with comprehensive schema
- 📦 **Batch Processing**: Configurable event batching for performance
- 🔄 **Retry Mechanism**: Automatic retry for failed events
- 📊 **Metrics & Monitoring**: Built-in health checks and metrics
- 🛡️ **Security**: Webhook signature validation and rate limiting
- 🚀 **High Performance**: Connection pooling and optimized queries
- 📈 **Scalable**: Designed for production workloads

## 🚀 Quick Start

### One-Command Setup

**Get started in seconds with our interactive setup:**

```bash
npm run dev
```

This single command will:
- ✅ **Validate your system** and check prerequisites
- ✅ **Install dependencies** automatically if missing
- ✅ **Guide you through configuration** with interactive prompts
- ✅ **Detect and configure PostgreSQL** automatically
- ✅ **Create the database** and schema if needed
- ✅ **Fix common issues** automatically
- ✅ **Run health checks** to ensure everything works
- ✅ **Start the development server** when ready

### Prerequisites

- **Node.js** (v16 or higher)
- **PostgreSQL** (v12 or higher)
- **npm** or **yarn**

### Manual Installation

If you prefer manual setup:

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd webhook-gateway
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   npm run setup:env
   ```

4. **Configure your .env file**
   ```env
   # PostgreSQL Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=Events
   DB_USER=postgres
   DB_PASSWORD=password
   
   # Webhook Secrets (get these from your platforms)
   GITHUB_WEBHOOK_SECRET=your_github_webhook_secret_here
   LINEAR_WEBHOOK_SECRET=your_linear_webhook_secret_here
   SLACK_SIGNING_SECRET=your_slack_signing_secret_here
   ```

5. **Set up the database**
   ```bash
   npm run setup:db
   ```

6. **Start the server**
   ```bash
   npm start
   ```

## 📁 Project Structure

```
webhook-gateway/
├── src/
│   ├── server.js              # Main Express server
│   ├── config.js              # Configuration management
│   ├── handlers/
│   │   ├── github.js          # GitHub webhook handler
│   │   ├── linear.js          # Linear webhook handler
│   │   └── slack.js           # Slack webhook handler
│   └── utils/
│       ├── postgresql.js      # Database operations
│       ├── security.js        # Security utilities
│       ├── monitoring.js      # Monitoring utilities
│       ├── metadata.js        # Metadata extraction
│       └── testing.js         # Testing utilities
├── scripts/                   # Setup and utility scripts
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

## 🔧 Configuration

### Database Configuration

The application uses PostgreSQL with the following default settings:

- **Database Name**: `Events`
- **User**: `postgres`
- **Password**: `password`
- **Host**: `localhost`
- **Port**: `5432`

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `Events` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `password` |
| `PORT` | Server port | `3000` |
| `ENABLE_BATCHING` | Enable batch processing | `true` |
| `BATCH_SIZE` | Events per batch | `50` |
| `BATCH_INTERVAL` | Batch interval (ms) | `5000` |

## 📊 Database Schema

All events are automatically stored in PostgreSQL with:

- **Event deduplication** using SHA-256 hashes
- **Comprehensive indexing** for fast queries
- **Automatic archiving** of old events
- **Metrics tracking** for monitoring
- **Failed event retry** mechanism

### Main Tables

- `webhook_events` - Primary event storage
- `webhook_events_failed` - Failed events for retry
- `webhook_event_metrics` - Daily metrics aggregation
- `webhook_events_archive` - Archived old events

## 🔗 Webhook Endpoints

Once running, your webhook endpoints will be:

- **GitHub**: `http://localhost:3000/webhook/github`
- **Linear**: `http://localhost:3000/webhook/linear`
- **Slack**: `http://localhost:3000/webhook/slack`

### Monitoring Endpoints

- **Health Check**: `http://localhost:3000/health`
- **Metrics**: `http://localhost:3000/metrics`

## 🛠️ Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | **🌟 Interactive development setup** - Complete guided setup |
| `npm start` | Start the webhook gateway server |
| `npm run dev:simple` | Start server without setup (requires manual configuration) |
| `npm run setup:env` | Create .env file with default configuration |
| `npm run setup:db` | Initialize PostgreSQL database and schema |
| `npm run setup:webhooks` | Configure webhooks for GitHub, Linear, and Slack |
| `npm run health:check` | Run comprehensive health checks |
| `npm run validate:system` | Validate system requirements and configuration |
| `npm run fix:auto` | Automatically fix common issues |
| `npm run fix:interactive` | Interactive issue fixing with options |
| `npm run diagnose:linear` | Diagnose Linear webhook configuration |

### Development Workflow

1. **First time setup**: `npm run dev`
2. **Daily development**: `npm start` or `npm run dev:simple`
3. **Troubleshooting**: `npm run validate:system` then `npm run fix:auto`
4. **Health monitoring**: `npm run health:check`

## 🔍 Monitoring & Debugging

### Health Checks

```bash
npm run health:check
```

### View Metrics

```bash
npm run metrics
```

### Database Queries

```sql
-- View recent events
SELECT source, event_type, created_at 
FROM webhook_events 
ORDER BY created_at DESC 
LIMIT 10;

-- Event statistics by source
SELECT source, COUNT(*) as total_events 
FROM webhook_events 
GROUP BY source;

-- Failed events
SELECT * FROM webhook_events_failed 
WHERE retry_count < max_retries;
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Ensure PostgreSQL is running: `service postgresql start`
   - Check database exists: `psql -l | grep Events`
   - Verify credentials in `.env`

2. **Webhook Signature Validation Failed**
   - Check webhook secrets in `.env`
   - Verify webhook configuration in platforms

3. **Events Not Storing**
   - Check database schema: `npm run setup:db`
   - Review server logs for errors
   - Verify database permissions

### Logs

```bash
# View real-time logs
npm run logs:live

# View error logs only
npm run logs:errors
```

## 🔒 Security

- **Webhook signature validation** for all platforms
- **Rate limiting** to prevent abuse
- **Input validation** and sanitization
- **SQL injection protection** with parameterized queries
- **CORS and security headers** via Helmet.js

## 📈 Performance

- **Connection pooling** for database efficiency
- **Batch processing** for high-throughput scenarios
- **Optimized indexes** for fast queries
- **Automatic cleanup** of old data
- **Metrics collection** for monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

**🎉 Happy webhook capturing!** Your events are now flowing automatically from GitHub, Linear, and Slack into your local PostgreSQL database with enterprise-grade reliability and performance.
