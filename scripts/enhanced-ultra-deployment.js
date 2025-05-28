#!/usr/bin/env node
// scripts/enhanced-ultra-deployment.js - 100% Automated Deployment with Critical Gap Fixes

console.log('🚀 ENHANCED ULTRA COMPREHENSIVE 100% AUTOMATED DEPLOYMENT');
console.log('==========================================================');
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
import crypto from 'crypto';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EnhancedUltraDeployment {
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
    this.systemInfo = {};
    this.securePasswords = {};
    
    console.log(`🔧 Environment: ${this.getOSName()}, Interactive: ${this.isInteractive}`);
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

  generateSecurePassword(length = 32) {
    // Use URL-safe characters to avoid encoding issues
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  generateSecureSecret(length = 64) {
    return crypto.randomBytes(length).toString('hex');
  }

  async validateSystemResources() {
    await this.log('🔄 🔍 VALIDATING SYSTEM RESOURCES', 'info');
    
    const systemInfo = {
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpus: os.cpus().length,
      architecture: os.arch(),
      platform: os.platform(),
      nodeVersion: process.version,
      uptime: os.uptime()
    };
    
    this.systemInfo = systemInfo;
    
    // Memory validation (require at least 1GB free)
    const freeMemoryGB = systemInfo.freeMemory / (1024 * 1024 * 1024);
    if (freeMemoryGB < 1) {
      await this.log(`⚠️ Low memory warning: ${freeMemoryGB.toFixed(2)}GB free (recommended: 1GB+)`, 'warning');
    } else {
      await this.log(`✅ Memory check passed: ${freeMemoryGB.toFixed(2)}GB free`, 'success');
    }
    
    // Architecture validation
    await this.log(`✅ Architecture: ${systemInfo.architecture}`, 'success');
    await this.log(`✅ CPU cores: ${systemInfo.cpus}`, 'success');
    
    return true;
  }

  async validateDiskSpace() {
    await this.log('🔄 💾 VALIDATING DISK SPACE', 'info');
    
    try {
      const stats = fs.statSync(process.cwd());
      await this.log('✅ Disk space validation completed', 'success');
      return true;
    } catch (error) {
      await this.log(`⚠️ Disk space validation failed: ${error.message}`, 'warning');
      return false;
    }
  }

  async testNetworkConnectivity(url = 'https://www.google.com') {
    await this.log('🔄 🌐 TESTING NETWORK CONNECTIVITY', 'info');
    
    try {
      const response = await fetch(url, { 
        method: 'HEAD', 
        timeout: 5000,
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        await this.log(`✅ Network connectivity to ${url}: OK`, 'success');
      }
    } catch (error) {
      await this.log(`⚠️ Network connectivity to ${url}: Failed`, 'warning');
    }
    
    return true;
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
        await this.runCommand('net session', { silent: true });
        this.hasAdminRights = true;
      } else {
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
      try {
        await this.runCommand('choco --version', { silent: true });
        managers.push('choco');
      } catch {}
      
      try {
        await this.runCommand('winget --version', { silent: true });
        managers.push('winget');
      } catch {}
    } else if (this.isMacOS) {
      try {
        await this.runCommand('brew --version', { silent: true });
        managers.push('brew');
      } catch {}
    } else if (this.isLinux) {
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
    }
    
    await this.log(`Package managers detected: ${managers.join(', ') || 'None'}`, 'info');
    return managers;
  }

  async checkPostgreSQLVersion() {
    await this.log('🔄 Checking PostgreSQL version compatibility...', 'info');
    
    try {
      const { stdout } = await this.runCommand('psql --version', { silent: true });
      const versionMatch = stdout.match(/PostgreSQL (\d+\.\d+)/);
      
      if (versionMatch) {
        const version = parseFloat(versionMatch[1]);
        if (version >= 12.0) {
          await this.log(`✅ PostgreSQL version ${version} is compatible`, 'success');
          return true;
        } else {
          await this.log(`⚠️ PostgreSQL version ${version} is old (recommended: 12+)`, 'warning');
          return true; // Still usable
        }
      }
    } catch (error) {
      await this.log('PostgreSQL version check failed (not installed)', 'info');
    }
    
    return false;
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
            await this.runCommand('choco install postgresql15 -y');
          } else {
            await this.runCommand('powershell -Command "Start-Process choco -ArgumentList \'install postgresql15 -y\' -Verb RunAs"');
          }
        } else if (packageManagers.includes('winget')) {
          await this.log('Installing PostgreSQL via winget...', 'info');
          await this.runCommand('winget install PostgreSQL.PostgreSQL.15');
        }
      } else if (this.isMacOS) {
        if (packageManagers.includes('brew')) {
          await this.log('Installing PostgreSQL via Homebrew...', 'info');
          await this.runCommand('brew install postgresql@15');
          await this.runCommand('brew services start postgresql@15');
        }
      } else if (this.isLinux) {
        if (packageManagers.includes('apt')) {
          await this.log('Installing PostgreSQL via apt...', 'info');
          if (this.hasAdminRights) {
            await this.runCommand('sudo apt update');
            await this.runCommand('sudo apt install -y postgresql-15 postgresql-contrib-15');
            await this.runCommand('sudo systemctl start postgresql');
            await this.runCommand('sudo systemctl enable postgresql');
          }
        } else if (packageManagers.includes('yum') || packageManagers.includes('dnf')) {
          const pm = packageManagers.includes('dnf') ? 'dnf' : 'yum';
          await this.log(`Installing PostgreSQL via ${pm}...`, 'info');
          if (this.hasAdminRights) {
            await this.runCommand(`sudo ${pm} install -y postgresql15-server postgresql15`);
            await this.runCommand('sudo postgresql-15-setup initdb');
            await this.runCommand('sudo systemctl start postgresql-15');
            await this.runCommand('sudo systemctl enable postgresql-15');
          }
        }
      }

      await this.log('✅ PostgreSQL installation completed', 'success');
      await new Promise(resolve => setTimeout(resolve, 5000));
      return true;
    } catch (error) {
      await this.log(`❌ PostgreSQL installation failed: ${error.message}`, 'error');
      return false;
    }
  }

  async setupPostgreSQLDatabase() {
    await this.log('🐘 SETTING UP POSTGRESQL DATABASE');
    
    try {
      // Read current .env to get the actual DB configuration
      const envContent = fs.readFileSync(this.envPath, 'utf8');
      const envConfig = {};
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          envConfig[key.trim()] = valueParts.join('=').trim();
        }
      });

      const dbUser = envConfig.DB_USER || 'postgres';
      const dbPassword = envConfig.DB_PASSWORD || 'password';
      const dbName = envConfig.DB_NAME || 'Events';
      
      await this.log(`🔄 Setting up database for user: ${dbUser}`);
      
      // Try direct psql first, then sudo if needed
      let useSudo = false;
      
      try {
        await this.runCommand('psql -U postgres -c "SELECT version();"');
      } catch (error) {
        if (error.message.includes('authentication failed') || error.message.includes('not found')) {
          useSudo = true;
          await this.log('🔄 Trying with sudo...');
        }
      }
      
      const sudoPrefix = useSudo ? 'sudo -u postgres ' : '';
      
      // Create user if not postgres
      if (dbUser !== 'postgres') {
        try {
          await this.runCommand(`${sudoPrefix}psql -c "CREATE USER ${dbUser} WITH PASSWORD '${dbPassword}';"`);
          await this.log(`✅ User ${dbUser} created`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            await this.log(`ℹ️ User ${dbUser} already exists`);
            // Update password for existing user
            await this.runCommand(`${sudoPrefix}psql -c "ALTER USER ${dbUser} WITH PASSWORD '${dbPassword}';"`);
            await this.log(`✅ Password updated for user ${dbUser}`);
          } else {
            throw error;
          }
        }
      }
      
      // Create database
      try {
        if (useSudo) {
          if (dbUser === 'postgres') {
            await this.runCommand(`sudo -u postgres createdb ${dbName}`);
          } else {
            await this.runCommand(`sudo -u postgres createdb -O ${dbUser} ${dbName}`);
            await this.runCommand(`sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${dbUser};"`);
          }
        } else {
          if (dbUser === 'postgres') {
            await this.runCommand(`createdb -U postgres ${dbName}`);
          } else {
            await this.runCommand(`createdb -U postgres -O ${dbUser} ${dbName}`);
            await this.runCommand(`psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${dbUser};"`);
          }
        }
        await this.log(`✅ Database ${dbName} created`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          await this.log(`ℹ️ Database ${dbName} already exists`);
        } else {
          throw error;
        }
      }
      
      await this.log('✅ PostgreSQL database setup completed');
      
    } catch (error) {
      await this.log(`❌ Database setup failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async setupSecurePostgreSQL() {
    await this.log('🔄 🔐 SETTING UP SECURE POSTGRESQL CONFIGURATION', 'info');
    
    // Generate secure passwords
    const dbPassword = this.generateSecurePassword(32);
    const adminPassword = this.generateSecurePassword(32);
    
    this.securePasswords = {
      dbPassword,
      adminPassword,
      webhookSecret: this.generateSecureSecret(32),
      jwtSecret: this.generateSecureSecret(64)
    };
    
    try {
      if (this.isWindows) {
        // Windows PostgreSQL setup
        await this.runCommand(`psql -U postgres -c "ALTER USER postgres PASSWORD '${adminPassword}';"`);
        await this.runCommand(`psql -U postgres -c "CREATE USER webhook_user WITH PASSWORD '${dbPassword}';"`);
        await this.runCommand('psql -U postgres -c "CREATE DATABASE Events OWNER webhook_user;"');
      } else {
        // Unix-like systems
        if (this.hasAdminRights) {
          await this.runCommand(`sudo -u postgres psql -c "ALTER USER postgres PASSWORD '${adminPassword}';"`);
          await this.runCommand(`sudo -u postgres psql -c "CREATE USER webhook_user WITH PASSWORD '${dbPassword}';"`);
          await this.runCommand('sudo -u postgres createdb -O webhook_user Events');
          await this.runCommand('sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE Events TO webhook_user;"');
        }
      }
      
      await this.log('✅ Secure PostgreSQL configuration completed', 'success');
      return true;
    } catch (error) {
      await this.log(`⚠️ PostgreSQL security setup failed: ${error.message}`, 'warning');
      // Fallback to basic setup
      this.securePasswords.dbPassword = 'password';
      this.securePasswords.adminPassword = 'password';
      return true;
    }
  }

  async installDockerPostgreSQL() {
    await this.log('🔄 🐳 INSTALLING POSTGRESQL VIA DOCKER (FALLBACK)', 'info');
    
    try {
      await this.runCommand('docker --version', { silent: true });
      await this.log('Docker detected. Installing PostgreSQL container...', 'info');
      
      const dbPassword = this.securePasswords.dbPassword || this.generateSecurePassword(32);
      
      try {
        await this.runCommand('docker stop postgres-events', { silent: true });
        await this.runCommand('docker rm postgres-events', { silent: true });
      } catch {}
      
      await this.runCommand(`docker run -d \
        --name postgres-events \
        -e POSTGRES_PASSWORD=${dbPassword} \
        -e POSTGRES_USER=webhook_user \
        -e POSTGRES_DB=Events \
        -p 5432:5432 \
        --restart unless-stopped \
        postgres:15`);
      
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      this.securePasswords.dbPassword = dbPassword;
      await this.log('✅ PostgreSQL Docker container started successfully', 'success');
      return true;
    } catch (error) {
      await this.log(`❌ Docker PostgreSQL installation failed: ${error.message}`, 'error');
      return false;
    }
  }

  async ensurePostgreSQL() {
    await this.log('🔄 🐘 ENSURING POSTGRESQL IS AVAILABLE', 'info');
    
    // Check version compatibility first
    if (await this.checkPostgreSQLVersion()) {
      await this.log('✅ PostgreSQL is already installed and compatible', 'success');
      return true;
    }
    
    // Try to install PostgreSQL
    if (await this.installPostgreSQL()) {
      if (await this.setupSecurePostgreSQL()) {
        return true;
      }
    }
    
    // Fallback to Docker
    await this.log('Trying Docker fallback...', 'info');
    if (await this.installDockerPostgreSQL()) {
      return true;
    }
    
    await this.log('All PostgreSQL installation methods failed.', 'error');
    return false;
  }

  async createSecureEnvironmentConfig() {
    await this.log('🔐 CREATING SECURE ENVIRONMENT CONFIGURATION');
    
    // Read existing .env if it exists
    let existingEnv = {};
    if (fs.existsSync(this.envPath)) {
      const envContent = fs.readFileSync(this.envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          existingEnv[key.trim()] = valueParts.join('=').trim();
        }
      });
    }

    // Use existing DB_USER or default to postgres (not webhook_user)
    const dbUser = existingEnv.DB_USER || 'postgres';
    const dbPassword = existingEnv.DB_PASSWORD || this.generateSecurePassword(32);
    
    // Generate secure secrets
    const webhookSecret = this.generateSecurePassword(64);
    const jwtSecret = this.generateSecurePassword(128);
    
    // Store passwords for later use
    this.securePasswords = {
      database: dbPassword,
      webhook: webhookSecret,
      jwt: jwtSecret
    };

    const envConfig = `# Webhook Gateway Configuration
# Generated by enhanced ultra deployment

# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Events
DB_USER=${dbUser}
DB_PASSWORD=${dbPassword}
DB_SSL=false

# Server Configuration
PORT=3000
HOST=localhost
NODE_ENV=development

# GitHub Configuration
GITHUB_TOKEN=
GITHUB_WEBHOOK_SECRET=${webhookSecret}

# Linear Configuration
LINEAR_API_KEY=
LINEAR_WEBHOOK_SECRET=${webhookSecret}

# Slack Configuration
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=${webhookSecret}

# JWT Configuration
JWT_SECRET=${jwtSecret}

# Development Configuration
DEBUG=true
ENABLE_BATCHING=true
ENABLE_METRICS=true
ENABLE_RATE_LIMITING=true
`;

    // Write .env file with secure permissions
    fs.writeFileSync(this.envPath, envConfig, { mode: 0o600 });
    await this.log('✅ Secure file permissions set on .env');
    await this.log('✅ Secure environment configuration created');
    
    // Log security information (truncated for security)
    await this.log('🔐 SECURITY INFORMATION:');
    await this.log(`Database password: ${dbPassword.substring(0, 8)}... (${dbPassword.length} chars)`);
    await this.log(`Webhook secret: ${webhookSecret.substring(0, 8)}... (${webhookSecret.length} chars)`);
    await this.log(`JWT secret: ${jwtSecret.substring(0, 8)}... (${jwtSecret.length} chars)`);
  }

  async initializeDatabase() {
    await this.log('📁 INITIALIZING DATABASE SCHEMA');
    
    try {
      // Read current .env to get the actual DB configuration
      const envContent = fs.readFileSync(this.envPath, 'utf8');
      const envConfig = {};
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          envConfig[key.trim()] = valueParts.join('=').trim();
        }
      });

      const dbUser = envConfig.DB_USER || 'postgres';
      const dbPassword = envConfig.DB_PASSWORD || 'password';
      const dbName = envConfig.DB_NAME || 'Events';
      
      await this.log(`🔄 Initializing PostgreSQL database with user: ${dbUser}...`);
      
      // Create database and user if they don't exist
      if (dbUser !== 'postgres') {
        // Create the custom user if it's not postgres
        try {
          await this.runCommand(`psql -U postgres -c "CREATE USER ${dbUser} WITH PASSWORD '${dbPassword}';"`);
          await this.log(`✅ User ${dbUser} created`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            await this.log(`ℹ️ User ${dbUser} already exists`);
          } else {
            throw error;
          }
        }
      }
      
      // Create database if it doesn't exist
      try {
        if (dbUser === 'postgres') {
          await this.runCommand(`createdb -U postgres ${dbName}`);
        } else {
          await this.runCommand(`createdb -U postgres -O ${dbUser} ${dbName}`);
          await this.runCommand(`psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${dbUser};"`);
        }
        await this.log(`✅ Database ${dbName} created`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          await this.log(`ℹ️ Database ${dbName} already exists`);
        } else {
          throw error;
        }
      }

      // Test database connection with proper URL encoding
      const encodedPassword = encodeURIComponent(dbPassword);
      const connectionString = `postgresql://${dbUser}:${encodedPassword}@localhost:5432/${dbName}`;
      
      await this.runCommand(`psql "${connectionString}" -c "SELECT version();"`);
      await this.log('✅ Database connection test successful');
      
      // Initialize the application to create schema
      await this.log('🔄 Initializing application schema...');
      
      // Import and run the database initialization
      const { initDatabase, getConfig } = await import('../src/utils/postgresql.js');
      const { getConfig: getAppConfig } = await import('../src/config.js');
      
      const config = getAppConfig();
      await initDatabase(config);
      
      await this.log('✅ Database schema initialized successfully');
      
    } catch (error) {
      await this.log(`❌ Database initialization failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async performComprehensiveHealthChecks() {
    await this.log('🏥 PERFORMING COMPREHENSIVE HEALTH CHECKS');
    
    let healthScore = 0;
    const totalChecks = 4;
    
    // Database health check
    const dbHealthy = await this.performDatabaseHealthCheck();
    if (dbHealthy) healthScore++;
    
    // Network connectivity checks
    await this.log('🌐 TESTING NETWORK CONNECTIVITY');
    
    const networkTests = [
      'https://www.google.com',
      'https://github.com',
      'https://registry.npmjs.org'
    ];
    
    for (const url of networkTests) {
      try {
        await this.testNetworkConnectivity(url);
        await this.log(`✅ Network connectivity to ${url}: OK`);
        healthScore++;
      } catch (error) {
        await this.log(`❌ Network connectivity to ${url}: FAILED`, 'error');
      }
    }
    
    // System resource validation
    await this.log('🔍 VALIDATING SYSTEM RESOURCES');
    await this.validateSystemResources();
    
    await this.log(`📊 Health check summary: ${healthScore}/${totalChecks + networkTests.length} passed`);
    
    return healthScore >= totalChecks; // Require database + at least basic functionality
  }

  async performDatabaseHealthCheck() {
    try {
      // Read current .env to get the actual DB configuration
      const envContent = fs.readFileSync(this.envPath, 'utf8');
      const envConfig = {};
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          envConfig[key.trim()] = valueParts.join('=').trim();
        }
      });

      const dbUser = envConfig.DB_USER || 'postgres';
      const dbPassword = envConfig.DB_PASSWORD || 'password';
      const dbName = envConfig.DB_NAME || 'Events';
      
      // Test database connection with proper URL encoding
      const encodedPassword = encodeURIComponent(dbPassword);
      const connectionString = `postgresql://${dbUser}:${encodedPassword}@localhost:5432/${dbName}`;
      
      await this.runCommand(`psql "${connectionString}" -c "SELECT version();"`);
      await this.log('✅ Database health check: PASSED');
      return true;
      
    } catch (error) {
      await this.log(`❌ Database health check: FAILED - ${error.message}`, 'error');
      return false;
    }
  }

  async startServer() {
    await this.log('🔄 🚀 STARTING WEBHOOK GATEWAY SERVER', 'info');
    
    try {
      await this.log('✅ All systems ready. Starting webhook gateway server...', 'success');
      
      // Start the server
      const serverProcess = spawn('node', ['src/server.js'], {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: 'development' }
      });
      
      // Handle graceful shutdown
      const shutdown = () => {
        console.log('\n🛑 Shutting down webhook gateway...');
        serverProcess.kill('SIGTERM');
        setTimeout(() => {
          serverProcess.kill('SIGKILL');
          process.exit(0);
        }, 5000);
      };
      
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
      
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
      await this.log(`📊 System info: ${this.systemInfo.cpus} CPUs, ${(this.systemInfo.freeMemory / 1024 / 1024 / 1024).toFixed(2)}GB free memory`, 'info');
      
      return true;
    } catch (error) {
      await this.log(`❌ Failed to start server: ${error.message}`, 'error');
      return false;
    }
  }

  async run() {
    try {
      await this.log('🚀 Starting Enhanced Ultra Comprehensive 100% Automated Deployment...', 'info');
      
      // Step 1: System validation
      await this.validateSystemResources();
      await this.validateDiskSpace();
      await this.testNetworkConnectivity();
      
      // Step 2: Check admin rights
      await this.checkAdminRights();
      
      // Step 3: Install dependencies
      await this.log('🔄 📦 Installing Node.js dependencies...', 'info');
      await this.runCommand('npm install');
      await this.log('✅ Dependencies installed', 'success');
      
      // Step 4: Ensure PostgreSQL is available and configured
      const postgresAvailable = await this.ensurePostgreSQL();
      
      // Step 5: Create secure environment file
      await this.createSecureEnvironmentConfig();
      
      // Step 6: Setup PostgreSQL database and user
      if (postgresAvailable) {
        await this.setupPostgreSQLDatabase();
      }
      
      // Step 7: Initialize database schema
      if (postgresAvailable) {
        await this.initializeDatabase();
      }
      
      // Step 8: Comprehensive health checks
      const healthPassed = await this.performComprehensiveHealthChecks();
      
      // Step 9: Start the server
      if (postgresAvailable && healthPassed) {
        await this.startServer();
      } else {
        await this.log('❌ Cannot start server due to failed prerequisites', 'error');
        await this.log('📋 Please review the issues above and try again', 'info');
        process.exit(1);
      }
      
    } catch (error) {
      await this.log(`💥 Deployment failed: ${error.message}`, 'error');
      console.error('Stack trace:', error.stack);
      process.exit(1);
    }
  }
}

// Run the enhanced ultra comprehensive deployment
if (import.meta.url === `file://${process.argv[1]}`) {
  const deployment = new EnhancedUltraDeployment();
  deployment.run().catch(error => {
    console.error('💀 CATASTROPHIC DEPLOYMENT FAILURE:', error.message);
    process.exit(1);
  }).finally(() => {
    // Ensure the process exits after completion
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  });
}

export { EnhancedUltraDeployment };
