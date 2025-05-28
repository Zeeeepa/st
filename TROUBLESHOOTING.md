# Troubleshooting Guide

This guide helps you resolve common issues when setting up and running the webhook gateway.

## 🚀 Quick Fixes

### Automatic Issue Resolution

```bash
# Run automatic fixes for common issues
npm run fix:auto

# Interactive fixing with more options
npm run fix:interactive

# Validate system requirements
npm run validate:system
```

## 🔍 Common Issues

### 1. **Dependencies Not Installed**

**Symptoms:**
- `Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'dotenv'`
- `Cannot find module 'express'`

**Solution:**
```bash
npm install
```

**Auto-fix:**
```bash
npm run fix:auto
```

### 2. **PostgreSQL Connection Failed**

**Symptoms:**
- `Connection terminated unexpectedly`
- `FATAL: password authentication failed`
- `database "Events" does not exist`

**Solutions:**

#### Check PostgreSQL Status
```bash
# Windows
Get-Service postgresql*

# Linux/macOS
sudo systemctl status postgresql
```

#### Fix Database Port
```bash
# Check what port PostgreSQL is using
netstat -an | grep :5432
netstat -an | grep :5433

# Update .env file with correct port
# Edit DB_PORT=5432 or DB_PORT=5433
```

#### Create Database
```bash
# Connect to PostgreSQL
psql -U postgres -h localhost

# Create database
CREATE DATABASE "Events";
\q
```

#### Reset PostgreSQL Password
```bash
# Windows (as Administrator)
psql -U postgres
ALTER USER postgres PASSWORD 'password';

# Linux/macOS
sudo -u postgres psql
ALTER USER postgres PASSWORD 'password';
```

**Auto-fix:**
```bash
npm run fix:auto
```

### 3. **Environment Configuration Issues**

**Symptoms:**
- `Missing required environment variables`
- `.env file not found`

**Solution:**
```bash
# Create .env file with defaults
npm run setup:env

# Or use interactive setup
npm run dev
```

### 4. **Silent Command Execution**

**Symptoms:**
- Commands run but show no output
- Scripts complete immediately without feedback

**Causes:**
- Database connection failures
- Missing dependencies
- Configuration errors

**Solution:**
```bash
# Run system validation first
npm run validate:system

# Then apply automatic fixes
npm run fix:auto

# Finally run health checks
npm run health:check
```

### 5. **PostgreSQL Not Installed**

**Symptoms:**
- `PostgreSQL not detected`
- `psql: command not found`

**Solutions:**

#### Windows
1. Download from: https://www.postgresql.org/download/windows/
2. Run installer and follow setup wizard
3. Remember the password for postgres user
4. Ensure service is started

#### macOS
```bash
# Using Homebrew
brew install postgresql
brew services start postgresql
createuser -s postgres
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'password';"
```

### 6. **Port Conflicts**

**Symptoms:**
- `EADDRINUSE: address already in use`
- `Port 3000 is already in use`

**Solution:**
```bash
# Find what's using the port
netstat -an | grep :3000

# Kill the process (replace PID)
kill -9 <PID>

# Or change port in .env
PORT=3001
```

### 7. **Permission Issues (Linux/macOS)**

**Symptoms:**
- `Permission denied`
- `EACCES: permission denied`

**Solution:**
```bash
# Fix script permissions
chmod +x scripts/*.js

# Or use auto-fix
npm run fix:auto
```

## 🔧 Platform-Specific Issues

### Windows

#### PowerShell Execution Policy
```powershell
# If scripts are blocked
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### PostgreSQL Service Issues
```powershell
# Start PostgreSQL service
net start postgresql*

# Check service status
Get-Service postgresql*
```

#### Path Issues
```powershell
# Add PostgreSQL to PATH if psql not found
$env:PATH += ";C:\Program Files\PostgreSQL\17\bin"
```

### macOS

#### Homebrew Issues
```bash
# Install Homebrew if missing
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Fix PostgreSQL installation
brew reinstall postgresql
```

#### Permission Issues
```bash
# Fix PostgreSQL data directory permissions
sudo chown -R $(whoami) /usr/local/var/postgres
```

### Linux

#### Service Management
```bash
# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql
```

#### User Issues
```bash
# Create postgres user if missing
sudo -u postgres createuser --superuser $USER
```

## 🩺 Diagnostic Commands

### System Information
```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check PostgreSQL version
psql --version

# Check if PostgreSQL is running
ps aux | grep postgres
```

### Database Diagnostics
```bash
# Test database connection
psql -h localhost -U postgres -d Events -c "SELECT NOW();"

# List databases
psql -h localhost -U postgres -l

# Check database size
psql -h localhost -U postgres -d Events -c "SELECT pg_size_pretty(pg_database_size('Events'));"
```

### Network Diagnostics
```bash
# Check if ports are open
netstat -an | grep :5432  # PostgreSQL
netstat -an | grep :3000  # Webhook gateway

# Test connectivity
telnet localhost 5432
telnet localhost 3000
```

## 📋 Health Check Interpretation

### Health Check Results

```bash
npm run health:check
```

#### ✅ All Checks Passed
- System is ready for development
- All services are running correctly
- Database is accessible and configured

#### ⚠️ Warnings
- **PostgreSQL Connection**: Check database configuration
- **Database Schema**: Run `npm run setup:db`
- **Environment Variables**: Update .env file

#### ❌ Errors
- **System Requirements**: Install missing software
- **Database Connection**: Fix PostgreSQL setup
- **Configuration**: Review and update settings

## 🔄 Reset and Recovery

### Complete Reset
```bash
# Stop any running processes
pkill -f "node src/server.js"

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Reset environment
rm .env
npm run setup:env

# Reset database
psql -U postgres -c "DROP DATABASE IF EXISTS \"Events\";"
npm run setup:db
```

### Partial Reset
```bash
# Reset only database
npm run setup:db

# Reset only environment
npm run setup:env

# Reset only dependencies
npm install
```

## 📞 Getting Help

### Logs and Debugging
```bash
# Enable debug mode
export DEBUG=true
npm start

# Check application logs
tail -f logs/combined.log

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Information to Provide
When seeking help, please provide:

1. **System Information:**
   - Operating system and version
   - Node.js version (`node --version`)
   - npm version (`npm --version`)
   - PostgreSQL version (`psql --version`)

2. **Error Messages:**
   - Complete error output
   - Stack traces if available

3. **Configuration:**
   - .env file contents (remove sensitive data)
   - package.json scripts section

4. **Diagnostic Output:**
   ```bash
   npm run validate:system
   npm run health:check
   ```

### Support Channels
- **GitHub Issues**: Create an issue with detailed information
- **Documentation**: Check README.md and DEPLOYMENT.md
- **Community**: Join our Discord/Slack for community support

---

**💡 Pro Tip**: Most issues can be resolved with `npm run dev` which provides interactive guidance through the setup process!

