# Deployment Guide - Webhook Gateway v3.0

This guide covers deploying the PostgreSQL-based webhook gateway to various environments.

## Prerequisites

1. PostgreSQL database (local or remote)
2. Node.js v16+ runtime environment
3. Required environment variables:
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
   - `GITHUB_WEBHOOK_SECRET`, `LINEAR_WEBHOOK_SECRET`, `SLACK_SIGNING_SECRET`

## Local Development

### 1. Environment Setup

```bash
# Clone and install
git clone <repository-url>
cd webhook-gateway
npm install

# Set up environment
npm run setup:env
```

### 2. Database Setup

```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt-get install postgresql postgresql-contrib

# Start PostgreSQL
sudo service postgresql start

# Create database and user
sudo -u postgres psql -c "CREATE DATABASE \"Events\";"
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'password';"

# Initialize schema
npm run setup:db
```

### 3. Start Development Server

```bash
npm run dev
```

## Production Deployment

### Docker Deployment

1. **Create Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY scripts/ ./scripts/

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["npm", "start"]
```

2. **Create docker-compose.yml**
```yaml
version: '3.8'

services:
  webhook-gateway:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=Events
      - DB_USER=postgres
      - DB_PASSWORD=password
      - GITHUB_WEBHOOK_SECRET=${GITHUB_WEBHOOK_SECRET}
      - LINEAR_WEBHOOK_SECRET=${LINEAR_WEBHOOK_SECRET}
      - SLACK_SIGNING_SECRET=${SLACK_SIGNING_SECRET}
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=Events
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

volumes:
  postgres_data:
```

3. **Deploy**
```bash
docker-compose up -d
```

### VPS/Server Deployment

1. **Install Dependencies**
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Install PM2 for process management
sudo npm install -g pm2
```

2. **Setup Application**
```bash
# Clone repository
git clone <repository-url>
cd webhook-gateway
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Setup database
npm run setup:db
```

3. **Configure PM2**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'webhook-gateway',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

4. **Start with PM2**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Cloud Deployment

#### AWS EC2

1. **Launch EC2 Instance**
   - Choose Ubuntu 20.04 LTS
   - Configure security groups (ports 22, 80, 443, 3000)
   - Create or use existing key pair

2. **Setup RDS PostgreSQL**
   - Create RDS PostgreSQL instance
   - Configure security groups for EC2 access
   - Note connection details

3. **Deploy Application**
```bash
# Connect to EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install dependencies and deploy
# (Follow VPS deployment steps above)

# Configure environment for RDS
DB_HOST=your-rds-endpoint
DB_PORT=5432
DB_NAME=Events
DB_USER=postgres
DB_PASSWORD=your-rds-password
```

#### Google Cloud Platform

1. **Create Compute Engine Instance**
2. **Setup Cloud SQL PostgreSQL**
3. **Deploy using similar steps to AWS**

#### DigitalOcean

1. **Create Droplet**
2. **Setup Managed PostgreSQL Database**
3. **Deploy application**

## Environment Configuration

### Required Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Events
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Webhook Secrets
GITHUB_WEBHOOK_SECRET=your_github_secret
LINEAR_WEBHOOK_SECRET=your_linear_secret
SLACK_SIGNING_SECRET=your_slack_secret

# Server
PORT=3000
NODE_ENV=production
```

### Optional Variables

```env
# Performance
ENABLE_BATCHING=true
BATCH_SIZE=100
BATCH_INTERVAL=5000

# Security
ENABLE_RATE_LIMIT=true
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_WINDOW=60000

# Monitoring
ENABLE_METRICS=true
DATA_RETENTION_DAYS=90
```

## SSL/HTTPS Setup

### Using Nginx Reverse Proxy

1. **Install Nginx**
```bash
sudo apt-get install nginx
```

2. **Configure Nginx**
```nginx
# /etc/nginx/sites-available/webhook-gateway
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. **Enable Site**
```bash
sudo ln -s /etc/nginx/sites-available/webhook-gateway /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

4. **Setup SSL with Let's Encrypt**
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Monitoring & Logging

### Health Checks

```bash
# Application health
curl http://localhost:3000/health

# Database health
npm run health:check
```

### Metrics

```bash
# View metrics
curl http://localhost:3000/metrics

# Database metrics
npm run metrics
```

### Log Management

```bash
# PM2 logs
pm2 logs webhook-gateway

# Application logs
tail -f logs/combined.log

# Database logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

## Backup & Recovery

### Database Backup

```bash
# Create backup
pg_dump -h localhost -U postgres Events > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U postgres Events > $BACKUP_DIR/events_backup_$DATE.sql
find $BACKUP_DIR -name "events_backup_*.sql" -mtime +7 -delete
```

### Restore Database

```bash
# Restore from backup
psql -h localhost -U postgres Events < backup_file.sql
```

## Security Considerations

1. **Database Security**
   - Use strong passwords
   - Restrict database access
   - Enable SSL connections

2. **Application Security**
   - Keep dependencies updated
   - Use environment variables for secrets
   - Enable rate limiting

3. **Network Security**
   - Use HTTPS in production
   - Configure firewall rules
   - Restrict SSH access

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U postgres -d Events
```

2. **Application Won't Start**
```bash
# Check logs
pm2 logs webhook-gateway

# Check environment
npm run health:check
```

3. **Webhook Delivery Issues**
```bash
# Check webhook endpoints
curl -X POST http://localhost:3000/webhook/github

# Verify signatures
# Check platform webhook logs
```

## Performance Optimization

1. **Database Optimization**
   - Regular VACUUM and ANALYZE
   - Monitor query performance
   - Optimize indexes

2. **Application Optimization**
   - Enable batching for high volume
   - Adjust connection pool size
   - Monitor memory usage

3. **System Optimization**
   - Configure swap if needed
   - Monitor disk space
   - Set up log rotation

---

For additional support, check the troubleshooting section in README.md or create an issue in the repository.

