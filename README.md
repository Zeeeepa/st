# Webhook Gateway - Cloudflare Worker

A comprehensive webhook gateway built on Cloudflare Workers that automatically captures and stores events from GitHub, Linear, and Slack in Supabase. Designed for zero-configuration setup with automatic webhook management.

## 🚀 Quick Start

**One command to rule them all:**

```bash
npm run dev
```

This single command will:
- ✅ Validate your environment and prerequisites
- ✅ Set up your Supabase database schema
- ✅ Automatically configure webhooks for all your GitHub repositories
- ✅ Set up Linear organization webhooks
- ✅ Configure Slack Event Subscriptions (with guidance)
- ✅ Run comprehensive tests
- ✅ Start the development server
- ✅ Begin capturing events immediately

## 📋 Prerequisites

- **Node.js** >= 16.0.0
- **npm** (comes with Node.js)
- **Cloudflare Account** with Workers enabled
- **Supabase Project** (free tier works)

## ⚙️ Configuration

Create a `.env` file in the root directory with your configuration:

```env
# Cloudflare Configuration
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_WORKER_NAME=webhook-gateway
CLOUDFLARE_WORKER_URL=https://your-worker.your-subdomain.workers.dev

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

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
```

## 🏗️ Project Structure

```
webhook-gateway/
├── src/
│   ├── worker.js              # Main Cloudflare Worker entry point
│   ├── config.js              # Configuration management
│   ├── handlers/
│   │   ├── github.js          # GitHub webhook event processing
│   │   ├── linear.js          # Linear webhook event processing
│   │   └── slack.js           # Slack webhook event processing
│   └── utils/
│       ├── supabase.js        # Database operations
│       ├── security.js        # Signature verification
│       └── metadata.js        # Event metadata extraction
├── scripts/
│   ├── dev-setup.js           # 🌟 Main development setup script
│   ├── setup.js               # Comprehensive webhook setup
│   ├── managers/
│   │   ├── github-webhook-manager.js    # GitHub webhook automation
│   │   ├── linear-webhook-manager.js    # Linear webhook automation
│   │   └── slack-webhook-manager.js     # Slack webhook automation
│   ├── setup-database.js      # Database schema setup
│   ├── test-webhook.js        # Webhook testing utilities
│   └── health-check.js        # System health validation
├── package.json               # Dependencies and scripts
├── wrangler.toml             # Cloudflare Worker configuration
├── init_db.sql               # Database schema
└── .env                      # Environment configuration
```

## 🔧 Available Commands

### Development
```bash
npm run dev              # 🌟 Complete setup + development server
npm run dev:start        # Start development server only
npm run dev:simple       # Simple development server
npm run dev:remote       # Remote development server
```

### Setup & Configuration
```bash
npm run setup            # Run complete webhook setup
npm run setup:db         # Set up database schema only
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

### Deployment
```bash
npm run deploy           # Deploy to production
npm run deploy:staging   # Deploy to staging
npm run logs             # View worker logs
npm run metrics          # View performance metrics
```

## 🌐 Webhook Endpoints

Once deployed, your webhook gateway will be available at:

- **GitHub**: `https://your-worker.workers.dev/webhook/github`
- **Linear**: `https://your-worker.workers.dev/webhook/linear`
- **Slack**: `https://your-worker.workers.dev/webhook/slack`
- **Health**: `https://your-worker.workers.dev/health`
- **Metrics**: `https://your-worker.workers.dev/metrics`

## 🔄 Automatic Webhook Management

### GitHub
The system automatically:
- Discovers all repositories you have access to
- Creates webhooks for repositories that don't have them
- Updates existing webhooks with correct configuration
- Validates webhook signatures for security
- Captures all repository events (pushes, PRs, issues, etc.)

### Linear
The system automatically:
- Connects to your Linear organization
- Creates organization-level webhooks
- Captures all Linear events (issues, projects, cycles, etc.)
- Validates webhook signatures

### Slack
The system:
- Validates your Slack app configuration
- Provides guidance for Event Subscriptions setup
- Captures all workspace events once configured
- Handles URL verification challenges

## 📊 Event Storage

All events are automatically stored in Supabase with:
- **Deduplication**: Prevents duplicate events
- **Metadata Extraction**: Rich context and searchable fields
- **Batch Processing**: Efficient bulk operations
- **Retry Logic**: Automatic retry for failed operations
- **Rate Limiting**: Respects API limits

### Database Schema

Events are stored in the `webhook_events` table with:
- Source platform (github, linear, slack)
- Event type and action
- Actor information
- Repository/organization context
- Rich metadata and additional context
- Timestamps and delivery information

## 🔍 Monitoring & Debugging

### Real-time Logs
```bash
npm run logs:live        # Pretty-formatted live logs
npm run logs:errors      # Error logs only
```

### Health Monitoring
```bash
npm run health:check     # Comprehensive health check
```

### Metrics
```bash
npm run metrics          # Performance and usage metrics
```

## 🛠️ Troubleshooting

### Linear Events Not Being Caught

If Linear events aren't being processed despite successful tests:

1. **Check Webhook Configuration**:
   ```bash
   npm run setup:check
   ```

2. **Verify Linear Webhook URL**:
   - Go to Linear Settings → API → Webhooks
   - Ensure the URL matches your Cloudflare Worker URL
   - Verify the webhook is enabled

3. **Check Event Types**:
   - Ensure all required event types are selected
   - The system requires: Issue, Comment, Project, Cycle, User, Team, etc.

4. **Test Webhook Endpoint**:
   ```bash
   npm run webhook:linear
   ```

5. **Check Worker Logs**:
   ```bash
   npm run logs:live
   ```

### Common Issues

**Environment Variables Missing**:
- Ensure all required variables are in `.env`
- Check that `.env` is in the project root
- Verify Cloudflare and Supabase credentials

**Webhook Creation Fails**:
- Check API token permissions
- Verify repository/organization access
- Ensure webhook URLs are accessible

**Database Connection Issues**:
- Verify Supabase URL and service key
- Check database schema with `npm run setup:db`
- Ensure Supabase project is active

## 🚀 Deployment

### Production Deployment
```bash
npm run deploy
```

### Environment-Specific Deployment
```bash
npm run deploy:staging      # Deploy to staging
npm run deploy:production   # Deploy to production
```

### Secrets Management
```bash
npm run secrets:list        # List configured secrets
wrangler secret put SECRET_NAME  # Add new secret
```

## 📈 Performance

- **Batch Processing**: Events are batched for efficient database operations
- **Rate Limiting**: Built-in rate limiting to respect API limits
- **Caching**: Intelligent caching for repeated operations
- **Retry Logic**: Automatic retry with exponential backoff
- **Monitoring**: Comprehensive metrics and health checks

## 🔒 Security

- **Signature Verification**: All webhooks verify signatures
- **Environment Isolation**: Separate staging and production environments
- **Secret Management**: Secure secret storage with Wrangler
- **Access Control**: Proper API token scoping

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

**🎉 Happy webhook capturing!** Your events are now flowing automatically from GitHub, Linear, and Slack into your Supabase database with zero manual configuration required.

