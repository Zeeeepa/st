#!/usr/bin/env node
// scripts/fresh-postgres-setup.js - Fresh PostgreSQL Setup with New Database and User

import fs from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FreshPostgresSetup {
  constructor() {
    this.envPath = path.join(__dirname, '..', '.env');
    this.dbName = 'webhook_events_db';
    this.dbUser = 'webhook_app_user';
    this.dbPassword = this.generateSecurePassword();
  }

  generateSecurePassword(length = 24) {
    // Use only alphanumeric characters to avoid URL encoding issues
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  async runCommand(command) {
    return new Promise((resolve, reject) => {
      console.log(`🔄 Running: ${command}`);
      const child = spawn('bash', ['-c', command], { 
        stdio: ['inherit', 'pipe', 'pipe'],
        env: { ...process.env, PGPASSWORD: this.dbPassword }
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data);
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data);
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
        }
      });
    });
  }

  async checkPostgresInstallation() {
    console.log('🔍 Checking PostgreSQL installation...');
    
    // Try different common PostgreSQL installation paths
    const possiblePaths = [
      '/usr/bin/psql',
      '/usr/local/bin/psql',
      '/opt/postgresql/bin/psql',
      '/usr/lib/postgresql/*/bin/psql'
    ];
    
    for (const psqlPath of possiblePaths) {
      try {
        if (psqlPath.includes('*')) {
          // Handle wildcard paths
          const result = await this.runCommand(`ls ${psqlPath} 2>/dev/null | head -1`);
          if (result.trim()) {
            console.log(`✅ Found PostgreSQL at: ${result.trim()}`);
            return result.trim();
          }
        } else {
          await this.runCommand(`test -f ${psqlPath}`);
          console.log(`✅ Found PostgreSQL at: ${psqlPath}`);
          return psqlPath;
        }
      } catch (error) {
        // Continue checking other paths
      }
    }
    
    // Try to find psql in PATH
    try {
      const result = await this.runCommand('which psql');
      if (result.trim()) {
        console.log(`✅ Found PostgreSQL in PATH: ${result.trim()}`);
        return 'psql';
      }
    } catch (error) {
      // Continue
    }
    
    throw new Error('PostgreSQL not found. Please install PostgreSQL first.');
  }

  async setupDatabase() {
    console.log('🐘 Setting up fresh PostgreSQL database...');
    
    try {
      // First, try to connect as postgres user to create our database and user
      console.log('🔄 Creating database and user...');
      
      // Try different authentication methods
      const authMethods = [
        // Method 1: Direct connection as postgres
        () => this.runCommand(`psql -U postgres -c "SELECT version();"`),
        // Method 2: Using sudo
        () => this.runCommand(`sudo -u postgres psql -c "SELECT version();"`),
        // Method 3: Local socket connection
        () => this.runCommand(`psql postgres -c "SELECT version();"`),
        // Method 4: Using peer authentication
        () => this.runCommand(`sudo -u postgres psql postgres -c "SELECT version();"`),
      ];
      
      let workingMethod = null;
      let useMethod = '';
      
      for (let i = 0; i < authMethods.length; i++) {
        try {
          await authMethods[i]();
          workingMethod = i;
          console.log(`✅ PostgreSQL connection method ${i + 1} works`);
          break;
        } catch (error) {
          console.log(`❌ Method ${i + 1} failed: ${error.message}`);
        }
      }
      
      if (workingMethod === null) {
        throw new Error('Could not connect to PostgreSQL with any method');
      }
      
      // Set the command prefix based on working method
      switch (workingMethod) {
        case 0:
          useMethod = 'psql -U postgres';
          break;
        case 1:
          useMethod = 'sudo -u postgres psql';
          break;
        case 2:
          useMethod = 'psql postgres';
          break;
        case 3:
          useMethod = 'sudo -u postgres psql postgres';
          break;
      }
      
      console.log(`🔧 Using connection method: ${useMethod}`);
      
      // Create the database user
      try {
        await this.runCommand(`${useMethod} -c "CREATE USER ${this.dbUser} WITH PASSWORD '${this.dbPassword}';"`);
        console.log(`✅ Created user: ${this.dbUser}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ️ User ${this.dbUser} already exists, updating password...`);
          await this.runCommand(`${useMethod} -c "ALTER USER ${this.dbUser} WITH PASSWORD '${this.dbPassword}';"`);
          console.log(`✅ Updated password for user: ${this.dbUser}`);
        } else {
          throw error;
        }
      }
      
      // Create the database
      try {
        await this.runCommand(`${useMethod} -c "CREATE DATABASE ${this.dbName} OWNER ${this.dbUser};"`);
        console.log(`✅ Created database: ${this.dbName}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ️ Database ${this.dbName} already exists`);
          // Make sure the user owns it
          await this.runCommand(`${useMethod} -c "ALTER DATABASE ${this.dbName} OWNER TO ${this.dbUser};"`);
          console.log(`✅ Updated database owner to: ${this.dbUser}`);
        } else {
          throw error;
        }
      }
      
      // Grant all privileges
      await this.runCommand(`${useMethod} -c "GRANT ALL PRIVILEGES ON DATABASE ${this.dbName} TO ${this.dbUser};"`);
      console.log(`✅ Granted privileges to user: ${this.dbUser}`);
      
      // Test the connection with the new user
      console.log('🧪 Testing database connection...');
      const connectionString = `postgresql://${this.dbUser}:${this.dbPassword}@localhost:5432/${this.dbName}`;
      await this.runCommand(`psql "${connectionString}" -c "SELECT version();"`);
      console.log('✅ Database connection test successful!');
      
    } catch (error) {
      console.error('❌ Database setup failed:', error.message);
      throw error;
    }
  }

  async createEnvFile() {
    console.log('📝 Creating .env file...');
    
    const envContent = `# Webhook Gateway Configuration
# Generated by Fresh PostgreSQL Setup
# Generated on: ${new Date().toISOString()}

# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=${this.dbName}
DB_USER=${this.dbUser}
DB_PASSWORD=${this.dbPassword}
DB_SSL=false

# Server Configuration
PORT=3000
HOST=localhost
NODE_ENV=development

# GitHub Configuration
GITHUB_TOKEN=
GITHUB_WEBHOOK_SECRET=${this.generateSecurePassword(32)}

# Linear Configuration
LINEAR_API_KEY=
LINEAR_WEBHOOK_SECRET=${this.generateSecurePassword(32)}

# Slack Configuration
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=${this.generateSecurePassword(32)}

# JWT Configuration
JWT_SECRET=${this.generateSecurePassword(64)}

# Development Configuration
DEBUG=true
ENABLE_BATCHING=true
ENABLE_METRICS=true
ENABLE_RATE_LIMITING=true
`;

    // Write .env file with secure permissions
    fs.writeFileSync(this.envPath, envContent, { mode: 0o600 });
    console.log('✅ .env file created with secure permissions');
    
    console.log('🔐 Database credentials:');
    console.log(`   Database: ${this.dbName}`);
    console.log(`   User: ${this.dbUser}`);
    console.log(`   Password: ${this.dbPassword}`);
  }

  async initializeSchema() {
    console.log('🏗️ Initializing database schema...');
    
    try {
      // Import and run the database initialization
      const { initDatabase } = await import('../src/utils/postgresql.js');
      const { getConfig } = await import('../src/config.js');
      
      const config = getConfig();
      await initDatabase(config);
      
      console.log('✅ Database schema initialized successfully');
    } catch (error) {
      console.error('❌ Schema initialization failed:', error.message);
      throw error;
    }
  }

  async run() {
    try {
      console.log('🚀 Fresh PostgreSQL Setup Starting...');
      console.log('=====================================');
      
      // Step 1: Check PostgreSQL installation
      await this.checkPostgresInstallation();
      
      // Step 2: Setup database and user
      await this.setupDatabase();
      
      // Step 3: Create .env file
      await this.createEnvFile();
      
      // Step 4: Initialize schema
      await this.initializeSchema();
      
      console.log('');
      console.log('🎉 Fresh PostgreSQL setup completed successfully!');
      console.log('=====================================');
      console.log('');
      console.log('✅ Database created:', this.dbName);
      console.log('✅ User created:', this.dbUser);
      console.log('✅ .env file updated');
      console.log('✅ Schema initialized');
      console.log('');
      console.log('🚀 You can now run: npm start');
      console.log('');
      
    } catch (error) {
      console.error('');
      console.error('❌ Setup failed:', error.message);
      console.error('');
      console.error('💡 Troubleshooting tips:');
      console.error('   1. Make sure PostgreSQL is installed and running');
      console.error('   2. Check if you have permission to create databases');
      console.error('   3. Try running with sudo if needed');
      console.error('');
      process.exit(1);
    }
  }
}

// Run the setup
const setup = new FreshPostgresSetup();
setup.run().catch(console.error);

