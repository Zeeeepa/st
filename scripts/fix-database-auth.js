#!/usr/bin/env node
// scripts/fix-database-auth.js - Quick fix for database authentication issues

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 DATABASE AUTHENTICATION FIX');
console.log('===============================');
console.log('This script will fix the common database authentication issue.');
console.log('');

class DatabaseAuthFix {
  constructor() {
    this.envPath = path.join(__dirname, '..', '.env');
    this.isWindows = process.platform === 'win32';
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

  async fixDatabaseUser() {
    console.log('🔄 Attempting to fix database user configuration...');
    
    try {
      const sudoPrefix = this.isWindows ? '' : 'sudo -u postgres ';
      
      // Try to create the webhook_user with the password from .env
      console.log('Creating webhook_user with password "password"...');
      
      const createUserCmd = `${sudoPrefix}psql -c "CREATE USER webhook_user WITH PASSWORD 'password';"`;
      await this.runCommand(createUserCmd, { silent: true });
      console.log('✅ User webhook_user created');
      
      // Create database if it doesn't exist
      const createDbCmd = `${sudoPrefix}createdb -O webhook_user Events`;
      await this.runCommand(createDbCmd, { silent: true });
      console.log('✅ Database Events created');
      
      // Grant privileges
      const grantCmd = `${sudoPrefix}psql -c "GRANT ALL PRIVILEGES ON DATABASE Events TO webhook_user;"`;
      await this.runCommand(grantCmd, { silent: true });
      console.log('✅ Privileges granted');
      
      return true;
    } catch (error) {
      console.log('⚠️ User/database creation failed (may already exist)');
      return false;
    }
  }

  async updateEnvFile() {
    console.log('🔄 Updating .env file to use webhook_user...');
    
    if (!fs.existsSync(this.envPath)) {
      console.log('❌ .env file not found');
      return false;
    }

    let envContent = fs.readFileSync(this.envPath, 'utf8');
    
    // Update DB_USER to webhook_user
    envContent = envContent.replace(/^DB_USER=.*$/m, 'DB_USER=webhook_user');
    
    // Ensure password is set to 'password'
    if (!envContent.includes('DB_PASSWORD=')) {
      envContent += '\nDB_PASSWORD=password';
    } else {
      envContent = envContent.replace(/^DB_PASSWORD=.*$/m, 'DB_PASSWORD=password');
    }
    
    fs.writeFileSync(this.envPath, envContent);
    console.log('✅ .env file updated');
    return true;
  }

  async testConnection() {
    console.log('🔍 Testing database connection...');
    
    try {
      const testCmd = 'psql "postgresql://webhook_user:password@localhost:5432/Events" -c "SELECT version();"';
      await this.runCommand(testCmd, { silent: true });
      console.log('✅ Database connection successful!');
      return true;
    } catch (error) {
      console.log('❌ Database connection failed');
      return false;
    }
  }

  async run() {
    try {
      console.log('Step 1: Creating database user and database...');
      await this.fixDatabaseUser();
      
      console.log('\nStep 2: Updating .env file...');
      await this.updateEnvFile();
      
      console.log('\nStep 3: Testing connection...');
      const connectionSuccess = await this.testConnection();
      
      console.log('\n' + '='.repeat(50));
      
      if (connectionSuccess) {
        console.log('🎉 DATABASE AUTHENTICATION FIXED!');
        console.log('');
        console.log('You can now run:');
        console.log('  npm run dev');
        console.log('');
        console.log('The application should start without authentication errors.');
      } else {
        console.log('⚠️ PARTIAL FIX APPLIED');
        console.log('');
        console.log('The user and database were created, but connection test failed.');
        console.log('This might be due to PostgreSQL not running or other configuration issues.');
        console.log('');
        console.log('Try running:');
        console.log('  npm run setup:db:interactive');
        console.log('');
        console.log('For a more comprehensive setup.');
      }
      
    } catch (error) {
      console.error('❌ Fix failed:', error.message);
      console.log('');
      console.log('Please try running the interactive setup:');
      console.log('  npm run setup:db:interactive');
    }
  }
}

// Run the fix
const fix = new DatabaseAuthFix();
fix.run().catch(console.error);

