#!/usr/bin/env node
// scripts/comprehensive-dev-setup.js - Single Comprehensive Development Setup
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { promisify } from 'util';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Comprehensive Development Setup Class
class ComprehensiveDevSetup {
  constructor() {
    this.envPath = path.join(__dirname, '..', '.env');
    this.config = {};
    this.issues = [];
    this.fixes = [];
    this.isInteractive = process.stdin.isTTY && process.stdout.isTTY && !process.env.CI;
    
    // Required environment variables with validation
    this.requiredEnvVars = {
      // Database Configuration
      DB_HOST: { default: 'localhost', required: true, description: 'PostgreSQL host' },
      DB_PORT: { default: '5432', required: true, description: 'PostgreSQL port', validate: this.validatePort },
      DB_NAME: { default: 'Events', required: true, description: 'Database name' },
      DB_USER: { default: 'postgres', required: true, description: 'Database user' },
      DB_PASSWORD: { default: 'password', required: true, description: 'Database password', sensitive: true },
      
      // Server Configuration
      PORT: { default: '3000', required: true, description: 'Server port', validate: this.validatePort },
      HOST: { default: 'localhost', required: false, description: 'Server host' },
      NODE_ENV: { default: 'development', required: false, description: 'Environment' },
      
      // API Tokens (optional but recommended)
      GITHUB_TOKEN: { default: '', required: false, description: 'GitHub Personal Access Token', sensitive: true },
      GITHUB_WEBHOOK_SECRET: { default: '', required: false, description: 'GitHub Webhook Secret', sensitive: true },
      LINEAR_API_KEY: { default: '', required: false, description: 'Linear API Key', sensitive: true },
      LINEAR_WEBHOOK_SECRET: { default: '', required: false, description: 'Linear Webhook Secret', sensitive: true },
      SLACK_BOT_TOKEN: { default: '', required: false, description: 'Slack Bot Token', sensitive: true },
      SLACK_SIGNING_SECRET: { default: '', required: false, description: 'Slack Signing Secret', sensitive: true }
    };
    
    if (this.isInteractive) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
    }
  }

  // Utility Methods
  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',     // Cyan
      success: '\x1b[32m',  // Green
      warning: '\x1b[33m',  // Yellow
      error: '\x1b[31m',    // Red
      step: '\x1b[35m',     // Magenta
      reset: '\x1b[0m'      // Reset
    };
    
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      step: '🔄'
    };
    
    console.log(`${colors[type]}[${timestamp}] ${icons[type]} ${message}${colors.reset}`);
  }

  async runCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, { 
        shell: true, 
        stdio: options.silent ? 'pipe' : 'inherit',
        timeout: options.timeout || 30000,
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

  async question(prompt, options = {}) {
    if (!this.isInteractive) {
      // In non-interactive mode, use defaults
      return '';
    }
    
    return new Promise((resolve) => {
      if (options.sensitive) {
        // Hide input for sensitive data
        process.stdout.write(prompt);
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        
        let input = '';
        const onData = (char) => {
          if (char === '\u0003') { // Ctrl+C
            process.exit();
          } else if (char === '\r' || char === '\n') {
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdin.removeListener('data', onData);
            process.stdout.write('\n');
            resolve(input);
          } else if (char === '\u007f') { // Backspace
            if (input.length > 0) {
              input = input.slice(0, -1);
              process.stdout.write('\b \b');
            }
          } else {
            input += char;
            process.stdout.write('*');
          }
        };
        
        process.stdin.on('data', onData);
      } else {
        this.rl.question(prompt, resolve);
      }
    });
  }

  validatePort(value) {
    const port = parseInt(value);
    if (isNaN(port) || port < 1 || port > 65535) {
      return 'Port must be a number between 1 and 65535';
    }
    return null;
  }

  // Step 1: System Validation
  async validateSystem() {
    this.log('🔍 COMPREHENSIVE SYSTEM VALIDATION', 'step');
    
    try {
      // Check Node.js version
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      
      if (majorVersion < 16) {
        this.issues.push(`Node.js version ${nodeVersion} is too old. Requires 16+`);
        this.log(`Node.js version ${nodeVersion} is not supported. Please upgrade to Node.js 16+`, 'error');
      } else {
        this.log(`Node.js version ${nodeVersion} ✓`, 'success');
      }
      
      // Check npm
      try {
        const { stdout } = await this.runCommand('npm --version', { silent: true });
        this.log(`npm version ${stdout.trim()} ���`, 'success');
      } catch (error) {
        this.issues.push('npm is not available');
        this.log('npm is not available. Please install npm.', 'error');
      }
      
      // Check project structure
      const packageJsonPath = path.join(__dirname, '..', 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        this.issues.push('package.json not found');
        this.log('package.json not found. Please run from project root.', 'error');
      } else {
        this.log('Project structure validated ✓', 'success');
      }
      
      // Check and install dependencies
      await this.validateDependencies();
      
      // Check PostgreSQL
      await this.validatePostgreSQL();
      
    } catch (error) {
      this.issues.push(`System validation failed: ${error.message}`);
      this.log(`System validation failed: ${error.message}`, 'error');
    }
  }

  async validateDependencies() {
    this.log('📦 Checking dependencies...', 'step');
    
    const requiredDeps = ['chalk', 'pg', 'express', 'cors', 'helmet'];
    const missingDeps = [];
    
    for (const dep of requiredDeps) {
      try {
        await import(dep);
      } catch (error) {
        missingDeps.push(dep);
      }
    }
    
    if (missingDeps.length > 0) {
      this.log(`Missing dependencies: ${missingDeps.join(', ')}`, 'warning');
      this.log('Installing missing dependencies...', 'step');
      
      try {
        await this.runCommand(`npm install ${missingDeps.join(' ')}`, { timeout: 120000 });
        this.log('Dependencies installed successfully ✓', 'success');
        this.fixes.push(`Installed missing dependencies: ${missingDeps.join(', ')}`);
      } catch (error) {
        this.issues.push(`Failed to install dependencies: ${error.message}`);
        this.log(`Failed to install dependencies: ${error.message}`, 'error');
      }
    } else {
      this.log('All required dependencies available ✓', 'success');
    }
  }

  async validatePostgreSQL() {
    this.log('🐘 Checking PostgreSQL...', 'step');
    
    try {
      // Check if psql is available
      await this.runCommand('psql --version', { silent: true });
      this.log('PostgreSQL client (psql) detected ✓', 'success');
      
      // Check if PostgreSQL service is running
      if (process.platform === 'win32') {
        try {
          const { stdout } = await this.runCommand('powershell "Get-Service postgresql*"', { silent: true });
          if (stdout.includes('Running')) {
            this.log('PostgreSQL service is running ✓', 'success');
          } else {
            this.issues.push('PostgreSQL service not running');
            this.log('PostgreSQL service not running', 'warning');
          }
        } catch (error) {
          this.issues.push('Cannot check PostgreSQL service status');
          this.log('Cannot check PostgreSQL service status', 'warning');
        }
      } else {
        try {
          await this.runCommand('systemctl is-active postgresql', { silent: true });
          this.log('PostgreSQL service is running ✓', 'success');
        } catch (error) {
          this.issues.push('PostgreSQL service not running');
          this.log('PostgreSQL service not running', 'warning');
        }
      }
      
      // Detect PostgreSQL port
      await this.detectPostgreSQLPort();
      
    } catch (error) {
      this.issues.push('PostgreSQL not installed or not in PATH');
      this.log('PostgreSQL not detected. Please install PostgreSQL.', 'warning');
      this.showPostgreSQLInstallInstructions();
    }
  }

  async detectPostgreSQLPort() {
    this.log('🔍 Detecting PostgreSQL port...', 'step');
    
    const portsToCheck = ['5432', '5433', '5434'];
    let detectedPort = null;
    
    for (const port of portsToCheck) {
      try {
        if (process.platform === 'win32') {
          const { stdout } = await this.runCommand(`netstat -an | findstr :${port}`, { silent: true });
          if (stdout.includes(`:${port}`)) {
            detectedPort = port;
            break;
          }
        } else {
          const { stdout } = await this.runCommand(`netstat -an | grep :${port}`, { silent: true });
          if (stdout.includes(`:${port}`)) {
            detectedPort = port;
            break;
          }
        }
      } catch (error) {
        // Port not found, continue checking
      }
    }
    
    if (detectedPort) {
      this.log(`PostgreSQL detected on port ${detectedPort} ✓`, 'success');
      this.config.detectedPostgreSQLPort = detectedPort;
    } else {
      this.issues.push('PostgreSQL port not detected');
      this.log('PostgreSQL port not detected. Using default 5432.', 'warning');
      this.config.detectedPostgreSQLPort = '5432';
    }
  }

  showPostgreSQLInstallInstructions() {
    console.log('\n📋 PostgreSQL Installation Instructions:');
    console.log('');
    
    if (process.platform === 'win32') {
      console.log('Windows:');
      console.log('1. Download from: https://www.postgresql.org/download/windows/');
      console.log('2. Run the installer and follow the setup wizard');
      console.log('3. Remember the password you set for the postgres user');
    } else if (process.platform === 'darwin') {
      console.log('macOS:');
      console.log('1. Install via Homebrew: brew install postgresql');
      console.log('2. Start service: brew services start postgresql');
    } else {
      console.log('Linux:');
      console.log('1. Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib');
      console.log('2. CentOS/RHEL: sudo yum install postgresql postgresql-server');
      console.log('3. Start service: sudo systemctl start postgresql');
    }
    console.log('');
  }

  // Step 2: Environment Configuration
  async configureEnvironment() {
    this.log('⚙️ COMPREHENSIVE ENVIRONMENT CONFIGURATION', 'step');
    
    // Load existing .env if it exists
    this.loadExistingEnv();
    
    // Validate and prompt for missing values
    await this.validateAndPromptEnvVars();
    
    // Apply automatic fixes
    this.applyEnvironmentFixes();
    
    // Save configuration
    this.saveEnvironment();
  }

  loadExistingEnv() {
    if (fs.existsSync(this.envPath)) {
      const envContent = fs.readFileSync(this.envPath, 'utf8');
      const lines = envContent.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            this.config[key] = valueParts.join('=');
          }
        }
      }
      
      this.log('Loaded existing .env configuration', 'info');
    } else {
      this.log('No existing .env file found. Will create new one.', 'info');
    }
  }

  async validateAndPromptEnvVars() {
    this.log('🔧 Validating environment variables...', 'step');
    
    for (const [key, spec] of Object.entries(this.requiredEnvVars)) {
      const currentValue = this.config[key];
      const hasValidValue = currentValue && 
                           currentValue !== '' && 
                           !currentValue.includes('your_') && 
                           !currentValue.includes('_here');
      
      // Validate existing value
      if (hasValidValue && spec.validate) {
        const validationError = spec.validate(currentValue);
        if (validationError) {
          this.log(`Invalid ${key}: ${validationError}`, 'warning');
          this.issues.push(`Invalid ${key}: ${validationError}`);
          // Will prompt for new value below
        } else {
          this.log(`${key}: Valid ✓`, 'success');
          continue;
        }
      }
      
      // Prompt for missing or invalid required values
      if (spec.required && (!hasValidValue || (spec.validate && spec.validate(currentValue)))) {
        if (!this.isInteractive) {
          // In non-interactive mode, use defaults for required values
          this.config[key] = spec.default;
          this.fixes.push(`Set ${key} to default value (non-interactive mode)`);
          continue;
        }
        
        console.log(`\n🔧 ${key} is required but missing or invalid.`);
        console.log(`   Description: ${spec.description}`);
        
        let prompt = `Enter ${spec.description}`;
        if (spec.default) {
          prompt += ` [${spec.default}]`;
        }
        prompt += ': ';
        
        const value = await this.question(prompt, { sensitive: spec.sensitive });
        this.config[key] = value || spec.default;
        
        // Validate the new value
        if (spec.validate) {
          const validationError = spec.validate(this.config[key]);
          if (validationError) {
            this.log(`Validation error: ${validationError}`, 'error');
            this.issues.push(`Validation error for ${key}: ${validationError}`);
          }
        }
        
        this.fixes.push(`Set ${key} to user-provided value`);
      }
      
      // Prompt for optional values that are missing
      else if (!spec.required && !hasValidValue) {
        if (!this.isInteractive) {
          // In non-interactive mode, use defaults for optional values
          this.config[key] = spec.default;
          continue;
        }
        
        console.log(`\n💡 ${key} is optional but recommended.`);
        console.log(`   Description: ${spec.description}`);
        
        const shouldSet = await this.question(`Would you like to set ${key}? (y/n) [n]: `);
        if (shouldSet.toLowerCase() === 'y' || shouldSet.toLowerCase() === 'yes') {
          let prompt = `Enter ${spec.description}`;
          if (spec.default) {
            prompt += ` [${spec.default}]`;
          }
          prompt += ': ';
          
          const value = await this.question(prompt, { sensitive: spec.sensitive });
          this.config[key] = value || spec.default;
          this.fixes.push(`Set optional ${key}`);
        } else {
          this.config[key] = spec.default;
        }
      }
      
      // Set defaults for missing non-required values
      else if (!hasValidValue) {
        this.config[key] = spec.default;
        if (spec.default) {
          this.fixes.push(`Set ${key} to default value: ${spec.default}`);
        }
      }
    }
  }

  applyEnvironmentFixes() {
    this.log('🔧 Applying automatic fixes...', 'step');
    
    // Fix database port if PostgreSQL was detected on different port
    if (this.config.detectedPostgreSQLPort && this.config.DB_PORT !== this.config.detectedPostgreSQLPort) {
      this.log(`Fixing DB_PORT: ${this.config.DB_PORT} → ${this.config.detectedPostgreSQLPort}`, 'warning');
      this.config.DB_PORT = this.config.detectedPostgreSQLPort;
      this.fixes.push(`Fixed DB_PORT to detected PostgreSQL port: ${this.config.detectedPostgreSQLPort}`);
    }
    
    // Ensure SSL is disabled for local development
    if (!this.config.DB_SSL) {
      this.config.DB_SSL = 'false';
      this.fixes.push('Set DB_SSL to false for local development');
    }
    
    // Set debug mode for development
    if (!this.config.DEBUG) {
      this.config.DEBUG = 'true';
      this.fixes.push('Enabled debug mode for development');
    }
  }

  saveEnvironment() {
    this.log('💾 Saving environment configuration...', 'step');
    
    const envContent = Object.entries(this.config)
      .filter(([key, value]) => this.requiredEnvVars[key] || key.startsWith('DB_') || key.startsWith('DEBUG'))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    const fullEnvContent = `# Webhook Gateway Configuration
# Generated by comprehensive development setup

# PostgreSQL Database Configuration
DB_HOST=${this.config.DB_HOST || 'localhost'}
DB_PORT=${this.config.DB_PORT || '5432'}
DB_NAME=${this.config.DB_NAME || 'Events'}
DB_USER=${this.config.DB_USER || 'postgres'}
DB_PASSWORD=${this.config.DB_PASSWORD || 'password'}
DB_SSL=${this.config.DB_SSL || 'false'}

# Server Configuration
PORT=${this.config.PORT || '3000'}
HOST=${this.config.HOST || 'localhost'}
NODE_ENV=${this.config.NODE_ENV || 'development'}

# GitHub Configuration
GITHUB_TOKEN=${this.config.GITHUB_TOKEN || ''}
GITHUB_WEBHOOK_SECRET=${this.config.GITHUB_WEBHOOK_SECRET || ''}

# Linear Configuration
LINEAR_API_KEY=${this.config.LINEAR_API_KEY || ''}
LINEAR_WEBHOOK_SECRET=${this.config.LINEAR_WEBHOOK_SECRET || ''}

# Slack Configuration
SLACK_BOT_TOKEN=${this.config.SLACK_BOT_TOKEN || ''}
SLACK_SIGNING_SECRET=${this.config.SLACK_SIGNING_SECRET || ''}

# Development Configuration
DEBUG=${this.config.DEBUG || 'true'}
ENABLE_BATCHING=true
ENABLE_METRICS=true
ENABLE_RATE_LIMITING=true
`;
    
    fs.writeFileSync(this.envPath, fullEnvContent);
    this.log('Environment configuration saved ✓', 'success');
  }

  // Step 3: Database Setup
  async setupDatabase() {
    this.log('🗄️ COMPREHENSIVE DATABASE SETUP', 'step');
    
    try {
      // Test database connection
      await this.testDatabaseConnection();
      
      // Create database if it doesn't exist
      await this.createDatabaseIfNeeded();
      
      // Run database setup script
      await this.runDatabaseSetup();
      
    } catch (error) {
      this.issues.push(`Database setup failed: ${error.message}`);
      this.log(`Database setup failed: ${error.message}`, 'error');
      this.showDatabaseTroubleshooting();
    }
  }

  async testDatabaseConnection() {
    this.log('������ Testing database connection...', 'step');
    
    try {
      const { Pool } = await import('pg');
      const pool = new Pool({
        host: this.config.DB_HOST,
        port: parseInt(this.config.DB_PORT),
        database: 'postgres', // Connect to default database first
        user: this.config.DB_USER,
        password: this.config.DB_PASSWORD,
        ssl: this.config.DB_SSL === 'true',
        connectionTimeoutMillis: 5000
      });
      
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      await pool.end();
      
      this.log('Database connection successful ✓', 'success');
      
    } catch (error) {
      this.issues.push(`Database connection failed: ${error.message}`);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async createDatabaseIfNeeded() {
    this.log(`🏗️ Checking if database "${this.config.DB_NAME}" exists...`, 'step');
    
    try {
      const { Pool } = await import('pg');
      const pool = new Pool({
        host: this.config.DB_HOST,
        port: parseInt(this.config.DB_PORT),
        database: 'postgres',
        user: this.config.DB_USER,
        password: this.config.DB_PASSWORD,
        ssl: this.config.DB_SSL === 'true'
      });
      
      const client = await pool.connect();
      
      // Check if database exists
      const result = await client.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [this.config.DB_NAME]
      );
      
      if (result.rows.length === 0) {
        this.log(`Creating database "${this.config.DB_NAME}"...`, 'step');
        await client.query(`CREATE DATABASE "${this.config.DB_NAME}"`);
        this.log(`Database "${this.config.DB_NAME}" created ✓`, 'success');
        this.fixes.push(`Created database "${this.config.DB_NAME}"`);
      } else {
        this.log(`Database "${this.config.DB_NAME}" already exists ✓`, 'success');
      }
      
      client.release();
      await pool.end();
      
    } catch (error) {
      this.issues.push(`Failed to create database: ${error.message}`);
      throw new Error(`Failed to create database: ${error.message}`);
    }
  }

  async runDatabaseSetup() {
    this.log('📋 Running database schema setup...', 'step');
    
    try {
      await this.runCommand('npm run setup:db');
      this.log('Database schema setup completed ✓', 'success');
    } catch (error) {
      this.log('Database schema setup failed, but continuing...', 'warning');
      this.issues.push(`Database schema setup failed: ${error.message}`);
    }
  }

  showDatabaseTroubleshooting() {
    console.log('\n🔧 Database Troubleshooting:');
    console.log('');
    console.log('1. Ensure PostgreSQL is running:');
    if (process.platform === 'win32') {
      console.log('   - Check services: services.msc');
      console.log('   - Start service: net start postgresql-x64-[version]');
    } else {
      console.log('   - Check status: sudo systemctl status postgresql');
      console.log('   - Start service: sudo systemctl start postgresql');
    }
    console.log('');
    console.log('2. Verify credentials:');
    console.log(`   - Host: ${this.config.DB_HOST}`);
    console.log(`   - Port: ${this.config.DB_PORT}`);
    console.log(`   - User: ${this.config.DB_USER}`);
    console.log('');
    console.log('3. Test connection manually:');
    console.log(`   psql -h ${this.config.DB_HOST} -p ${this.config.DB_PORT} -U ${this.config.DB_USER} -d postgres`);
    console.log('');
  }

  // Step 4: Health Checks
  async runHealthChecks() {
    this.log('🏥 COMPREHENSIVE HEALTH CHECKS', 'step');
    
    try {
      await this.runCommand('npm run health:check');
      this.log('Health checks completed ✓', 'success');
    } catch (error) {
      this.log('Some health checks failed, but continuing...', 'warning');
      this.issues.push(`Health checks failed: ${error.message}`);
    }
  }

  // Step 5: Start Development Server
  async startDevelopmentServer() {
    this.log('🚀 STARTING DEVELOPMENT SERVER', 'step');
    
    // Final connection test before starting server
    try {
      await this.testDatabaseConnection();
      
      console.log('\n✨ Starting webhook gateway...');
      console.log(`🌐 Server will be available at: http://${this.config.HOST}:${this.config.PORT}`);
      console.log(`🏥 Health endpoint: http://${this.config.HOST}:${this.config.PORT}/health`);
      console.log(`📊 Metrics endpoint: http://${this.config.HOST}:${this.config.PORT}/metrics`);
      console.log('\n📡 Webhook endpoints:');
      console.log(`   • GitHub: http://${this.config.HOST}:${this.config.PORT}/webhook/github`);
      console.log(`   • Linear: http://${this.config.HOST}:${this.config.PORT}/webhook/linear`);
      console.log(`   • Slack: http://${this.config.HOST}:${this.config.PORT}/webhook/slack`);
      console.log('\n��� Press Ctrl+C to stop the server\n');
      
      // Start the server
      await this.runCommand('npm start');
      
    } catch (error) {
      this.log('Cannot start server - database connection failed', 'warning');
      console.log('\n⚠️  Server startup skipped due to database connection issues.');
      console.log('🎯 Setup completed with issues. Please resolve the following:');
      this.showSetupSummary();
      console.log('\n🔧 To start the server manually after fixing issues:');
      console.log('   npm start');
    }
  }

  // Main Setup Flow
  async run() {
    console.log('🎯 COMPREHENSIVE DEVELOPMENT SETUP');
    console.log('==================================');
    console.log('This will validate, configure, and start your webhook gateway.\n');
    
    try {
      // Step 1: System Validation
      await this.validateSystem();
      
      // Step 2: Environment Configuration
      await this.configureEnvironment();
      
      // Step 3: Database Setup
      await this.setupDatabase();
      
      // Step 4: Health Checks
      await this.runHealthChecks();
      
      // Step 5: Start Development Server
      await this.startDevelopmentServer();
      
    } catch (error) {
      this.log(`Setup failed: ${error.message}`, 'error');
      this.showSetupSummary();
    } finally {
      if (this.rl) {
        this.rl.close();
      }
    }
  }

  showSetupSummary() {
    console.log('\n📊 SETUP SUMMARY');
    console.log('================');
    
    if (this.fixes.length > 0) {
      console.log('\n✅ Fixes Applied:');
      this.fixes.forEach(fix => console.log(`   • ${fix}`));
    }
    
    if (this.issues.length > 0) {
      console.log('\n⚠️  Issues Found:');
      this.issues.forEach(issue => console.log(`   • ${issue}`));
      
      console.log('\n🔧 Recommended Actions:');
      console.log('   1. Review the issues above');
      console.log('   2. Fix any PostgreSQL connection problems');
      console.log('   3. Ensure all required services are running');
      console.log('   4. Run: npm run dev (to retry setup)');
      console.log('   5. Or run: npm start (to start server directly)');
    } else {
      console.log('\n🎉 All checks passed! Your development environment is ready.');
    }
    
    console.log('\n🛠️  Available Commands:');
    console.log('   npm run dev        - Run this comprehensive setup');
    console.log('   npm start          - Start the webhook gateway');
    console.log('   npm run health:check - Run health checks only');
    console.log('   npm run setup:db   - Setup database schema only');
  }
}

// Run the comprehensive setup
if (import.meta.url === `file://${process.argv[1]}`) {
  const setup = new ComprehensiveDevSetup();
  setup.run().catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

export { ComprehensiveDevSetup };
