# Webhook Gateway v3.0 - Local PostgreSQL Edition

A comprehensive webhook gateway built with Node.js and Express that automatically captures and stores events from GitHub, Linear, and Slack in a local PostgreSQL database. Designed for zero-configuration setup with automatic database creation and webhook management.

## 🚀 Quick Start

**One command to rule them all:**

```bash
npm run dev
```

This single command will:
- ✅ Validate your environment and prerequisites
- ✅ Create PostgreSQL database if it doesn't exist
- ✅ Set up your database schema automatically
- ✅ Start the Express server
- ✅ Begin capturing events immediately

## 📋 Prerequisites

- **Node.js** >= 16.0.0
- **npm** (comes with Node.js)
- **PostgreSQL** >= 12.0 (running locally)

## ⚙️ Configuration

Create a `.env` file in the root directory with your configuration:

```env
# Server Configuration
PORT=3000
HOST=localhost
NODE_ENV=development

# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Events
DB_USER=postgres
DB_PASSWORD=password

# GitHub Configuration (Optional)
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Linear Configuration (Optional)
LINEAR_API_KEY=your_linear_api_key
LINEAR_WEBHOOK_SECRET=your_webhook_secret

# Slack Configuration (Optional)
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your_signing_secret
SLACK_APP_ID=your_app_id

# Processing Configuration
DEBUG=true
ENABLE_BATCHING=true
ENABLE_METRICS=true
ENABLE_RETRY=true
BATCH_SIZE=50
BATCH_INTERVAL=5000
MAX_RETRIES=3
RETRY_DELAY=500
```

## 🏗️ Project Structure

```
webhook-gateway/
├── src/
│   ├── server.js              # Main Express server entry point
│   ├── config.js              # Configuration management
│   ├── handlers/
│   │   ├── github.js          # GitHub webhook event processing
│   │   ├── linear.js          # Linear webhook event processing
│   │   └── slack.js           # Slack webhook event processing
│   └── utils/
│       ├── postgresql.js      # PostgreSQL database operations
│       ├── security.js        # Signature verification
│       └── metadata.js        # Event metadata extraction
├── scripts/
│   ├── dev-setup.js           # 🌟 Main development setup script
│   ├── create-database.js     # Database creation script
│   ├── setup.js               # Comprehensive webhook setup
│   ├── managers/
│   │   ├── github-webhook-manager.js    # GitHub webhook automation
│   │   ├── linear-webhook-manager.js    # Linear webhook automation
│   │   └── slack-webhook-manager.js     # Slack webhook automation
│   ├── setup-database.js      # Database schema setup
│   ├── test-webhook.js        # Webhook testing utilities
│   └── health-check.js        # System health validation
├── package.json               # Dependencies and scripts
├── ecosystem.config.js        # PM2 configuration
└── .env                      # Environment configuration
```

## 🔧 Available Commands

### Development
```bash
npm run dev              # 🌟 Complete setup + development server
npm run dev:start        # Start development server with nodemon
npm run dev:simple       # Start development server only
npm start                # Start production server
```

### Database Management
```bash
npm run db:create        # Create PostgreSQL database
npm run setup:db         # Set up database schema only
npm run db:migrate       # Run database migrations
npm run db:reset         # Reset database schema
npm run db:backup        # Backup database
```

### Setup & Configuration
```bash
npm run setup            # Run complete webhook setup
npm run setup:check      # Validate current setup
```

### Testing & Validation
```bash
npm run webhook:test     # Test all webhook endpoints
npm run webhook:github   # Test GitHub webhooks only
npm run webhook:linear   # Test Linear webhooks only
npm run webhook:slack    # Test Slack webhooks only
npm run health:check     # System health check
```

### Process Management (PM2)
```bash
npm run pm2:start        # Start with PM2
npm run pm2:stop         # Stop PM2 process
npm run pm2:restart      # Restart PM2 process
npm run pm2:delete       # Delete PM2 process
npm run logs             # View PM2 logs
```

## 🌐 Webhook Endpoints

Once running, your webhook gateway will be available at:

- **GitHub**: `http://localhost:3000/webhook/github`
- **Linear**: `http://localhost:3000/webhook/linear`
- **Slack**: `http://localhost:3000/webhook/slack`
- **Health**: `http://localhost:3000/health`
- **Metrics**: `http://localhost:3000/metrics`

## 🗄️ Database Setup

### Automatic Database Creation

The system automatically creates the PostgreSQL database and schema:

1. **Database Creation**: If the `Events` database doesn't exist, it will be created automatically
2. **Schema Initialization**: All required tables, indexes, and functions are created
3. **User Management**: Uses the specified PostgreSQL user (`postgres` by default)

### Manual Database Creation

If you prefer to create the database manually:

```bash
# Connect to PostgreSQL
psql -h localhost -p 5432 -U postgres

# Create database
CREATE DATABASE "Events";

# Exit and run schema setup
npm run setup:db
```

### Database Schema

Events are stored in the `webhook_events` table with:
- Source platform (github, linear, slack)
- Event type and action
- Actor information
- Repository/organization context
- Rich metadata and additional context
- Timestamps and delivery information

Additional tables:
- `webhook_events_failed` - Failed events for retry mechanism
- `webhook_event_metrics` - Event analytics and metrics
- `webhook_events_archive` - Archived old events

## 🔄 Automatic Features

### Event Processing
- **Deduplication**: Prevents duplicate events using intelligent hashing
- **Batch Processing**: Efficient bulk operations for high throughput
- **Retry Logic**: Automatic retry for failed operations with exponential backoff
- **Rate Limiting**: Built-in rate limiting to prevent abuse

### Database Management
- **Auto-creation**: Database and schema created automatically if missing
- **Health Monitoring**: Continuous database health checks
- **Archiving**: Automatic archiving of old events
- **Metrics**: Real-time event processing metrics

## 📊 Event Storage

All events are automatically stored in PostgreSQL with:
- **Rich Metadata**: Comprehensive event context and searchable fields
- **JSON Support**: Full JSONB support for complex event payloads
- **Indexing**: Optimized indexes for fast queries
- **Full-text Search**: Built-in search capabilities
- **Analytics**: Event aggregation and statistics functions

## 🔍 Monitoring & Debugging

### Real-time Logs
```bash
npm run logs             # PM2 logs
npm run logs:errors      # Error logs only
npm run logs:live        # Live log streaming
```

### Health Monitoring
```bash
npm run health:check     # Comprehensive health check
curl http://localhost:3000/health  # Quick health check
```

### Metrics
```bash
npm run metrics          # Performance and usage metrics
curl http://localhost:3000/metrics  # API metrics
```

## 🛠️ Troubleshooting

### Database Connection Issues

**Error: Database connection failed**
1. **Check PostgreSQL Status**:
   ```bash
   # On macOS with Homebrew
   brew services list | grep postgresql
   brew services start postgresql
   
   # On Ubuntu/Debian
   sudo systemctl status postgresql
   sudo systemctl start postgresql
   
   # On Windows
   net start postgresql-x64-13
   ```

2. **Verify Connection Settings**:
   ```bash
   psql -h localhost -p 5432 -U postgres -d postgres
   ```

3. **Check Database User Permissions**:
   ```sql
   -- Connect as superuser and grant permissions
   GRANT ALL PRIVILEGES ON DATABASE "Events" TO postgres;
   GRANT CREATE ON SCHEMA public TO postgres;
   ```

### Common Issues

**Port Already in Use**:
```bash
# Find process using port 3000
lsof -i :3000
# Kill the process
kill -9 <PID>
```

**Environment Variables Missing**:
- Ensure `.env` file exists in project root
- Check that all required variables are set
- Verify PostgreSQL credentials

**Database Schema Issues**:
```bash
# Reset database schema
npm run db:reset
# Or recreate database
npm run db:create
```

## 🚀 Deployment

### Local Production
```bash
# Using PM2
npm run pm2:start

# Direct execution
npm start
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment-Specific Configuration
```bash
# Development
NODE_ENV=development npm start

# Production
NODE_ENV=production npm start
```

## 📈 Performance

- **High Throughput**: Handles thousands of events per minute
- **Batch Processing**: Events are batched for efficient database operations
- **Connection Pooling**: PostgreSQL connection pooling for optimal performance
- **Caching**: Intelligent caching for repeated operations
- **Monitoring**: Comprehensive metrics and health checks

## 🔒 Security

- **Signature Verification**: All webhooks verify signatures
- **Rate Limiting**: Built-in rate limiting protection
- **Input Validation**: Comprehensive input validation and sanitization
- **SQL Injection Protection**: Parameterized queries prevent SQL injection
- **Environment Isolation**: Secure environment variable management

## 🆕 What's New in v3.0

### Major Changes
- **🗄️ PostgreSQL Migration**: Migrated from Supabase to local PostgreSQL
- **🚀 Express Server**: Replaced Cloudflare Workers with Express.js
- **🔧 Auto-Setup**: Automatic database creation and schema initialization
- **📦 Simplified Deployment**: No external dependencies required

### New Features
- **Database Auto-Creation**: Automatically creates database if missing
- **Enhanced Monitoring**: Improved health checks and metrics
- **Better Error Handling**: Comprehensive error handling and recovery
- **PM2 Integration**: Production-ready process management
- **Docker Support**: Container-ready deployment

### Breaking Changes
- **Configuration**: New environment variables for PostgreSQL
- **Endpoints**: Server runs on localhost:3000 by default
- **Dependencies**: New Node.js dependencies (pg, express, etc.)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with `npm run dev`
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues**: GitHub Issues for bug reports and feature requests
- **Documentation**: Check this README and inline code comments
- **Logs**: Use `npm run logs:live` for real-time debugging
- **Health Check**: Use `npm run health:check` for system status

---

**🎉 Happy webhook capturing!** Your events are now flowing automatically from GitHub, Linear, and Slack into your local PostgreSQL database with zero external dependencies required.

