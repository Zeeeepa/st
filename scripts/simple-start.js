#!/usr/bin/env node
// scripts/simple-start.js - Simple server startup without complex deployment

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  try {
    console.log('🚀 Starting Webhook Gateway Server...');
    console.log('====================================');
    
    // Import and start the server directly
    const serverModule = await import('../src/server.js');
    
    console.log('✅ Server started successfully!');
    console.log('🌐 Server running at: http://localhost:3000');
    console.log('🏥 Health check: http://localhost:3000/health');
    console.log('📊 Metrics: http://localhost:3000/metrics');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error('');
    console.error('💡 Try running the setup first:');
    console.error('   node scripts/fresh-postgres-setup.js');
    console.error('');
    process.exit(1);
  }
}

startServer();

