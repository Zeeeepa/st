#!/usr/bin/env node
// scripts/enhanced-start.js - Enhanced server startup with port detection and health checks

import { fileURLToPath } from 'url';
import path from 'path';
import net from 'net';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EnhancedServerStart {
  constructor() {
    this.envPath = path.join(__dirname, '..', '.env');
  }

  async checkPrerequisites() {
    console.log('🔍 Checking prerequisites...');
    
    // Check if .env file exists
    if (!fs.existsSync(this.envPath)) {
      console.log('❌ .env file not found');
      console.log('💡 Run: npm run setup:fresh');
      return false;
    }
    
    // Check if database configuration exists
    const envContent = fs.readFileSync(this.envPath, 'utf8');
    const hasDbConfig = envContent.includes('DB_NAME=') && 
                       envContent.includes('DB_USER=') && 
                       envContent.includes('DB_PASSWORD=');
    
    if (!hasDbConfig) {
      console.log('❌ Database configuration missing in .env');
      console.log('💡 Run: npm run setup:fresh');
      return false;
    }
    
    console.log('✅ Prerequisites check passed');
    return true;
  }

  async findAvailablePort(startPort = 3000, maxPort = 3010) {
    console.log(`🔍 Checking for available ports (${startPort}-${maxPort})...`);
    
    for (let port = startPort; port <= maxPort; port++) {
      if (await this.isPortAvailable(port)) {
        if (port !== startPort) {
          console.log(`⚠️ Port ${startPort} is busy, will use port ${port}`);
        } else {
          console.log(`✅ Port ${port} is available`);
        }
        return port;
      }
    }
    
    throw new Error(`❌ No available ports found between ${startPort} and ${maxPort}`);
  }

  isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, () => {
        server.once('close', () => {
          resolve(true);
        });
        server.close();
      });
      
      server.on('error', () => {
        resolve(false);
      });
    });
  }

  async startServer() {
    try {
      console.log('🚀 Enhanced Webhook Gateway Startup');
      console.log('===================================');
      
      // Check prerequisites
      const prereqsOk = await this.checkPrerequisites();
      if (!prereqsOk) {
        process.exit(1);
      }
      
      // Check available port
      await this.findAvailablePort();
      
      console.log('🎯 Starting server...');
      console.log('');
      
      // Import and start the server
      const serverModule = await import('../src/server.js');
      
      // The server will handle its own startup logging
      
    } catch (error) {
      console.error('❌ Failed to start server:', error.message);
      console.error('');
      console.error('💡 Troubleshooting:');
      console.error('   1. Make sure PostgreSQL is running');
      console.error('   2. Check your .env configuration');
      console.error('   3. Try: npm run setup:fresh');
      console.error('');
      process.exit(1);
    }
  }
}

// Run the enhanced startup
const enhancedStart = new EnhancedServerStart();
enhancedStart.startServer().catch(console.error);

