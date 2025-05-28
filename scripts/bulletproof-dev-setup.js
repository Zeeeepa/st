#!/usr/bin/env node
// scripts/bulletproof-dev-setup.js - Bulletproof Development Setup with Error Catching

// IMMEDIATE OUTPUT - FIRST THING THAT RUNS
console.log('🔥 BULLETPROOF DEV SETUP STARTING...');
console.log('====================================');
console.log(`📍 Working Directory: ${process.cwd()}`);
console.log(`🖥️  Platform: ${process.platform}`);
console.log(`🔧 Node.js: ${process.version}`);
console.log(`⚙️  TTY: stdin=${!!process.stdin.isTTY}, stdout=${!!process.stdout.isTTY}`);
console.log(`🌍 Environment Variables: CI=${process.env.CI}, NODE_ENV=${process.env.NODE_ENV}`);
console.log('');

// Wrap everything in try-catch to catch ANY error
async function main() {
  try {
    console.log('🔄 Step 1: Testing basic functionality...');
    
    // Use dynamic imports for ES modules compatibility
    const fs = await import('fs');
    const path = await import('path');
    const { spawn } = await import('child_process');
    
    console.log('✅ Basic Node.js modules loaded successfully');
    
    // Check if package.json exists
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      console.log('✅ package.json found');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      console.log(`📦 Project: ${packageJson.name} v${packageJson.version}`);
    } else {
      console.log('❌ package.json not found - are you in the right directory?');
      process.exit(1);
    }
    
    // Check if .env exists
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      console.log('✅ .env file found');
    } else {
      console.log('⚠️  .env file not found - will create one');
    }
    
    // Check if src directory exists
    const srcPath = path.join(process.cwd(), 'src');
    if (fs.existsSync(srcPath)) {
      console.log('✅ src directory found');
    } else {
      console.log('❌ src directory not found - project structure issue');
    }
    
    console.log('');
    console.log('🔄 Step 2: Testing ES modules import...');
    
    // Try to dynamically import the comprehensive setup
    try {
      const module = await import('./comprehensive-dev-setup.js');
      console.log('✅ ES modules import successful');
      console.log('🔄 Step 3: Running comprehensive setup...');
      
      // Wait a moment for the comprehensive setup to initialize and run
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('✅ Comprehensive setup should have completed');
      
    } catch (importError) {
      console.log('❌ ES modules import failed:', importError.message);
      console.log('');
      console.log('🔄 Step 3: Fallback - Running with spawn...');
      
      try {
        // Try spawning the process directly
        console.log('🔄 Attempting to run comprehensive setup directly...');
        
        const childProcess = spawn.spawn('node', ['scripts/comprehensive-dev-setup.js'], {
          stdio: 'inherit',
          cwd: process.cwd()
        });
        
        childProcess.on('error', (error) => {
          console.log('❌ Spawn failed:', error.message);
          throw error;
        });
        
        childProcess.on('exit', (code) => {
          if (code === 0) {
            console.log('✅ Comprehensive setup completed successfully');
          } else {
            console.log(`❌ Comprehensive setup exited with code ${code}`);
          }
        });
        
      } catch (execError) {
        console.log('❌ Direct execution also failed:', execError.message);
        console.log('');
        console.log('🔄 Step 4: Manual setup fallback...');
        
        // Manual setup as last resort
        await manualSetup();
      }
    }
      
  } catch (error) {
    console.log('💥 CRITICAL ERROR in bulletproof setup:');
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
    console.log('');
    console.log('🔄 Attempting manual recovery...');
    
    // Last resort manual setup
    try {
      await manualSetup();
    } catch (finalError) {
      console.log('💀 FINAL FALLBACK FAILED:', finalError.message);
      console.log('');
      console.log('🆘 EMERGENCY INSTRUCTIONS:');
      console.log('1. Check if Node.js supports ES modules (Node 14+)');
      console.log('2. Verify package.json has "type": "module"');
      console.log('3. Try: node --version');
      console.log('4. Try: npm install');
      console.log('5. Try: node src/server.js directly');
      console.log('');
      console.log('📧 If all else fails, this is a Node.js/environment issue');
      process.exit(1);
    }
  }
}

// Manual setup function as absolute last resort
async function manualSetup() {
  console.log('🛠️  MANUAL SETUP MODE');
  console.log('===================');
  
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { spawn } = await import('child_process');
    
    // Check Node.js version
    console.log('🔄 Checking Node.js version...');
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 14) {
      console.log(`❌ Node.js ${nodeVersion} is too old. Need Node.js 14+`);
      console.log('Please upgrade Node.js and try again.');
      process.exit(1);
    }
    
    console.log(`✅ Node.js ${nodeVersion} is compatible`);
    
    // Check if dependencies are installed
    console.log('🔄 Checking dependencies...');
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    
    if (!fs.existsSync(nodeModulesPath)) {
      console.log('📦 Installing dependencies...');
      const { execSync } = await import('child_process');
      execSync.execSync('npm install', { stdio: 'inherit' });
      console.log('✅ Dependencies installed');
    } else {
      console.log('✅ Dependencies already installed');
    }
    
    // Create basic .env if it doesn't exist
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
      console.log('🔄 Creating basic .env file...');
      
      const basicEnv = `# Basic Environment Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Events
DB_USER=postgres
DB_PASSWORD=password

# Debug
DEBUG=true
`;
      
      fs.writeFileSync(envPath, basicEnv);
      console.log('✅ Basic .env file created');
    }
    
    // Try to start the server directly
    console.log('🔄 Attempting to start server directly...');
    console.log('');
    console.log('🚀 STARTING WEBHOOK GATEWAY...');
    console.log('===============================');
    
    // Start the server
    const serverProcess = spawn.spawn('node', ['src/server.js'], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    // Handle server process
    serverProcess.on('error', (error) => {
      console.log('❌ Server failed to start:', error.message);
      console.log('');
      console.log('🔧 TROUBLESHOOTING:');
      console.log('1. Check if src/server.js exists');
      console.log('2. Verify all dependencies are installed');
      console.log('3. Check for syntax errors in the code');
      console.log('4. Try: node --check src/server.js');
    });
    
    serverProcess.on('exit', (code) => {
      if (code !== 0) {
        console.log(`❌ Server exited with code ${code}`);
      }
    });
    
    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down...');
      serverProcess.kill();
      process.exit(0);
    });
    
  } catch (error) {
    console.log('❌ Manual setup failed:', error.message);
    throw error;
  }
}

// Run the main function
main().catch(error => {
  console.log('💀 CATASTROPHIC FAILURE:', error.message);
  console.log('');
  console.log('🆘 LAST RESORT INSTRUCTIONS:');
  console.log('1. Your Node.js environment has serious issues');
  console.log('2. Try reinstalling Node.js');
  console.log('3. Try: npm run start (to skip setup)');
  console.log('4. Check Windows PowerShell execution policy');
  console.log('5. Try running from Command Prompt instead of PowerShell');
  process.exit(1);
});
