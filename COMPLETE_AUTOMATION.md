# Complete Webhook Automation

This is the **ultimate webhook automation solution** that deploys to Cloudflare Workers and configures webhooks across all your services with a single command.

## 🚀 One-Command Deployment

First, set your environment variables:

```bash
export CLOUDFLARE_API_TOKEN="your_cloudflare_token"
export CLOUDFLARE_ACCOUNT_ID="your_account_id"
export GITHUB_TOKEN="your_github_token"
export LINEAR_ACCESS_TOKEN="your_linear_token"
export SLACK_BOT_TOKEN="your_slack_token"
```

Then run:

```bash
npm run dev
```

This **single command** will:

1. ✅ **Setup PostgreSQL database** with fresh credentials
2. ✅ **Deploy to Cloudflare Workers** at `https://webhook-gateway.pixeliumperfecto.workers.dev`
3. ✅ **Configure ALL GitHub repositories** with webhooks automatically
4. ✅ **Setup Linear webhook** for team ZAM via GraphQL API
5. ✅ **Provide Slack webhook configuration** instructions
6. ✅ **Validate all endpoints** are working correctly
7. ✅ **Start local fallback server** on available port
8. ✅ **Store all events** in PostgreSQL database

## 🎯 What Gets Automated

### 🌐 Cloudflare Workers Deployment
- **Worker URL**: `https://webhook-gateway.pixeliumperfecto.workers.dev`
- **Global edge deployment** with automatic scaling
- **Production-ready** with CORS, error handling, and logging
- **Secure environment variables** management

### 🐙 GitHub Integration (Fully Automated)
- **Scans ALL repositories** in your account
- **Automatically configures webhooks** on each repo
- **Events captured**:
  - ✅ PR create, edit, merge, cancel
  - ✅ Branch create (without PR)
  - ✅ Issues create, edit, close
  - ✅ Push events
  - ✅ Release events
  - ✅ All other GitHub events (`*`)

### 📐 Linear Integration (Fully Automated)
- **Team-wide webhook** for team ZAM
- **Events captured**:
  - ✅ Issue create, comment, assign
  - ✅ Sub-issue create, assign
  - ✅ Project updates
  - ✅ Label changes
  - ✅ Status changes

### 💬 Slack Integration (Manual Setup Required)
- **Webhook URL provided**: `https://webhook-gateway.pixeliumperfecto.workers.dev/webhook/slack`
- **Events to configure**:
  - ✅ Message received [User/Channel]
  - ✅ Message sent [Channel]
  - ✅ Channel events
  - ✅ User events

## 🔧 Required Environment Variables

Set these before running `npm run dev`:

```bash
# Cloudflare (required)
export CLOUDFLARE_API_TOKEN="your_cloudflare_api_token"
export CLOUDFLARE_ACCOUNT_ID="your_cloudflare_account_id"

# GitHub (required)
export GITHUB_TOKEN="your_github_personal_access_token"

# Linear (required)
export LINEAR_ACCESS_TOKEN="your_linear_api_token"

# Slack (required)
export SLACK_BOT_TOKEN="your_slack_bot_token"

# Optional Slack tokens
export SLACK_SIGNING_KEY="your_slack_signing_key"
export SLACK_USER_TOKEN="your_slack_user_token"
export SLACK_APP_TOKEN="your_slack_app_token"
```

## 📊 Deployment Process

### Step 1: Database Setup
- Creates fresh PostgreSQL database `webhook_events_db`
- Sets up user `webhook_app_user` with secure password
- Initializes schema for event storage
- Tests database connectivity

### Step 2: Cloudflare Deployment
- Generates optimized worker script
- Deploys to Cloudflare Workers platform
- Configures worker routes and environment
- Sets up CORS and security headers

### Step 3: Webhook Configuration
- **GitHub**: Scans all repos and configures webhooks
- **Linear**: Creates team webhook via GraphQL API
- **Slack**: Provides configuration instructions

### Step 4: Endpoint Validation
- Tests all webhook endpoints
- Validates health check responses
- Confirms worker deployment success
- Reports any configuration issues

### Step 5: Local Fallback
- Starts local server on available port
- Provides backup webhook processing
- Enables development and testing

## 🎯 Event Processing

### GitHub Events
```json
{
  "service": "github",
  "event": "pull_request",
  "action": "opened",
  "repository": "owner/repo",
  "timestamp": "2025-05-28T14:30:00.000Z",
  "data": { /* full GitHub payload */ }
}
```

### Linear Events
```json
{
  "service": "linear",
  "type": "Issue",
  "action": "create",
  "team": "ZAM",
  "timestamp": "2025-05-28T14:30:00.000Z",
  "data": { /* full Linear payload */ }
}
```

### Slack Events
```json
{
  "service": "slack",
  "type": "event_callback",
  "event": "message",
  "channel": "C1234567890",
  "timestamp": "2025-05-28T14:30:00.000Z",
  "data": { /* full Slack payload */ }
}
```

## 🔍 Monitoring & Testing

### Health Check
```bash
curl https://webhook-gateway.pixeliumperfecto.workers.dev/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-05-28T14:30:00.000Z",
  "version": "3.0.0",
  "worker": "cloudflare",
  "environment": "production",
  "endpoints": {
    "github": "https://webhook-gateway.pixeliumperfecto.workers.dev/webhook/github",
    "linear": "https://webhook-gateway.pixeliumperfecto.workers.dev/webhook/linear",
    "slack": "https://webhook-gateway.pixeliumperfecto.workers.dev/webhook/slack"
  }
}
```

### Test Events
- **GitHub**: Create a test commit or PR
- **Linear**: Create or update an issue
- **Slack**: Send a message in a monitored channel

### Database Queries
```sql
-- View recent events
SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 10;

-- Count events by service
SELECT service, COUNT(*) FROM webhook_events GROUP BY service;

-- View GitHub PR events
SELECT * FROM webhook_events 
WHERE service = 'github' 
AND payload->>'action' IN ('opened', 'closed', 'merged');
```

## 🛠️ Manual Slack Setup

Since Slack requires app-level configuration, you'll need to:

1. **Go to your Slack app**: https://api.slack.com/apps
2. **Select your app** (or create one)
3. **Navigate to Event Subscriptions**
4. **Enable Events** and set Request URL to:
   ```
   https://webhook-gateway.pixeliumperfecto.workers.dev/webhook/slack
   ```
5. **Subscribe to bot events**:
   - `message.channels` - Messages in public channels
   - `message.groups` - Messages in private channels
   - `message.im` - Direct messages
   - `message.mpim` - Group direct messages

## 🔧 Troubleshooting

### Common Issues

#### Missing Environment Variables
- **Error**: "Missing required environment variables"
- **Solution**: Set all required environment variables before running

#### Cloudflare Deployment Fails
- **Check API token permissions**: Ensure token has Workers:Edit permissions
- **Verify account ID**: Confirm account ID is correct
- **Check worker name**: Ensure worker name doesn't conflict

#### GitHub Webhook Configuration Fails
- **Token permissions**: Ensure token has `repo` and `admin:repo_hook` scopes
- **Repository access**: Verify token has access to all repositories
- **Rate limiting**: GitHub API has rate limits, script handles retries

#### Linear Webhook Fails
- **API key permissions**: Ensure Linear API key has webhook creation permissions
- **Team access**: Verify API key has access to team ZAM
- **GraphQL errors**: Check Linear API documentation for changes

#### Database Connection Issues
- **PostgreSQL not running**: Ensure PostgreSQL service is started
- **Permission issues**: Script may need sudo access for database creation
- **Port conflicts**: Default port 5432 may be in use

### Debug Mode
Set environment variable for detailed logging:
```bash
DEBUG=true npm run dev
```

## 🚀 Production Considerations

### Security
- ✅ **HTTPS-only** webhook endpoints
- ✅ **Signature verification** for GitHub webhooks
- ✅ **Environment variable** protection
- ✅ **CORS configuration** for cross-origin requests

### Performance
- ✅ **Global edge deployment** via Cloudflare
- ✅ **Automatic scaling** based on traffic
- ✅ **Fast cold starts** with optimized worker code
- ✅ **Database connection pooling** for high throughput

### Reliability
- ✅ **99.9% uptime** SLA from Cloudflare Workers
- ✅ **Local fallback server** for development
- ✅ **Error handling** with detailed logging
- ✅ **Retry logic** for failed operations

## 📈 Scaling

The solution is designed to scale automatically:

- **Cloudflare Workers**: Handle millions of requests
- **PostgreSQL**: Can be upgraded to cloud solutions (AWS RDS, etc.)
- **Event processing**: Batching and queuing for high volume
- **Monitoring**: Built-in metrics and health checks

## 🎉 Success Indicators

After running `npm run dev`, you should see:

```
🎉 COMPLETE WEBHOOK AUTOMATION FINISHED
======================================

📊 DEPLOYMENT SUMMARY:
   ☁️  Cloudflare Worker: ✅ DEPLOYED
   🗄️  Database: ✅ CONFIGURED
   🐙 GitHub Webhooks: ✅ CONFIGURED
   📐 Linear Webhooks: ✅ CONFIGURED
   💬 Slack Webhooks: ⚠️ MANUAL SETUP REQUIRED
   🖥️  Local Server: ✅ RUNNING

🔗 WEBHOOK ENDPOINTS:
   GitHub:  https://webhook-gateway.pixeliumperfecto.workers.dev/webhook/github
   Linear:  https://webhook-gateway.pixeliumperfecto.workers.dev/webhook/linear
   Slack:   https://webhook-gateway.pixeliumperfecto.workers.dev/webhook/slack
   Health:  https://webhook-gateway.pixeliumperfecto.workers.dev/health

🔥 YOUR WEBHOOK GATEWAY IS NOW LIVE AND PROCESSING EVENTS!
```

## 🎯 Next Steps

1. **Complete Slack setup** using the provided webhook URL
2. **Test all integrations** by creating events in each service
3. **Monitor the database** for incoming webhook events
4. **Set up alerting** for failed webhooks or system issues
5. **Scale the database** as event volume grows

Your complete webhook automation is now live and processing events from all your services! 🚀

