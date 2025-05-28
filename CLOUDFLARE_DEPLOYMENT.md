# Cloudflare Webhook Gateway Deployment

This guide covers deploying your webhook gateway to Cloudflare Workers and automatically configuring webhooks across all your services.

## Quick Deployment

### One-Command Deployment
```bash
npm run deploy:cloudflare
```

This single command will:
- ✅ Deploy webhook gateway to Cloudflare Workers
- ✅ Configure webhooks on ALL GitHub repositories
- ✅ Set up Linear webhook integration
- ✅ Configure Slack webhook endpoints
- ✅ Validate all webhook endpoints are working

## What Gets Configured

### 🌐 Cloudflare Worker
- **URL**: `https://webhook-gateway.pixeliumperfecto.workers.dev`
- **Endpoints**:
  - `/webhook/github` - GitHub webhook handler
  - `/webhook/linear` - Linear webhook handler  
  - `/webhook/slack` - Slack webhook handler
  - `/health` - Health check endpoint

### 🐙 GitHub Integration
- **Automatically configures webhooks** on ALL your repositories
- **Events**: All events (`*`) - pushes, PRs, issues, etc.
- **URL**: `https://webhook-gateway.pixeliumperfecto.workers.dev/webhook/github`
- **Security**: Uses webhook secrets from your .env file

### 📐 Linear Integration
- **Creates team-wide webhook** for all projects
- **Events**: Issues, Comments, Projects, Project Updates
- **URL**: `https://webhook-gateway.pixeliumperfecto.workers.dev/webhook/linear`
- **Scope**: All public teams

### 💬 Slack Integration
- **Webhook URL**: `https://webhook-gateway.pixeliumperfecto.workers.dev/webhook/slack`
- **Note**: Slack webhooks require manual configuration in your Slack app settings

## Prerequisites

### 1. Environment Variables
Your `.env` file should contain:

```env
# Cloudflare (automatically configured)
CLOUDFLARE_API_TOKEN=eae82cf159577a8838cc83612104c09c5a0d6
CLOUDFLARE_ACCOUNT_ID=2b2a1d3effa7f7fe4fe2a8c4e48681e3
CLOUDFLARE_WORKER_NAME=webhook-gateway
CLOUDFLARE_WORKER_URL=https://webhook-gateway.pixeliumperfecto.workers.dev

# GitHub (required for GitHub webhook automation)
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Linear (required for Linear webhook automation)
LINEAR_API_KEY=your_linear_api_key

# Slack (required for Slack webhook automation)
SLACK_BOT_TOKEN=your_slack_bot_token
SLACK_SIGNING_SECRET=your_slack_signing_secret

# Database (for event storage)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=webhook_events_db
DB_USER=webhook_app_user
DB_PASSWORD=your_db_password
```

### 2. API Permissions

#### GitHub Token Permissions
Your GitHub token needs these scopes:
- `repo` - Access to repositories
- `admin:repo_hook` - Manage repository webhooks

#### Linear API Key
- Go to Linear Settings → API → Create API Key
- Needs webhook creation permissions

#### Slack Bot Token
- Create a Slack app at https://api.slack.com/apps
- Add bot token scopes: `chat:write`, `channels:read`

## Deployment Process

### Step 1: Deploy Worker
```bash
npm run deploy:cloudflare
```

The script will:
1. **Create Cloudflare Worker** with your webhook handling code
2. **Set environment variables** in the worker
3. **Deploy to production** at your worker URL

### Step 2: Configure Services
The script automatically:
1. **Scans all GitHub repos** and adds webhooks
2. **Creates Linear webhook** for all teams
3. **Provides Slack webhook URL** for manual configuration

### Step 3: Validation
The script validates:
- ✅ Worker is deployed and responding
- ✅ All webhook endpoints return 200 OK
- ✅ Health check is working

## Manual Configuration (if needed)

### GitHub (if automatic fails)
1. Go to repo Settings → Webhooks
2. Add webhook URL: `https://webhook-gateway.pixeliumperfecto.workers.dev/webhook/github`
3. Content type: `application/json`
4. Events: Select "Send me everything"

### Linear (if automatic fails)
1. Go to Linear Settings → API → Webhooks
2. Add webhook URL: `https://webhook-gateway.pixeliumperfecto.workers.dev/webhook/linear`
3. Select events: Issues, Comments, Projects

### Slack (always manual)
1. Go to your Slack app settings
2. Navigate to Event Subscriptions
3. Add Request URL: `https://webhook-gateway.pixeliumperfecto.workers.dev/webhook/slack`
4. Subscribe to events you want to track

## Monitoring & Testing

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
  "environment": "production"
}
```

### Test Webhooks
- **GitHub**: Create a test commit or PR
- **Linear**: Create or update an issue
- **Slack**: Send a message in a monitored channel

### View Logs
```bash
# Cloudflare Workers logs
wrangler tail webhook-gateway
```

## Troubleshooting

### Deployment Issues
- **401 Unauthorized**: Check your Cloudflare API token
- **403 Forbidden**: Verify account ID and worker name
- **Script too large**: Worker script exceeds size limits

### Webhook Configuration Issues
- **GitHub 404**: Check repository permissions and token scopes
- **Linear GraphQL errors**: Verify API key permissions
- **Slack verification failed**: Check signing secret

### Runtime Issues
- **Worker errors**: Check Cloudflare Workers dashboard logs
- **Database connection**: Verify database credentials in worker environment
- **CORS issues**: Worker includes proper CORS headers

## Production Considerations

### Security
- ✅ **HTTPS only** - All webhooks use secure connections
- ✅ **Signature verification** - Validates webhook authenticity
- ✅ **Environment variables** - Secrets stored securely in worker

### Performance
- ✅ **Global edge deployment** - Low latency worldwide
- ✅ **Automatic scaling** - Handles traffic spikes
- ✅ **Fast cold starts** - Minimal startup time

### Reliability
- ✅ **99.9% uptime** - Cloudflare Workers SLA
- ✅ **Error handling** - Graceful failure modes
- ✅ **Monitoring** - Built-in observability

## Next Steps

1. **Monitor webhook events** in your database
2. **Set up alerting** for failed webhooks
3. **Add custom event processing** logic
4. **Scale database** as event volume grows

Your webhook gateway is now live and automatically processing events from all your services! 🚀

