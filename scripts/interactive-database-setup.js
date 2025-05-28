#!/usr/bin/env node
// scripts/interactive-database-setup.js - Interactive Database Configuration Setup

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🗄️ INTERACTIVE DATABASE SETUP');
console.log('==============================');
console.log('This wizard will help you configure your PostgreSQL database connection.');
console.log('');

class InteractiveDatabaseSetup {
  constructor() {
    this.envPath = path.join(__dirname, '..', '.env');
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.config = {};
  }

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
      
      let password = '';
      
      const onData = (char) => {
        switch (char) {
          case '\n':
          case '\r':
          case '\u0004': // Ctrl+D
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdin.removeListener('data', onData);
            console.log('');
            resolve(password);
            break;
          case '\u0003': // Ctrl+C
            process.exit();
            break;
          case '\u007f': // Backspace
            if (password.length > 0) {
              password = password.slice(0, -1);
              process.stdout.write('\b \b');
            }
            break;
          default:
            password += char;
            process.stdout.write('*');
            break;
        }
      };
      
      process.stdin.on('data', onData);
    });
  }

  generateSecurePassword(length = 32) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(crypto.randomInt(0, charset.length));
    }
    return password;
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

  async testDatabaseConnection(config) {
    console.log('\n🔍 Testing database connection...');
    
    try {
      const connectionString = `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`;
      
      // Test connection using psql
      const testCommand = `psql "${connectionString}" -c "SELECT version();"`;
      await this.runCommand(testCommand, { silent: true });
      
      console.log('✅ Database connection successful!');
      return true;
    } catch (error) {
      console.log('❌ Database connection failed:', error.message);
      return false;
    }
  }

  async createDatabaseAndUser(config) {
    console.log('\n🔧 Creating database and user...');
    
    try {
      const isWindows = process.platform === 'win32';
      const sudoPrefix = isWindows ? '' : 'sudo -u postgres ';
      
      // Create user
      const createUserCmd = `${sudoPrefix}psql -c "CREATE USER ${config.username} WITH PASSWORD '${config.password}';"`;
      await this.runCommand(createUserCmd, { silent: true });
      console.log(`✅ User '${config.username}' created successfully`);
      
      // Create database
      const createDbCmd = `${sudoPrefix}createdb -O ${config.username} ${config.database}`;
      await this.runCommand(createDbCmd, { silent: true });
      console.log(`✅ Database '${config.database}' created successfully`);
      
      // Grant privileges
      const grantCmd = `${sudoPrefix}psql -c "GRANT ALL PRIVILEGES ON DATABASE ${config.database} TO ${config.username};"`;
      await this.runCommand(grantCmd, { silent: true });
      console.log(`✅ Privileges granted to '${config.username}'`);
      
      return true;
    } catch (error) {
      console.log('⚠️ Database/user creation failed (may already exist):', error.message);
      return false;
    }
  }

  async loadExistingConfig() {
    try {
      if (fs.existsSync(this.envPath)) {
        const envContent = fs.readFileSync(this.envPath, 'utf8');
        const lines = envContent.split('\n');
        
        for (const line of lines) {
          const [key, value] = line.split('=');
          if (key && value) {
            switch (key.trim()) {
              case 'DB_HOST':
                this.config.host = value.trim();
                break;
              case 'DB_PORT':
                this.config.port = value.trim();
                break;
              case 'DB_NAME':
                this.config.database = value.trim();
                break;
              case 'DB_USER':
                this.config.username = value.trim();
                break;
              case 'DB_PASSWORD':
                this.config.password = value.trim();
                break;
            }
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Could not load existing configuration:', error.message);
    }
  }

  async promptForConfiguration() {
    console.log('📝 Please provide your PostgreSQL database configuration:');
    console.log('');

    // Database host
    const defaultHost = this.config.host || 'localhost';
    const host = await this.question(`Database host [${defaultHost}]: `);
    this.config.host = host.trim() || defaultHost;

    // Database port
    const defaultPort = this.config.port || '5432';
    const port = await this.question(`Database port [${defaultPort}]: `);
    this.config.port = port.trim() || defaultPort;

    // Database name
    const defaultDatabase = this.config.database || 'Events';
    const database = await this.question(`Database name [${defaultDatabase}]: `);
    this.config.database = database.trim() || defaultDatabase;

    // Username
    const defaultUsername = this.config.username || 'webhook_user';
    const username = await this.question(`Database username [${defaultUsername}]: `);
    this.config.username = username.trim() || defaultUsername;

    // Password options
    console.log('');
    console.log('Password options:');
    console.log('1. Enter password manually');
    console.log('2. Generate secure password automatically');
    console.log('3. Use existing password (if any)');
    
    const passwordOption = await this.question('Choose option [1-3]: ');
    
    switch (passwordOption.trim()) {
      case '1':
        this.config.password = await this.questionHidden('Enter database password: ');
        break;
      case '2':
        this.config.password = this.generateSecurePassword(24);
        console.log(`Generated secure password: ${this.config.password}`);
        console.log('⚠️ Please save this password securely!');
        break;
      case '3':
        if (!this.config.password) {
          console.log('No existing password found. Generating new one...');
          this.config.password = this.generateSecurePassword(24);
          console.log(`Generated secure password: ${this.config.password}`);
        } else {
          console.log('Using existing password from .env file');
        }
        break;
      default:
        console.log('Invalid option. Generating secure password...');
        this.config.password = this.generateSecurePassword(24);
        console.log(`Generated secure password: ${this.config.password}`);
        break;
    }

    console.log('');
    console.log('📋 Configuration Summary:');
    console.log(`Host: ${this.config.host}`);
    console.log(`Port: ${this.config.port}`);
    console.log(`Database: ${this.config.database}`);
    console.log(`Username: ${this.config.username}`);
    console.log(`Password: ${'*'.repeat(this.config.password.length)}`);
    console.log('');
  }

  async updateEnvironmentFile() {
    console.log('💾 Updating .env file...');
    
    let envContent = '';
    
    if (fs.existsSync(this.envPath)) {
      envContent = fs.readFileSync(this.envPath, 'utf8');
    }

    // Update or add database configuration
    const dbConfig = {
      'DB_HOST': this.config.host,
      'DB_PORT': this.config.port,
      'DB_NAME': this.config.database,
      'DB_USER': this.config.username,
      'DB_PASSWORD': this.config.password,
      'DB_SSL': 'false'
    };

    // Parse existing env file
    const envLines = envContent.split('\n');
    const updatedLines = [];
    const processedKeys = new Set();

    for (const line of envLines) {
      const [key] = line.split('=');
      const trimmedKey = key?.trim();
      
      if (dbConfig.hasOwnProperty(trimmedKey)) {
        updatedLines.push(`${trimmedKey}=${dbConfig[trimmedKey]}`);
        processedKeys.add(trimmedKey);
      } else {
        updatedLines.push(line);
      }
    }

    // Add any missing database configuration
    for (const [key, value] of Object.entries(dbConfig)) {
      if (!processedKeys.has(key)) {
        updatedLines.push(`${key}=${value}`);
      }
    }

    // If no .env file existed, create a complete one
    if (!fs.existsSync(this.envPath)) {
      const completeEnvContent = `# Webhook Gateway Configuration
# Generated by Interactive Database Setup

# PostgreSQL Database Configuration
DB_HOST=${this.config.host}
DB_PORT=${this.config.port}
DB_NAME=${this.config.database}
DB_USER=${this.config.username}
DB_PASSWORD=${this.config.password}
DB_SSL=false

# Server Configuration
PORT=3000
HOST=localhost
NODE_ENV=development

# GitHub Configuration
GITHUB_TOKEN=
GITHUB_WEBHOOK_SECRET=

# Linear Configuration
LINEAR_API_KEY=
LINEAR_WEBHOOK_SECRET=

# Slack Configuration
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=

# Development Configuration
DEBUG=true
ENABLE_BATCHING=true
ENABLE_METRICS=true
ENABLE_RATE_LIMITING=true

# Security Configuration
JWT_SECRET=${crypto.randomBytes(64).toString('hex')}
WEBHOOK_SECRET=${crypto.randomBytes(32).toString('hex')}
`;
      fs.writeFileSync(this.envPath, completeEnvContent);
    } else {
      fs.writeFileSync(this.envPath, updatedLines.join('\n'));
    }

    // Set secure file permissions (Unix-like systems)
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(this.envPath, 0o600); // Read/write for owner only
        console.log('✅ Secure file permissions set on .env');
      } catch (error) {
        console.log('⚠️ Could not set secure permissions:', error.message);
      }
    }

    console.log('✅ Environment file updated successfully');
  }

  async run() {
    try {
      // Load existing configuration
      await this.loadExistingConfig();

      // Prompt for configuration
      await this.promptForConfiguration();

      // Ask if user wants to create database/user
      const createDb = await this.question('\nDo you want to create the database and user? [y/N]: ');
      
      if (createDb.toLowerCase() === 'y' || createDb.toLowerCase() === 'yes') {
        await this.createDatabaseAndUser(this.config);
      }

      // Test connection
      const testConnection = await this.question('Do you want to test the database connection? [Y/n]: ');
      
      if (testConnection.toLowerCase() !== 'n' && testConnection.toLowerCase() !== 'no') {
        const connectionSuccess = await this.testDatabaseConnection(this.config);
        
        if (!connectionSuccess) {
          const proceed = await this.question('Connection failed. Do you want to save the configuration anyway? [y/N]: ');
          if (proceed.toLowerCase() !== 'y' && proceed.toLowerCase() !== 'yes') {
            console.log('❌ Setup cancelled');
            this.rl.close();
            return;
          }
        }
      }

      // Update .env file
      await this.updateEnvironmentFile();

      console.log('');
      console.log('🎉 Database setup completed successfully!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Run `npm run dev` to start the application');
      console.log('2. The application will automatically initialize the database schema');
      console.log('3. Check the logs for any connection issues');
      console.log('');

    } catch (error) {
      console.error('❌ Setup failed:', error.message);
    } finally {
      this.rl.close();
    }
  }
}

// Run the interactive setup
const setup = new InteractiveDatabaseSetup();
setup.run().catch(console.error);

