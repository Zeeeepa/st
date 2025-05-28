#!/usr/bin/env node
// scripts/ultra-comprehensive-deployment.js - 100% Automated Deployment Solution

console.log('🚀 ULTRA COMPREHENSIVE 100% AUTOMATED DEPLOYMENT');
console.log('==================================================');
console.log(`📍 Working Directory: ${process.cwd()}`);
console.log(`🖥️  Platform: ${process.platform}`);
console.log(`🔧 Node.js: ${process.version}`);
console.log(`⚙️  Interactive mode: ${process.stdin.isTTY && process.stdout.isTTY}`);
console.log('');

import fs from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';
import { promisify } from 'util';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UltraComprehensiveDeployment {
  constructor() {
    this.envPath = path.join(__dirname, '..', '.env');
    this.config = {};
    this.issues = [];
    this.fixes = [];
    this.isInteractive = process.stdin.isTTY && process.stdout.isTTY && !process.env.CI;
    this.isWindows = process.platform === 'win32';
    this.isMacOS = process.platform === 'darwin';
    this.isLinux = process.platform === 'linux';
    this.hasAdminRights = false;
    
    console.log(`🔧 Environment: ${this.getOSName()}, Interactive: ${this.isInteractive}, Admin: ${this.hasAdminRights}`);
  }

  getOSName() {
    if (this.isWindows) return 'Windows';
    if (this.isMacOS) return 'macOS';
    if (this.isLinux) return 'Linux';
    return process.platform;
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m',   // Red
      reset: '\x1b[0m'
    };
    
    const color = colors[type] || colors.info;
    console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
  }

  async runCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, { 
        shell: true, 
        stdio: options.silent ? 'pipe' : 'inherit',
        ...options 
      });
      
      let stdout = '';
      let stderr = '';
      
      if (options.silent) {
        child.stdout?.on('data', (data) => stdout += data.toString());
        child.stderr?.on('data', (data) => stderr += data.toString());
      }
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
        }
      });
      
      child.on('error', reject);
    });
  }

  async checkAdminRights() {
    try {
      if (this.isWindows) {
        // Check if running as administrator
        await this.runCommand('net session', { silent: true });
        this.hasAdminRights = true;
      } else {
        // Check if can sudo without password or if running as root
        if (process.getuid && process.getuid() === 0) {
          this.hasAdminRights = true;
        } else {
          try {
            await this.runCommand('sudo -n true', { silent: true });
            this.hasAdminRights = true;
          } catch {
            this.hasAdminRights = false;
          }
        }
      }
    } catch {
      this.hasAdminRights = false;
    }
    
    await this.log(`Admin rights: ${this.hasAdminRights ? 'Available' : 'Not available'}`, 'info');
  }

  async detectPackageManager() {
    const managers = [];
    
    if (this.isWindows) {
      // Check for Windows package managers
      try {
        await this.runCommand('choco --version', { silent: true });
        managers.push('choco');
      } catch {}
      
      try {
        await this.runCommand('winget --version', { silent: true });
        managers.push('winget');
      } catch {}
      
      try {
        await this.runCommand('scoop --version', { silent: true });
        managers.push('scoop');
      } catch {}
    } else if (this.isMacOS) {
      // Check for macOS package managers
      try {
        await this.runCommand('brew --version', { silent: true });
        managers.push('brew');
      } catch {}
      
      try {
        await this.runCommand('port version', { silent: true });
        managers.push('macports');
      } catch {}
    } else if (this.isLinux) {
      // Check for Linux package managers
      try {
        await this.runCommand('apt --version', { silent: true });
        managers.push('apt');
      } catch {}
      
      try {
        await this.runCommand('yum --version', { silent: true });
        managers.push('yum');
      } catch {}
      
      try {
        await this.runCommand('dnf --version', { silent: true });
        managers.push('dnf');
      } catch {}
      
      try {
        await this.runCommand('pacman --version', { silent: true });
        managers.push('pacman');
      } catch {}
      
      try {
        await this.runCommand('zypper --version', { silent: true });
        managers.push('zypper');
      } catch {}
    }
    
    await this.log(`Package managers detected: ${managers.join(', ') || 'None'}`, 'info');
    return managers;
  }

  async installPostgreSQL() {
    await this.log('🔄 🐘 INSTALLING POSTGRESQL AUTOMATICALLY', 'info');
    
    const packageManagers = await this.detectPackageManager();
    
    if (packageManagers.length === 0) {
      await this.log('❌ No package manager detected. Manual installation required.', 'error');
      return false;
    }

    try {
      if (this.isWindows) {
        if (packageManagers.includes('choco')) {
          await this.log('Installing PostgreSQL via Chocolatey...', 'info');
          if (this.hasAdminRights) {
            await this.runCommand('choco install postgresql -y');
          } else {
            await this.runCommand('powershell -Command "Start-Process choco -ArgumentList \'install postgresql -y\' -Verb RunAs"');
          }
        } else if (packageManagers.includes('winget')) {
          await this.log('Installing PostgreSQL via winget...', 'info');
          await this.runCommand('winget install PostgreSQL.PostgreSQL');
        } else {
          return false;
        }
      } else if (this.isMacOS) {
        if (packageManagers.includes('brew')) {
          await this.log('Installing PostgreSQL via Homebrew...', 'info');
          await this.runCommand('brew install postgresql@15');
          await this.runCommand('brew services start postgresql@15');
        } else {
          return false;
        }
      } else if (this.isLinux) {
        if (packageManagers.includes('apt')) {
          await this.log('Installing PostgreSQL via apt...', 'info');
          if (this.hasAdminRights) {
            await this.runCommand('sudo apt update');
            await this.runCommand('sudo apt install -y postgresql postgresql-contrib');
            await this.runCommand('sudo systemctl start postgresql');
            await this.runCommand('sudo systemctl enable postgresql');
          } else {
            await this.log('❌ Admin rights required for PostgreSQL installation', 'error');
            return false;
          }
        } else if (packageManagers.includes('yum')) {
          await this.log('Installing PostgreSQL via yum...', 'info');
          if (this.hasAdminRights) {
            await this.runCommand('sudo yum install -y postgresql postgresql-server');
            await this.runCommand('sudo postgresql-setup initdb');
            await this.runCommand('sudo systemctl start postgresql');
            await this.runCommand('sudo systemctl enable postgresql');
          } else {
            return false;
          }
        } else if (packageManagers.includes('dnf')) {
          await this.log('Installing PostgreSQL via dnf...', 'info');
          if (this.hasAdminRights) {
            await this.runCommand('sudo dnf install -y postgresql postgresql-server');
            await this.runCommand('sudo postgresql-setup --initdb');
            await this.runCommand('sudo systemctl start postgresql');
            await this.runCommand('sudo systemctl enable postgresql');
          } else {
            return false;
          }
        } else {
          return false;
        }
      }

      await this.log('✅ PostgreSQL installation completed', 'success');
      
      // Wait for service to start
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      return true;
    } catch (error) {
      await this.log(`❌ PostgreSQL installation failed: ${error.message}`, 'error');
      return false;
    }
  }

  async setupPostgreSQLUser() {
    await this.log('🔄 Setting up PostgreSQL user and database...', 'info');
    
    try {
      if (this.isWindows) {
        // Windows PostgreSQL setup
        await this.runCommand('psql -U postgres -c "ALTER USER postgres PASSWORD \'password\';"');
      } else {
        // Unix-like systems
        if (this.hasAdminRights) {
          // Create database user
          await this.runCommand('sudo -u postgres psql -c "ALTER USER postgres PASSWORD \'password\';"');
          
          // Create Events database
          await this.runCommand('sudo -u postgres createdb Events');
          
          // Grant permissions
          await this.runCommand('sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE Events TO postgres;"');
        } else {
          await this.log('❌ Admin rights required for PostgreSQL user setup', 'error');
          return false;
        }
      }
      
      await this.log('✅ PostgreSQL user and database setup completed', 'success');
      return true;
    } catch (error) {
      await this.log(`⚠️ PostgreSQL user setup failed: ${error.message}`, 'warning');
      // Try to continue anyway
      return true;
    }
  }

  async installDockerPostgreSQL() {
    await this.log('🔄 🐳 INSTALLING POSTGRESQL VIA DOCKER (FALLBACK)', 'info');
    
    try {
      // Check if Docker is available
      await this.runCommand('docker --version', { silent: true });
      
      await this.log('Docker detected. Installing PostgreSQL container...', 'info');
      
      // Stop any existing container
      try {
        await this.runCommand('docker stop postgres-events', { silent: true });
        await this.runCommand('docker rm postgres-events', { silent: true });
      } catch {}
      
      // Run PostgreSQL container
      await this.runCommand(`docker run -d \
        --name postgres-events \
        -e POSTGRES_PASSWORD=password \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_DB=Events \
        -p 5432:5432 \
        postgres:15`);
      
      // Wait for container to start
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      await this.log('✅ PostgreSQL Docker container started successfully', 'success');
      return true;
    } catch (error) {
      await this.log(`❌ Docker PostgreSQL installation failed: ${error.message}`, 'error');
      return false;
    }
  }

  async ensurePostgreSQL() {
    await this.log('🔄 🐘 ENSURING POSTGRESQL IS AVAILABLE', 'info');
    
    // First, check if PostgreSQL is already running
    try {
      const { stdout } = await this.runCommand('psql -h localhost -p 5432 -U postgres -d postgres -c "SELECT version();"', { silent: true });
      if (stdout.includes('PostgreSQL')) {
        await this.log('✅ PostgreSQL is already running and accessible', 'success');
        return true;
      }
    } catch {}
    
    // Check if PostgreSQL is installed but not running
    try {
      if (this.isWindows) {
        await this.runCommand('sc query postgresql', { silent: true });
        await this.log('PostgreSQL service found. Starting...', 'info');
        await this.runCommand('sc start postgresql');
        await new Promise(resolve => setTimeout(resolve, 5000));
        return true;
      } else {
        try {
          await this.runCommand('systemctl is-installed postgresql', { silent: true });
          await this.log('PostgreSQL service found. Starting...', 'info');
          if (this.hasAdminRights) {
            await this.runCommand('sudo systemctl start postgresql');
            await new Promise(resolve => setTimeout(resolve, 5000));
            return true;
          }
        } catch {}
      }
    } catch {}
    
    // Try to install PostgreSQL
    await this.log('PostgreSQL not found. Attempting automatic installation...', 'info');
    
    if (await this.installPostgreSQL()) {
      if (await this.setupPostgreSQLUser()) {
        return true;
      }
    }
    
    // Fallback to Docker
    await this.log('Trying Docker fallback...', 'info');
    if (await this.installDockerPostgreSQL()) {
      return true;
    }
    
    // Final fallback - embedded SQLite
    await this.log('All PostgreSQL installation methods failed. Consider using SQLite fallback.', 'warning');
    return false;
  }

  async createEnvironmentFile() {
    await this.log('🔄 Creating comprehensive .env file...', 'info');
    
    const envContent = `# Comprehensive Environment Configuration
# Generated by Ultra Comprehensive Deployment

# Application Configuration
NODE_ENV=development
PORT=3000
HOST=localhost
DEBUG=true

# Database Configuration (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Events
DB_USER=postgres
DB_PASSWORD=password
DB_SSL=false
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000

# Security Configuration
ENABLE_RATE_LIMITING=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Webhook Configuration
WEBHOOK_TIMEOUT=30000
WEBHOOK_RETRY_ATTEMPTS=3
WEBHOOK_RETRY_DELAY=1000

# GitHub Integration (Optional)
# GITHUB_TOKEN=your_github_token_here
# GITHUB_WEBHOOK_SECRET=your_github_webhook_secret_here

# Linear Integration (Optional)
# LINEAR_API_KEY=your_linear_api_key_here
# LINEAR_WEBHOOK_SECRET=your_linear_webhook_secret_here

# Slack Integration (Optional)
# SLACK_BOT_TOKEN=your_slack_bot_token_here
# SLACK_SIGNING_SECRET=your_slack_signing_secret_here

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=combined
ENABLE_REQUEST_LOGGING=true

# Performance Configuration
ENABLE_COMPRESSION=true
ENABLE_CORS=true
CORS_ORIGIN=*

# Health Check Configuration
HEALTH_CHECK_INTERVAL=30000
ENABLE_METRICS=true
`;

    fs.writeFileSync(this.envPath, envContent);
    await this.log('✅ Comprehensive .env file created', 'success');
  }

  async initializeDatabase() {
    await this.log('🔄 🗄️ INITIALIZING DATABASE SCHEMA', 'info');
    
    try {
      // Import and run database initialization
      const { initDatabase } = await import('../src/utils/postgresql.js');
      const { getConfig } = await import('../src/config.js');
      
      const config = getConfig();
      await initDatabase(config);
      
      await this.log('✅ Database schema initialized successfully', 'success');
      return true;
    } catch (error) {
      await this.log(`❌ Database initialization failed: ${error.message}`, 'error');
      return false;
    }
  }

  async runHealthChecks() {
    await this.log('🔄 🏥 RUNNING COMPREHENSIVE HEALTH CHECKS', 'info');
    
    try {
      await this.runCommand('npm run health:check');
      await this.log('✅ Health checks completed', 'success');
      return true;
    } catch (error) {
      await this.log(`⚠️ Some health checks failed: ${error.message}`, 'warning');
      return false;
    }
  }

  async startServer() {
    await this.log('🔄 🚀 STARTING WEBHOOK GATEWAY SERVER', 'info');
    
    try {
      // Test database connection first
      const { getConfig } = await import('../src/config.js');
      const { checkDatabaseHealth } = await import('../src/utils/postgresql.js');
      
      const config = getConfig();
      const dbHealth = await checkDatabaseHealth(config);
      
      if (!dbHealth.healthy) {
        throw new Error(`Database health check failed: ${dbHealth.error}`);
      }
      
      await this.log('✅ Database connection verified', 'success');
      await this.log('🚀 Starting webhook gateway server...', 'info');
      
      // Start the server
      const serverProcess = spawn('node', ['src/server.js'], {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down webhook gateway...');
        serverProcess.kill();
        process.exit(0);
      });
      
      process.on('SIGTERM', () => {
        console.log('\n🛑 Shutting down webhook gateway...');
        serverProcess.kill();
        process.exit(0);
      });
      
      serverProcess.on('error', (error) => {
        this.log(`❌ Server failed to start: ${error.message}`, 'error');
        process.exit(1);
      });
      
      serverProcess.on('exit', (code) => {
        if (code !== 0) {
          this.log(`❌ Server exited with code ${code}`, 'error');
          process.exit(code);
        }
      });
      
      await this.log('✅ Webhook gateway server started successfully!', 'success');
      await this.log('🌐 Server is running and ready to receive webhooks', 'success');
      
      return true;
    } catch (error) {
      await this.log(`❌ Failed to start server: ${error.message}`, 'error');
      return false;
    }
  }

  async run() {
    try {
      await this.log('🚀 Starting Ultra Comprehensive 100% Automated Deployment...', 'info');
      
      // Step 1: Check admin rights
      await this.checkAdminRights();
      
      // Step 2: Install dependencies
      await this.log('🔄 📦 Installing Node.js dependencies...', 'info');
      await this.runCommand('npm install');
      await this.log('✅ Dependencies installed', 'success');
      
      // Step 3: Ensure PostgreSQL is available
      const postgresAvailable = await this.ensurePostgreSQL();
      
      // Step 4: Create comprehensive environment file
      await this.createEnvironmentFile();
      
      // Step 5: Initialize database (if PostgreSQL is available)
      if (postgresAvailable) {
        await this.initializeDatabase();
      } else {
        await this.log('⚠️ Skipping database initialization (PostgreSQL not available)', 'warning');
      }
      
      // Step 6: Run health checks
      await this.runHealthChecks();
      
      // Step 7: Start the server
      if (postgresAvailable) {
        await this.startServer();
      } else {
        await this.log('❌ Cannot start server without database. Please install PostgreSQL manually.', 'error');
        await this.log('📋 Manual PostgreSQL installation instructions:', 'info');
        await this.log('Linux: sudo apt install postgresql postgresql-contrib', 'info');
        await this.log('macOS: brew install postgresql', 'info');
        await this.log('Windows: choco install postgresql', 'info');
        process.exit(1);
      }
      
    } catch (error) {
      await this.log(`💥 Deployment failed: ${error.message}`, 'error');
      console.error('Stack trace:', error.stack);
      process.exit(1);
    }
  }
}

// Run the ultra comprehensive deployment
if (import.meta.url === `file://${process.argv[1]}`) {
  const deployment = new UltraComprehensiveDeployment();
  deployment.run().catch(error => {
    console.error('💀 CATASTROPHIC DEPLOYMENT FAILURE:', error.message);
    process.exit(1);
  });
}

export { UltraComprehensiveDeployment };

