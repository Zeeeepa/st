// scripts/interactive-dev-setup.js - Interactive Development Setup
import fs from 'fs';
import path from 'path';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

// Configuration for interactive setup
const SETUP_CONFIG = {
  requiredEnvVars: [
    {
      key: 'DB_HOST',
      description: 'PostgreSQL database host',
      default: 'localhost',
      required: true,
      type: 'string'
    },
    {
      key: 'DB_PORT',
      description: 'PostgreSQL database port',
      default: '5432',
      required: true,
      type: 'number',
      validate: (value) => {
        const port = parseInt(value);
        return port > 0 && port < 65536 ? null : 'Port must be between 1 and 65535';
      }
    },
    {
      key: 'DB_NAME',
      description: 'PostgreSQL database name',
      default: 'Events',
      required: true,
      type: 'string'
    },
    {
      key: 'DB_USER',
      description: 'PostgreSQL database user',
      default: 'postgres',
      required: true,
      type: 'string'
    },
    {
      key: 'DB_PASSWORD',
      description: 'PostgreSQL database password',
      default: 'password',
      required: true,
      type: 'password'
    },
    {
      key: 'GITHUB_TOKEN',
      description: 'GitHub Personal Access Token (for API access)',
      default: '',
      required: false,
      type: 'password',
      help: 'Get from: https://github.com/settings/tokens'
    },
    {
      key: 'GITHUB_WEBHOOK_SECRET',
      description: 'GitHub Webhook Secret (for signature validation)',
      default: '',
      required: false,
      type: 'password',
      help: 'Set in GitHub webhook configuration'
    },
    {
      key: 'LINEAR_API_KEY',
      description: 'Linear API Key (for API access)',
      default: '',
      required: false,
      type: 'password',
      help: 'Get from: Linear Settings → API → Personal API Keys'
    },
    {
      key: 'LINEAR_WEBHOOK_SECRET',
      description: 'Linear Webhook Secret (for signature validation)',
      default: '',
      required: false,
      type: 'password',
      help: 'Set in Linear webhook configuration'
    },
    {
      key: 'SLACK_BOT_TOKEN',
      description: 'Slack Bot Token (for API access)',
      default: '',
      required: false,
      type: 'password',
      help: 'Get from: Slack App → OAuth & Permissions → Bot User OAuth Token'
    },
    {
      key: 'SLACK_SIGNING_SECRET',
      description: 'Slack Signing Secret (for signature validation)',
      default: '',
      required: false,
      type: 'password',
      help: 'Get from: Slack App → Basic Information → Signing Secret'
    },
    {
      key: 'PORT',
      description: 'Server port',
      default: '3000',
      required: true,
      type: 'number',
      validate: (value) => {
        const port = parseInt(value);
        return port > 0 && port < 65536 ? null : 'Port must be between 1 and 65535';
      }
    }
  ],
  
  setupSteps: [
    'validateSystem',
    'setupEnvironment',
    'detectPostgreSQL',
    'setupDatabase',
    'validateConfiguration',
    'runHealthChecks',
    'startDevelopmentServer'
  ]
};

class InteractiveDevSetup {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
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

  // Utility methods
  async question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }

  async questionHidden(prompt) {
    return new Promise((resolve) => {
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
    });
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
      
      this.log('Project structure validated ✓', 'success');
      this.setupState.systemValidated = true;
      
    } catch (error) {
      this.log(`System validation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  // Step 2: Setup environment variables interactively
  async setupEnvironment() {
    this.log('Setting up environment configuration...', 'step');
    
    console.log(chalk.cyan('\n🔧 Environment Configuration Setup'));
    console.log(chalk.gray('Please provide the following configuration values:'));
    console.log(chalk.gray('Press Enter to use default values shown in [brackets]\n'));
    
    this.loadEnvironment();
    
    for (const envVar of SETUP_CONFIG.requiredEnvVars) {
      const currentValue = this.currentEnv[envVar.key];
      const hasValue = currentValue && 
                      currentValue !== '' && 
                      !currentValue.includes('your_') && 
                      !currentValue.includes('_here');
      
      if (hasValue && !envVar.required) {
        console.log(chalk.green(`✓ ${envVar.key}: Already configured`));
        continue;
      }
      
      let prompt = `${envVar.description}`;
      if (envVar.default) {
        prompt += ` [${envVar.default}]`;
      }
      if (envVar.help) {
        console.log(chalk.gray(`  💡 ${envVar.help}`));
      }
      prompt += ': ';
      
      let value;
      if (envVar.type === 'password') {
        value = await this.questionHidden(prompt);
      } else {
        value = await this.question(prompt);
      }
      
      // Use default if no value provided
      if (!value && envVar.default) {
        value = envVar.default;
      }
      
      // Validate if validator provided
      if (value && envVar.validate) {
        const validationError = envVar.validate(value);
        if (validationError) {
          this.log(`Validation error: ${validationError}`, 'error');
          // Ask again
          continue;
        }
      }
      
      // Check if required
      if (envVar.required && !value) {
        this.log(`${envVar.key} is required`, 'error');
        // Ask again
        continue;
      }
      
      if (value) {
        this.currentEnv[envVar.key] = value;
      }
      
      console.log(''); // Add spacing
    }
    
    this.saveEnvironment();
    this.setupState.environmentSetup = true;
    this.log('Environment configuration completed', 'success');
  }

  // Step 3: Detect and configure PostgreSQL
  async detectPostgreSQL() {
    this.log('Detecting PostgreSQL installation...', 'step');
    
    try {
      // Try to detect PostgreSQL service on Windows
      if (process.platform === 'win32') {
        try {
          const { stdout } = await this.runCommand('powershell "Get-Service postgresql*"', { silent: true });
          if (stdout.includes('Running')) {
            this.log('PostgreSQL service detected and running on Windows', 'success');
            
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
        } catch (error) {
          this.log('PostgreSQL client (psql) not found in PATH', 'warning');
        }
        
        try {
          await this.runCommand('systemctl is-active postgresql', { silent: true });
          this.log('PostgreSQL service is running', 'success');
        } catch (error) {
          this.log('PostgreSQL service status unknown', 'warning');
        }
      }
      
      // Test database connection
      await this.testDatabaseConnection();
      
      this.setupState.postgresqlDetected = true;
      
    } catch (error) {
      this.log(`PostgreSQL detection failed: ${error.message}`, 'error');
      
      // Offer to install PostgreSQL
      const install = await this.question(chalk.yellow('PostgreSQL not detected. Would you like installation instructions? (y/n): '));
      if (install.toLowerCase() === 'y' || install.toLowerCase() === 'yes') {
        this.showPostgreSQLInstallInstructions();
      }
      
      throw error;
    }
  }

  async testDatabaseConnection() {
    this.log('Testing database connection...', 'step');
    
    try {
      // Import and test the database connection
      const { getConfig } = await import('../src/config.js');
      const config = getConfig();
      
      // Update config with current environment
      config.database.host = this.currentEnv.DB_HOST || 'localhost';
      config.database.port = parseInt(this.currentEnv.DB_PORT || '5432');
      config.database.name = this.currentEnv.DB_NAME || 'Events';
      config.database.user = this.currentEnv.DB_USER || 'postgres';
      config.database.password = this.currentEnv.DB_PASSWORD || 'password';
      
      // Try to connect
      const { Pool } = await import('pg');
      const pool = new Pool({
        host: config.database.host,
        port: config.database.port,
        database: 'postgres', // Connect to default database first
        user: config.database.user,
        password: config.database.password,
        ssl: config.database.ssl
      });
      
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      await pool.end();
      
      this.log('Database connection successful', 'success');
      
    } catch (error) {
      this.log(`Database connection failed: ${error.message}`, 'error');
      
      // Offer to help with connection issues
      const help = await this.question(chalk.yellow('Would you like help troubleshooting the database connection? (y/n): '));
      if (help.toLowerCase() === 'y' || help.toLowerCase() === 'yes') {
        await this.troubleshootDatabaseConnection();
      }
      
      throw error;
    }
  }

  async troubleshootDatabaseConnection() {
    console.log(chalk.cyan('\n🔧 Database Connection Troubleshooting'));
    console.log(chalk.gray('Let\'s try to fix the database connection issues:\n'));
    
    // Check if database exists
    const createDb = await this.question('Would you like me to try creating the database? (y/n): ');
    if (createDb.toLowerCase() === 'y' || createDb.toLowerCase() === 'yes') {
      await this.createDatabase();
    }
    
    // Check password
    const resetPassword = await this.question('Would you like to reset the postgres user password? (y/n): ');
    if (resetPassword.toLowerCase() === 'y' || resetPassword.toLowerCase() === 'yes') {
      await this.resetPostgresPassword();
    }
  }

  async createDatabase() {
    try {
      this.log('Attempting to create database...', 'step');
      
      const { Pool } = await import('pg');
      const pool = new Pool({
        host: this.currentEnv.DB_HOST || 'localhost',
        port: parseInt(this.currentEnv.DB_PORT || '5432'),
        database: 'postgres',
        user: this.currentEnv.DB_USER || 'postgres',
        password: this.currentEnv.DB_PASSWORD || 'password'
      });
      
      const client = await pool.connect();
      await client.query(`CREATE DATABASE "${this.currentEnv.DB_NAME || 'Events'}"`);
      client.release();
      await pool.end();
      
      this.log(`Database "${this.currentEnv.DB_NAME || 'Events'}" created successfully`, 'success');
      
    } catch (error) {
      if (error.message.includes('already exists')) {
        this.log('Database already exists', 'info');
      } else {
        this.log(`Failed to create database: ${error.message}`, 'error');
      }
    }
  }

  async resetPostgresPassword() {
    console.log(chalk.cyan('\n🔑 PostgreSQL Password Reset Instructions'));
    
    if (process.platform === 'win32') {
      console.log(chalk.gray('For Windows:'));
      console.log(chalk.gray('1. Open Command Prompt as Administrator'));
      console.log(chalk.gray('2. Run: psql -U postgres'));
      console.log(chalk.gray('3. If prompted for password, try: password, admin, or leave blank'));
      console.log(chalk.gray('4. Once connected, run: ALTER USER postgres PASSWORD \'password\';'));
    } else {
      console.log(chalk.gray('For Linux/macOS:'));
      console.log(chalk.gray('1. Run: sudo -u postgres psql'));
      console.log(chalk.gray('2. Run: ALTER USER postgres PASSWORD \'password\';'));
      console.log(chalk.gray('3. Run: \\q to exit'));
    }
    
    await this.question('\nPress Enter when you\'ve completed the password reset...');
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
      await this.runCommand('npm run setup:db');
      
      this.log('Database schema setup completed', 'success');
      this.setupState.databaseSetup = true;
      
    } catch (error) {
      this.log(`Database setup failed: ${error.message}`, 'error');
      throw error;
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
      this.log(`Configuration validation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  // Step 6: Run health checks
  async runHealthChecks() {
    this.log('Running health checks...', 'step');
    
    try {
      await this.runCommand('npm run health:check');
      
      this.log('Health checks passed', 'success');
      this.setupState.healthChecksPassed = true;
      
    } catch (error) {
      this.log(`Health checks failed: ${error.message}`, 'error');
      throw error;
    }
  }

  // Step 7: Start development server
  async startDevelopmentServer() {
    this.log('Starting development server...', 'step');
    
    console.log(chalk.cyan('\n🚀 Development Server'));
    console.log(chalk.gray('The webhook gateway will start on the configured port.'));
    console.log(chalk.gray('Press Ctrl+C to stop the server.\n'));
    
    const startServer = await this.question('Start the development server now? (y/n): ');
    if (startServer.toLowerCase() === 'y' || startServer.toLowerCase() === 'yes') {
      
      console.log(chalk.green('\n✨ Starting webhook gateway...'));
      console.log(chalk.gray('Server will be available at:'));
      console.log(chalk.gray(`  • Main: http://localhost:${this.currentEnv.PORT || '3000'}`));
      console.log(chalk.gray(`  • Health: http://localhost:${this.currentEnv.PORT || '3000'}/health`));
      console.log(chalk.gray(`  • Metrics: http://localhost:${this.currentEnv.PORT || '3000'}/metrics`));
      console.log(chalk.gray('\nWebhook endpoints:'));
      console.log(chalk.gray(`  • GitHub: http://localhost:${this.currentEnv.PORT || '3000'}/webhook/github`));
      console.log(chalk.gray(`  • Linear: http://localhost:${this.currentEnv.PORT || '3000'}/webhook/linear`));
      console.log(chalk.gray(`  • Slack: http://localhost:${this.currentEnv.PORT || '3000'}/webhook/slack\n`));
      
      // Close readline interface before starting server
      this.rl.close();
      
      // Start the server
      await this.runCommand('npm start');
    } else {
      console.log(chalk.yellow('\nDevelopment server not started.'));
      console.log(chalk.gray('You can start it later with: npm start'));
      this.rl.close();
    }
  }

  // Main setup orchestrator
  async run() {
    try {
      console.log(chalk.blue('🎯 Interactive Development Setup'));
      console.log(chalk.gray('This will guide you through setting up the webhook gateway for development.\n'));
      
      for (const step of SETUP_CONFIG.setupSteps) {
        await this[step]();
      }
      
      console.log(chalk.green('\n🎉 Development setup completed successfully!'));
      console.log(chalk.gray('Your webhook gateway is ready for development.'));
      
    } catch (error) {
      console.log(chalk.red(`\n❌ Setup failed: ${error.message}`));
      console.log(chalk.gray('\nPlease resolve the issue and run the setup again.'));
      process.exit(1);
    }
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const setup = new InteractiveDevSetup();
  setup.run().catch(error => {
    console.error(chalk.red('Setup failed:'), error.message);
    process.exit(1);
  });
}

export { InteractiveDevSetup };

