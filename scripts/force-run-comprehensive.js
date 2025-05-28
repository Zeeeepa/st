#!/usr/bin/env node
// scripts/force-run-comprehensive.js - Forces the comprehensive setup to run

console.log('🚀 FORCE RUNNING COMPREHENSIVE SETUP...');
console.log('=======================================');
console.log(`📍 Working Directory: ${process.cwd()}`);
console.log(`🖥️  Platform: ${process.platform}`);
console.log(`🔧 Node.js: ${process.version}`);
console.log('');

async function forceRun() {
  try {
    console.log('🔄 Importing comprehensive setup...');
    
    // Import the comprehensive setup class
    const { ComprehensiveDevSetup } = await import('./comprehensive-dev-setup.js');
    
    console.log('✅ Import successful');
    console.log('🔄 Creating setup instance...');
    
    // Create and run the setup
    const setup = new ComprehensiveDevSetup();
    
    console.log('✅ Instance created');
    console.log('🔄 Running setup...');
    console.log('');
    
    // Run the setup with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Setup timed out after 60 seconds')), 60000);
    });
    
    const setupPromise = setup.run();
    
    await Promise.race([setupPromise, timeoutPromise]);
    
    console.log('');
    console.log('✅ Setup completed successfully!');
    
  } catch (error) {
    console.log('');
    console.log('❌ Setup failed:', error.message);
    
    if (error.message.includes('timed out')) {
      console.log('');
      console.log('⏰ TIMEOUT DETECTED - Setup is hanging!');
      console.log('This usually means:');
      console.log('1. Waiting for user input in non-interactive mode');
      console.log('2. Database connection hanging');
      console.log('3. Network operation not timing out');
      console.log('');
      console.log('🔧 FALLBACK: Starting server directly...');
      
      try {
        const { spawn } = await import('child_process');
        
        console.log('🚀 STARTING WEBHOOK GATEWAY DIRECTLY...');
        console.log('=======================================');
        
        const serverProcess = spawn.spawn('node', ['src/server.js'], {
          stdio: 'inherit',
          cwd: process.cwd()
        });
        
        serverProcess.on('error', (serverError) => {
          console.log('❌ Server failed to start:', serverError.message);
          process.exit(1);
        });
        
        // Keep process alive
        process.on('SIGINT', () => {
          console.log('\n🛑 Shutting down...');
          serverProcess.kill();
          process.exit(0);
        });
        
      } catch (fallbackError) {
        console.log('❌ Fallback also failed:', fallbackError.message);
        console.log('');
        console.log('🆘 MANUAL INSTRUCTIONS:');
        console.log('1. Try: npm start');
        console.log('2. Check PostgreSQL is running');
        console.log('3. Verify .env configuration');
        process.exit(1);
      }
    } else {
      console.log('Stack:', error.stack);
      process.exit(1);
    }
  }
}

forceRun();

