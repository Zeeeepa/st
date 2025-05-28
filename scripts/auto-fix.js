// scripts/auto-fix.js - Automatic Issue Resolution
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AutoFix {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.fixes = {
      missingDependencies: {
        name: 'Install Missing Dependencies',
        description: 'Install npm dependencies if node_modules is missing',
        autoFix: true,
        action: this.fixMissingDependencies.bind(this)
      },
      
      missingEnvFile: {
        name: 'Create Environment File',
        description: 'Create .env file with default configuration',
        autoFix: true,
        action: this.fixMissingEnvFile.bind(this)
      },
      
      wrongDatabasePort: {
        name: 'Fix Database Port Configuration',
        description: 'Update database port in .env to match detected PostgreSQL',
        autoFix: true,
        action: this.fixDatabasePort.bind(this)
      },
      
      missingDatabase: {
        name: 'Create Database',
        description: 'Create the Events database in PostgreSQL',
        autoFix: false,
        action: this.fixMissingDatabase.bind(this)
      },
      
      postgresqlNotRunning: {
        name: 'Start PostgreSQL Service',
        description: 'Start the PostgreSQL service',
        autoFix: false,
        action: this.fixPostgreSQLService.bind(this)
      },
      
      invalidPermissions: {
        name: 'Fix File Permissions',
        description: 'Fix file permissions for scripts',
        autoFix: true,
        action: this.fixPermissions.bind(this)
      }
    };
  }

  async question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
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
      case 'fix':
        console.log(chalk.cyan(`${prefix} 🔧 ${message}`));
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }

  // Fix: Install missing dependencies
  async fixMissingDependencies() {
    try {
      this.log('Installing npm dependencies...', 'fix');
      await this.runCommand('npm install');
      this.log('Dependencies installed successfully', 'success');
      return true;
    } catch (error) {
      this.log(`Failed to install dependencies: ${error.message}`, 'error');
      return false;
    }
  }

  // Fix: Create missing .env file
  async fixMissingEnvFile() {
    try {
      this.log('Creating .env file with default configuration...', 'fix');
      
      const envContent = `# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Events
DB_USER=postgres
DB_PASSWORD=password
DB_SSL=false
DB_MAX_CONNECTIONS=20
DB_CONNECTION_TIMEOUT=5000
DB_IDLE_TIMEOUT=30000

# Server Configuration
PORT=3000
HOST=localhost
NODE_ENV=development
SERVER_ID=webhook-gateway-local

# GitHub Configuration
GITHUB_TOKEN=your_github_token_here
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret_here

# Linear Configuration
LINEAR_API_KEY=your_linear_api_key_here
LINEAR_WEBHOOK_SECRET=your_linear_webhook_secret_here

# Slack Configuration
SLACK_BOT_TOKEN=your_slack_bot_token_here
SLACK_SIGNING_SECRET=your_slack_signing_secret_here
SLACK_APP_ID=your_slack_app_id_here

# Feature Flags
DEBUG=true
ENABLE_BATCHING=true
ENABLE_METRICS=true
ENABLE_RETRY=true
ENABLE_ARCHIVING=true
ENABLE_RATE_LIMIT=true

# Performance Settings
BATCH_SIZE=50
BATCH_INTERVAL=5000
MAX_RETRIES=3
RETRY_DELAY=500

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100

# Data Retention
DATA_RETENTION_DAYS=90

# Security Settings
ENABLE_CORS=true
ENABLE_HELMET=true
ENABLE_COMPRESSION=true

# Monitoring Settings
ENABLE_HEALTH_CHECK=true
ENABLE_METRICS_ENDPOINT=true
HEALTH_CHECK_INTERVAL=30000

# Legacy Worker Identification (for compatibility)
WORKER_ID=webhook-gateway-local
WORKER_ENVIRONMENT=development`;

      const envPath = path.join(__dirname, '..', '.env');
      fs.writeFileSync(envPath, envContent);
      
      this.log('.env file created successfully', 'success');
      return true;
    } catch (error) {
      this.log(`Failed to create .env file: ${error.message}`, 'error');
      return false;
    }
  }

  // Fix: Update database port configuration
  async fixDatabasePort() {
    try {
      this.log('Detecting PostgreSQL port...', 'fix');
      
      let detectedPort = null;
      
      // Try to detect PostgreSQL port
      if (process.platform === 'win32') {
        try {
          const { stdout } = await this.runCommand('netstat -an | findstr :5432', { silent: true });
          if (stdout.includes('5432')) {
            detectedPort = 5432;
          }
        } catch (error) {
          try {
            const { stdout } = await this.runCommand('netstat -an | findstr :5433', { silent: true });
            if (stdout.includes('5433')) {
              detectedPort = 5433;
            }
          } catch (error) {
            // Port detection failed
          }
        }
      } else {
        // Unix-like systems
        try {
          const { stdout } = await this.runCommand('netstat -an | grep :5432', { silent: true });
          if (stdout.includes('5432')) {
            detectedPort = 5432;
          }
        } catch (error) {
          // Port detection failed
        }
      }
      
      if (detectedPort) {
        this.log(`PostgreSQL detected on port ${detectedPort}`, 'info');
        
        // Update .env file
        const envPath = path.join(__dirname, '..', '.env');
        if (fs.existsSync(envPath)) {
          let envContent = fs.readFileSync(envPath, 'utf8');
          // Replace any existing DB_PORT setting
          if (envContent.includes('DB_PORT=')) {
            envContent = envContent.replace(/DB_PORT=\d+/, `DB_PORT=${detectedPort}`);
          } else {
            // Add DB_PORT if it doesn't exist
            envContent += `\nDB_PORT=${detectedPort}`;
          }
          fs.writeFileSync(envPath, envContent);
          
          this.log(`Updated DB_PORT to ${detectedPort} in .env file`, 'success');
          return true;
        } else {
          this.log('.env file not found', 'error');
          return false;
        }
      } else {
        this.log('Could not detect PostgreSQL port', 'warning');
        return false;
      }
    } catch (error) {
      this.log(`Failed to fix database port: ${error.message}`, 'error');
      return false;
    }
  }

  // Fix: Create missing database
  async fixMissingDatabase() {
    try {
      this.log('Attempting to create Events database...', 'fix');
      
      // Load environment configuration
      const envPath = path.join(__dirname, '..', '.env');
      const envVars = {};
      
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
          const [key, value] = line.split('=');
          if (key && value && !line.startsWith('#')) {
            envVars[key.trim()] = value.trim();
          }
        });
      }
      
      const dbConfig = {
        host: envVars.DB_HOST || 'localhost',
        port: parseInt(envVars.DB_PORT || '5432'),
        user: envVars.DB_USER || 'postgres',
        password: envVars.DB_PASSWORD || 'password',
        database: envVars.DB_NAME || 'Events'
      };
      
      // Try to create database using psql command
      const createDbCommand = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -c "CREATE DATABASE \\"${dbConfig.database}\\""`;
      
      this.log('Note: You may be prompted for the PostgreSQL password', 'info');
      await this.runCommand(createDbCommand);
      
      this.log(`Database "${dbConfig.database}" created successfully`, 'success');
      return true;
    } catch (error) {
      if (error.message.includes('already exists')) {
        this.log('Database already exists', 'info');
        return true;
      } else {
        this.log(`Failed to create database: ${error.message}`, 'error');
        this.log('You may need to create the database manually', 'warning');
        return false;
      }
    }
  }

  // Fix: Start PostgreSQL service
  async fixPostgreSQLService() {
    try {
      this.log('Attempting to start PostgreSQL service...', 'fix');
      
      if (process.platform === 'win32') {
        // Windows
        await this.runCommand('net start postgresql*');
      } else {
        // Unix-like systems
        await this.runCommand('sudo systemctl start postgresql');
      }
      
      this.log('PostgreSQL service started successfully', 'success');
      return true;
    } catch (error) {
      this.log(`Failed to start PostgreSQL service: ${error.message}`, 'error');
      this.log('You may need to start the service manually or check installation', 'warning');
      return false;
    }
  }

  // Fix: File permissions
  async fixPermissions() {
    try {
      if (process.platform !== 'win32') {
        this.log('Fixing file permissions for scripts...', 'fix');
        
        const scriptsDir = path.join(__dirname);
        await this.runCommand(`chmod +x ${scriptsDir}/*.js`);
        
        this.log('File permissions fixed', 'success');
      } else {
        this.log('File permissions fix not needed on Windows', 'info');
      }
      return true;
    } catch (error) {
      this.log(`Failed to fix permissions: ${error.message}`, 'error');
      return false;
    }
  }

  // Detect common issues
  async detectIssues() {
    const issues = [];
    
    // Check for missing dependencies
    const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      issues.push('missingDependencies');
    }
    
    // Check for missing .env file
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) {
      issues.push('missingEnvFile');
    }
    
    // Check PostgreSQL port configuration
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const portMatch = envContent.match(/DB_PORT=(\d+)/);
      if (portMatch) {
        const configuredPort = parseInt(portMatch[1]);
        
        // Check if PostgreSQL is actually running on a different port
        try {
          if (process.platform === 'win32') {
            const { stdout } = await this.runCommand('netstat -an | findstr :5432', { silent: true });
            if (stdout.includes('5432') && configuredPort !== 5432) {
              issues.push('wrongDatabasePort');
            }
          } else {
            const { stdout } = await this.runCommand('netstat -an | grep :5432', { silent: true });
            if (stdout.includes('5432') && configuredPort !== 5432) {
              issues.push('wrongDatabasePort');
            }
          }
        } catch (error) {
          // Port check failed, but that's okay
        }
      }
    }
    
    return issues;
  }

  // Run automatic fixes
  async runAutoFixes() {
    this.log('Detecting common issues...', 'info');
    
    const issues = await this.detectIssues();
    
    if (issues.length === 0) {
      this.log('No common issues detected', 'success');
      return true;
    }
    
    this.log(`Found ${issues.length} issue(s) that can be automatically fixed`, 'info');
    
    let allFixed = true;
    
    for (const issue of issues) {
      const fix = this.fixes[issue];
      if (fix && fix.autoFix) {
        this.log(`Applying fix: ${fix.name}`, 'info');
        const success = await fix.action();
        if (!success) {
          allFixed = false;
        }
      }
    }
    
    return allFixed;
  }

  // Interactive fix selection
  async runInteractiveFixes() {
    this.log('Detecting all possible issues...', 'info');
    
    const issues = await this.detectIssues();
    
    if (issues.length === 0) {
      this.log('No issues detected', 'success');
      this.rl.close();
      return;
    }
    
    console.log(chalk.cyan('\n🔧 Available Fixes'));
    console.log('='.repeat(50));
    
    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      const fix = this.fixes[issue];
      if (fix) {
        console.log(`${i + 1}. ${fix.name}`);
        console.log(chalk.gray(`   ${fix.description}`));
        console.log(chalk.gray(`   Auto-fix: ${fix.autoFix ? 'Yes' : 'No'}`));
        console.log('');
      }
    }
    
    const choice = await this.question('Select fix to apply (number), "all" for all auto-fixes, or "q" to quit: ');
    
    if (choice.toLowerCase() === 'q') {
      this.rl.close();
      return;
    }
    
    if (choice.toLowerCase() === 'all') {
      for (const issue of issues) {
        const fix = this.fixes[issue];
        if (fix && fix.autoFix) {
          this.log(`Applying fix: ${fix.name}`, 'info');
          await fix.action();
        }
      }
    } else {
      const index = parseInt(choice) - 1;
      if (index >= 0 && index < issues.length) {
        const issue = issues[index];
        const fix = this.fixes[issue];
        if (fix) {
          this.log(`Applying fix: ${fix.name}`, 'info');
          await fix.action();
        }
      } else {
        this.log('Invalid selection', 'error');
      }
    }
    
    this.rl.close();
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const autoFix = new AutoFix();
  const mode = process.argv[2] || 'auto';
  
  if (mode === 'interactive') {
    autoFix.runInteractiveFixes().catch(error => {
      console.error(chalk.red('Auto-fix failed:'), error.message);
      process.exit(1);
    });
  } else {
    autoFix.runAutoFixes().then(success => {
      if (success) {
        console.log(chalk.green('\n✅ All automatic fixes applied successfully!'));
      } else {
        console.log(chalk.yellow('\n⚠️  Some fixes failed. Run with "interactive" mode for more options.'));
      }
    }).catch(error => {
      console.error(chalk.red('Auto-fix failed:'), error.message);
      process.exit(1);
    });
  }
}

export { AutoFix };
