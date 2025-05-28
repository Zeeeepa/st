# Fresh PostgreSQL Setup Guide

This guide provides a clean, simple way to set up the webhook gateway with a fresh PostgreSQL database and user.

## Quick Start

### 1. Fresh Database Setup
```bash
npm run setup:fresh
```

This will:
- ✅ Create a new database: `webhook_events_db`
- ✅ Create a new user: `webhook_app_user` 
- ✅ Generate secure, URL-safe passwords
- ✅ Update your `.env` file with new credentials
- ✅ Initialize the database schema

### 2. Start the Server
```bash
npm run start:simple
```

This will start the server directly without the complex deployment process.

## Alternative: Manual Setup

If the automated setup doesn't work, you can set up manually:

### 1. Connect to PostgreSQL
```bash
# Try one of these methods:
psql -U postgres
# OR
sudo -u postgres psql
```

### 2. Create Database and User
```sql
-- Create user
CREATE USER webhook_app_user WITH PASSWORD 'your_secure_password';

-- Create database
CREATE DATABASE webhook_events_db OWNER webhook_app_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE webhook_events_db TO webhook_app_user;
```

### 3. Update .env File
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=webhook_events_db
DB_USER=webhook_app_user
DB_PASSWORD=your_secure_password
DB_SSL=false
```

### 4. Start the Server
```bash
npm start
```

## Troubleshooting

### PostgreSQL Not Found
If you get "PostgreSQL not found" errors:

1. **Install PostgreSQL** (if not installed):
   ```bash
   # Ubuntu/Debian
   sudo apt update && sudo apt install postgresql postgresql-contrib
   
   # CentOS/RHEL
   sudo yum install postgresql postgresql-server
   
   # macOS
   brew install postgresql
   ```

2. **Start PostgreSQL service**:
   ```bash
   # Ubuntu/Debian
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   
   # macOS
   brew services start postgresql
   ```

### Permission Issues
If you get permission errors:

1. **Switch to postgres user**:
   ```bash
   sudo -u postgres psql
   ```

2. **Or set up peer authentication** in `/etc/postgresql/*/main/pg_hba.conf`

### Connection Issues
If you get connection errors:

1. **Check if PostgreSQL is running**:
   ```bash
   sudo systemctl status postgresql
   ```

2. **Check if port 5432 is available**:
   ```bash
   ss -tlnp | grep 5432
   ```

3. **Test connection manually**:
   ```bash
   psql "postgresql://webhook_app_user:password@localhost:5432/webhook_events_db" -c "SELECT version();"
   ```

## What's Different

This fresh setup approach:

- ✅ **Avoids conflicts** with existing databases and users
- ✅ **Uses simple, URL-safe passwords** (no special characters)
- ✅ **Creates dedicated database and user** for the application
- ✅ **Bypasses complex deployment scripts** that can fail
- ✅ **Provides clear error messages** and troubleshooting steps

## Next Steps

Once the setup is complete:

1. **Configure webhooks** in your services (GitHub, Linear, Slack)
2. **Point them to**: `http://your-server:3000/webhook/[service]`
3. **Monitor events** via the health endpoint: `http://your-server:3000/health`
4. **View metrics** at: `http://your-server:3000/metrics`

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the server logs for specific error messages
3. Ensure PostgreSQL is properly installed and running
4. Verify your `.env` file has the correct credentials

