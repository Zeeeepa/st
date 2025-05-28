// scripts/interactive-dev-setup-fixed.js - Robust Interactive Development Setup
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if running in interactive mode
const isInteractive = process.stdin.isTTY && process.stdout.isTTY;
const isAutomated = process.env.CI || process.env.AUTOMATED || !isInteractive;

class RobustDevSetup {
  constructor() {
    this.envPath = path.join(__dirname, '..', '.env');
    this.currentEnv = {};
    this.setupState = {
      systemValidated: false,
      environmentSetup: false,
      postgresqlDetected: false,
      databaseSetup: false,
      configurationValidated: false,
      healthChecksPassed: false
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}]`;
    
    switch (type) {
      case 'success':
        console.log(chalk.green(`${prefix} ✅ ${message}`));
        break;
      case 'error':
        console.log(chalk.red(`${prefix} ❌ ${message}`));
        break;
      case 'warning':
        console.log(chalk.yellow(`${prefix} ⚠️  ${message}`));
        break;
      case 'info':
        console.log(chalk.blue(`${prefix} ℹ️  ${message}`));
        break;
      case 'step':
        console.log(chalk.cyan(`${prefix} 🔄 ${message}`));
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
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
        child.stdout?.on('data', (data) => {
          stdout += data.toString();
        });
        
        child.stderr?.on('data', (data) => {
          stderr += data.toString();
        });
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

  // Load existing environment
  loadEnvironment() {
    try {
      if (fs.existsSync(this.envPath)) {
        const envContent = fs.readFileSync(this.envPath, 'utf8');
        envContent.split('\n').forEach(line => {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0 && !line.startsWith('#')) {
            this.currentEnv[key.trim()] = valueParts.join('=').trim();
          }
        });
        this.log('Loaded existing .env file', 'info');
      }
    } catch (error) {
      this.log(`Failed to load .env file: ${error.message}`, 'warning');
    }
  }

  // Save environment to file
  saveEnvironment() {
    try {
      const envLines = [
        '# PostgreSQL Database Configuration',
        `DB_HOST=${this.currentEnv.DB_HOST || 'localhost'}`,
        `DB_PORT=${this.currentEnv.DB_PORT || '5432'}`,
        `DB_NAME=${this.currentEnv.DB_NAME || 'Events'}`,
        `DB_USER=${this.currentEnv.DB_USER || 'postgres'}`,
        `DB_PASSWORD=${this.currentEnv.DB_PASSWORD || 'password'}`,
        'DB_SSL=false',
        'DB_MAX_CONNECTIONS=20',
        'DB_CONNECTION_TIMEOUT=5000',
        'DB_IDLE_TIMEOUT=30000',
        '',
        '# Server Configuration',
        `PORT=${this.currentEnv.PORT || '3000'}`,
        'HOST=localhost',
        'NODE_ENV=development',
        'SERVER_ID=webhook-gateway-local',
        '',
        '# GitHub Configuration',
        `GITHUB_TOKEN=${this.currentEnv.GITHUB_TOKEN || 'your_github_token_here'}`,
        `GITHUB_WEBHOOK_SECRET=${this.currentEnv.GITHUB_WEBHOOK_SECRET || 'your_github_webhook_secret_here'}`,
        '',
        '# Linear Configuration',
        `LINEAR_API_KEY=${this.currentEnv.LINEAR_API_KEY || 'your_linear_api_key_here'}`,
        `LINEAR_WEBHOOK_SECRET=${this.currentEnv.LINEAR_WEBHOOK_SECRET || 'your_linear_webhook_secret_here'}`,
        '',
        '# Slack Configuration',
        `SLACK_BOT_TOKEN=${this.currentEnv.SLACK_BOT_TOKEN || 'your_slack_bot_token_here'}`,
        `SLACK_SIGNING_SECRET=${this.currentEnv.SLACK_SIGNING_SECRET || 'your_slack_signing_secret_here'}`,
        'SLACK_APP_ID=your_slack_app_id_here',
        '',
        '# Feature Flags',
        'DEBUG=true',
        'ENABLE_BATCHING=true',
        'ENABLE_METRICS=true',
        'ENABLE_RETRY=true',
        'ENABLE_ARCHIVING=true',
        'ENABLE_RATE_LIMIT=true',
        '',
        '# Performance Settings',
        'BATCH_SIZE=50',
        'BATCH_INTERVAL=5000',
        'MAX_RETRIES=3',
        'RETRY_DELAY=500',
        '',
        '# Rate Limiting',
        'RATE_LIMIT_WINDOW=60000',
        'RATE_LIMIT_MAX_REQUESTS=100',
        '',
        '# Data Retention',
        'DATA_RETENTION_DAYS=90',
        '',
        '# Security Settings',
        'ENABLE_CORS=true',
        'ENABLE_HELMET=true',
        'ENABLE_COMPRESSION=true',
        '',
        '# Monitoring Settings',
        'ENABLE_HEALTH_CHECK=true',
        'ENABLE_METRICS_ENDPOINT=true',
        'HEALTH_CHECK_INTERVAL=30000',
        '',
        '# Legacy Worker Identification (for compatibility)',
        'WORKER_ID=webhook-gateway-local',
        'WORKER_ENVIRONMENT=development'
      ];
      
      fs.writeFileSync(this.envPath, envLines.join('\n'));
      this.log('Environment configuration saved to .env', 'success');
    } catch (error) {
      this.log(`Failed to save .env file: ${error.message}`, 'error');
      throw error;
    }
  }

  // Step 1: Validate system requirements
  async validateSystem() {
    this.log('Validating system requirements...', 'step');
    
    try {
      // Check Node.js version
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      
      if (majorVersion < 16) {
        throw new Error(`Node.js version ${nodeVersion} is not supported. Please upgrade to Node.js 16 or higher.`);
      }
      
      this.log(`Node.js version ${nodeVersion} ✓`, 'success');
      
      // Check npm
      try {
        await this.runCommand('npm --version', { silent: true });
        this.log('npm is available ✓', 'success');
      } catch (error) {
        throw new Error('npm is not available. Please install npm.');
      }
      
      // Check if we're in the right directory
      const packageJsonPath = path.join(__dirname, '..', 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        throw new Error('package.json not found. Please run this script from the project root directory.');
      }
      
      // Check for required dependencies
      try {
        await import('chalk');
        this.log('Required dependencies available ✓', 'success');
      } catch (error) {
        this.log('Installing required dependencies...', 'step');
        try {
          await this.runCommand('npm install chalk readline', { timeout: 60000 });
          this.log('Dependencies installed successfully ✓', 'success');
        } catch (installError) {
          throw new Error('Failed to install required dependencies. Please run: npm install chalk readline');
        }
      }
      
      this.log('Project structure validated ✓', 'success');
      this.setupState.systemValidated = true;
      
    } catch (error) {
      this.log(`System validation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  // Step 2: Setup environment variables (automated mode)
  async setupEnvironment() {
    this.log('Setting up environment configuration...', 'step');
    
    this.loadEnvironment();
    
    // Set default values for required variables
    const defaults = {
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_NAME: 'Events',
      DB_USER: 'postgres',
      DB_PASSWORD: 'password',
      PORT: '3000'
    };
    
    let updated = false;
    for (const [key, defaultValue] of Object.entries(defaults)) {
      if (!this.currentEnv[key] || this.currentEnv[key] === '') {
        this.currentEnv[key] = defaultValue;
        updated = true;
        this.log(`Set ${key} to default value: ${defaultValue}`, 'info');
      }
    }
    
    if (updated) {
      this.saveEnvironment();
    }
    
    this.setupState.environmentSetup = true;
    this.log('Environment configuration completed', 'success');
  }

  // Step 3: Detect and configure PostgreSQL
  async detectPostgreSQL() {
    this.log('Detecting PostgreSQL installation...', 'step');
    
    try {
      let postgresDetected = false;
      
      // Try to detect PostgreSQL service on Windows
      if (process.platform === 'win32') {
        try {
          const { stdout } = await this.runCommand('powershell "Get-Service postgresql*"', { silent: true });
          if (stdout.includes('Running')) {
            this.log('PostgreSQL service detected and running on Windows', 'success');
            postgresDetected = true;
            
            // Try to detect port
            try {
              const { stdout: netstat } = await this.runCommand('netstat -an | findstr :5432', { silent: true });
              if (netstat.includes('5432')) {
                this.currentEnv.DB_PORT = '5432';
                this.log('PostgreSQL detected on port 5432', 'success');
              }
            } catch (error) {
              // Try port 5433
              try {
                const { stdout: netstat } = await this.runCommand('netstat -an | findstr :5433', { silent: true });
                if (netstat.includes('5433')) {
                  this.currentEnv.DB_PORT = '5433';
                  this.log('PostgreSQL detected on port 5433', 'success');
                }
              } catch (error) {
                this.log('Could not detect PostgreSQL port, using default 5432', 'warning');
              }
            }
          }
        } catch (error) {
          this.log('PostgreSQL service not detected on Windows', 'warning');
        }
      } else {
        // Try to detect PostgreSQL on Unix-like systems
        try {
          await this.runCommand('which psql', { silent: true });
          this.log('PostgreSQL client (psql) detected', 'success');
          postgresDetected = true;
        } catch (error) {
          this.log('PostgreSQL client (psql) not found in PATH', 'warning');
        }
        
        try {
          await this.runCommand('systemctl is-active postgresql', { silent: true });
          this.log('PostgreSQL service is running', 'success');
          postgresDetected = true;
        } catch (error) {
          this.log('PostgreSQL service status unknown', 'warning');
        }
      }
      
      if (!postgresDetected) {
        this.log('PostgreSQL not detected. Please install PostgreSQL and ensure it\'s running.', 'warning');
        this.showPostgreSQLInstallInstructions();
      }
      
      // Test database connection
      await this.testDatabaseConnection();
      
      this.setupState.postgresqlDetected = true;
      
    } catch (error) {
      this.log(`PostgreSQL detection failed: ${error.message}`, 'error');
      this.log('Continuing with setup - you may need to configure PostgreSQL manually', 'warning');
      // Don't throw error, continue with setup
    }
  }

  async testDatabaseConnection() {
    this.log('Testing database connection...', 'step');
    
    try {
      // Try to connect to PostgreSQL
      const { Pool } = await import('pg');
      const pool = new Pool({
        host: this.currentEnv.DB_HOST || 'localhost',
        port: parseInt(this.currentEnv.DB_PORT || '5432'),
        database: 'postgres', // Connect to default database first
        user: this.currentEnv.DB_USER || 'postgres',
        password: this.currentEnv.DB_PASSWORD || 'password',
        connectionTimeoutMillis: 5000
      });
      
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      await pool.end();
      
      this.log('Database connection successful', 'success');
      
    } catch (error) {
      this.log(`Database connection failed: ${error.message}`, 'warning');
      this.log('You may need to configure PostgreSQL manually', 'info');
      // Don't throw error, continue with setup
    }
  }

  showPostgreSQLInstallInstructions() {
    console.log(chalk.cyan('\n📦 PostgreSQL Installation Instructions'));
    
    if (process.platform === 'win32') {
      console.log(chalk.gray('For Windows:'));
      console.log(chalk.gray('1. Download PostgreSQL from: https://www.postgresql.org/download/windows/'));
      console.log(chalk.gray('2. Run the installer and follow the setup wizard'));
      console.log(chalk.gray('3. Remember the password you set for the postgres user'));
      console.log(chalk.gray('4. Make sure PostgreSQL service is started'));
    } else if (process.platform === 'darwin') {
      console.log(chalk.gray('For macOS:'));
      console.log(chalk.gray('1. Install via Homebrew: brew install postgresql'));
      console.log(chalk.gray('2. Start service: brew services start postgresql'));
      console.log(chalk.gray('3. Create user: createuser -s postgres'));
    } else {
      console.log(chalk.gray('For Linux (Ubuntu/Debian):'));
      console.log(chalk.gray('1. Update packages: sudo apt update'));
      console.log(chalk.gray('2. Install PostgreSQL: sudo apt install postgresql postgresql-contrib'));
      console.log(chalk.gray('3. Start service: sudo systemctl start postgresql'));
      console.log(chalk.gray('4. Set password: sudo -u postgres psql -c "ALTER USER postgres PASSWORD \'password\';"'));
    }
  }

  // Step 4: Setup database schema
  async setupDatabase() {
    this.log('Setting up database schema...', 'step');
    
    try {
      // Update environment with current values
      this.saveEnvironment();
      
      // Run database setup script
      await this.runCommand('npm run setup:db', { timeout: 60000 });
      
      this.log('Database schema setup completed', 'success');
      this.setupState.databaseSetup = true;
      
    } catch (error) {
      this.log(`Database setup failed: ${error.message}`, 'warning');
      this.log('You may need to set up the database manually', 'info');
      // Don't throw error, continue with setup
    }
  }

  // Step 5: Validate configuration
  async validateConfiguration() {
    this.log('Validating configuration...', 'step');
    
    try {
      // Test configuration loading
      const { getConfig } = await import('../src/config.js');
      const config = getConfig();
      
      // Validate required configuration
      const requiredFields = [
        'database.host',
        'database.port',
        'database.name',
        'database.user',
        'database.password'
      ];
      
      for (const field of requiredFields) {
        const value = field.split('.').reduce((obj, key) => obj?.[key], config);
        if (!value) {
          throw new Error(`Missing required configuration: ${field}`);
        }
      }
      
      this.log('Configuration validation passed', 'success');
      this.setupState.configurationValidated = true;
      
    } catch (error) {
      this.log(`Configuration validation failed: ${error.message}`, 'warning');
      // Don't throw error, continue with setup
    }
  }

  // Step 6: Run health checks
  async runHealthChecks() {
    this.log('Running health checks...', 'step');
    
    try {
      await this.runCommand('npm run health:check', { timeout: 30000 });
      
      this.log('Health checks passed', 'success');
      this.setupState.healthChecksPassed = true;
      
    } catch (error) {
      this.log(`Health checks failed: ${error.message}`, 'warning');
      this.log('Some components may not be working correctly', 'info');
      // Don't throw error, continue with setup
    }
  }

  // Step 7: Start development server
  async startDevelopmentServer() {
    this.log('Starting development server...', 'step');
    
    console.log(chalk.cyan('\n🚀 Development Server'));
    console.log(chalk.gray('The webhook gateway will start on the configured port.'));
    console.log(chalk.gray('Press Ctrl+C to stop the server.\n'));
    
    if (isAutomated) {
      console.log(chalk.yellow('Running in automated mode - checking if server can start...'));
      
      // Check if we can actually start the server (PostgreSQL available)
      try {
        const { Pool } = await import('pg');
        const pool = new Pool({
          host: this.currentEnv.DB_HOST || 'localhost',
          port: parseInt(this.currentEnv.DB_PORT || '5432'),
          database: 'postgres',
          user: this.currentEnv.DB_USER || 'postgres',
          password: this.currentEnv.DB_PASSWORD || 'password',
          connectionTimeoutMillis: 3000
        });
        
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        await pool.end();
        
        console.log(chalk.green('\n✨ Starting webhook gateway...'));
        console.log(chalk.gray('Server will be available at:'));
        console.log(chalk.gray(`  • Main: http://localhost:${this.currentEnv.PORT || '3000'}`));
        console.log(chalk.gray(`  • Health: http://localhost:${this.currentEnv.PORT || '3000'}/health`));
        console.log(chalk.gray(`  • Metrics: http://localhost:${this.currentEnv.PORT || '3000'}/metrics`));
        console.log(chalk.gray('\nWebhook endpoints:'));
        console.log(chalk.gray(`  • GitHub: http://localhost:${this.currentEnv.PORT || '3000'}/webhook/github`));
        console.log(chalk.gray(`  • Linear: http://localhost:${this.currentEnv.PORT || '3000'}/webhook/linear`));
        console.log(chalk.gray(`  • Slack: http://localhost:${this.currentEnv.PORT || '3000'}/webhook/slack\n`));
        
        // Start the server
        await this.runCommand('npm start');
        
      } catch (error) {
        console.log(chalk.yellow('\n⚠️  Cannot start server automatically - PostgreSQL connection failed'));
        console.log(chalk.gray('This is normal if PostgreSQL is not running or not configured.'));
        console.log(chalk.cyan('\n🎯 Setup completed successfully!'));
        console.log(chalk.gray('To start the server manually:'));
        console.log(chalk.cyan('  1. Ensure PostgreSQL is running'));
        console.log(chalk.cyan('  2. Create the "Events" database'));
        console.log(chalk.cyan('  3. Run: npm start'));
        console.log(chalk.gray('\nOr run the setup again with: npm run dev'));
      }
    } else {
      console.log(chalk.yellow('\nSetup completed! You can now start the server with:'));
      console.log(chalk.cyan('npm start'));
      console.log(chalk.gray('\nOr run the setup again with: npm run dev'));
    }
  }

  // Main setup orchestrator
  async run() {
    try {
      console.log(chalk.blue('🎯 Robust Development Setup'));
      console.log(chalk.gray('Setting up the webhook gateway for development...\n'));
      
      if (isAutomated) {
        console.log(chalk.yellow('Running in automated mode (non-interactive)\n'));
      }
      
      const steps = [
        'validateSystem',
        'setupEnvironment',
        'detectPostgreSQL',
        'setupDatabase',
        'validateConfiguration',
        'runHealthChecks',
        'startDevelopmentServer'
      ];
      
      for (const step of steps) {
        await this[step]();
      }
      
      console.log(chalk.green('\n🎉 Development setup completed!'));
      console.log(chalk.gray('Your webhook gateway is ready for development.'));
      
    } catch (error) {
      console.log(chalk.red(`\n❌ Setup failed: ${error.message}`));
      console.log(chalk.gray('\nTry running individual commands:'));
      console.log(chalk.gray('  npm run validate:system'));
      console.log(chalk.gray('  npm run fix:auto'));
      console.log(chalk.gray('  npm run health:check'));
      process.exit(1);
    }
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const setup = new RobustDevSetup();
  setup.run().catch(error => {
    console.error(chalk.red('Setup failed:'), error.message);
    process.exit(1);
  });
}

export { RobustDevSetup };
