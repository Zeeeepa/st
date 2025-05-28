#!/usr/bin/env node
// scripts/simple-diagnostic.js - Simple diagnostic to find the exact issue

console.log('🔍 SIMPLE DIAGNOSTIC STARTING...');
console.log('=================================');
console.log(`📍 Working Directory: ${process.cwd()}`);
console.log(`🖥️  Platform: ${process.platform}`);
console.log(`🔧 Node.js: ${process.version}`);
console.log(`⚙️  TTY: stdin=${!!process.stdin.isTTY}, stdout=${!!process.stdout.isTTY}`);
console.log('');

async function runDiagnostic() {
  try {
    console.log('🔄 Step 1: Testing basic imports...');
    
    // Test each import individually
    console.log('  - Testing fs...');
    const fs = await import('fs');
    console.log('  ✅ fs imported');
    
    console.log('  - Testing path...');
    const path = await import('path');
    console.log('  ✅ path imported');
    
    console.log('  - Testing child_process...');
    const { spawn } = await import('child_process');
    console.log('  ✅ child_process imported');
    
    console.log('  - Testing readline...');
    const readline = await import('readline');
    console.log('  ✅ readline imported');
    
    console.log('');
    console.log('🔄 Step 2: Testing file system...');
    
    // Check critical files
    const files = [
      'package.json',
      '.env',
      'src/server.js',
      'src/config.js',
      'scripts/comprehensive-dev-setup.js'
    ];
    
    for (const file of files) {
      if (fs.existsSync(file)) {
        console.log(`  ✅ ${file} exists`);
      } else {
        console.log(`  ❌ ${file} missing`);
      }
    }
    
    console.log('');
    console.log('🔄 Step 3: Testing comprehensive script import...');
    
    try {
      console.log('  - Attempting import...');
      const comprehensiveModule = await import('./comprehensive-dev-setup.js');
      console.log('  ✅ Import successful');
      
      console.log('  - Module keys:', Object.keys(comprehensiveModule));
      
    } catch (importError) {
      console.log('  ❌ Import failed:', importError.message);
      console.log('  📋 Error details:', importError.stack);
    }
    
    console.log('');
    console.log('🔄 Step 4: Testing direct execution...');
    
    try {
      const { execSync } = await import('child_process');
      console.log('  - Running: node --check scripts/comprehensive-dev-setup.js');
      
      execSync.execSync('node --check scripts/comprehensive-dev-setup.js', {
        stdio: 'pipe',
        timeout: 5000
      });
      
      console.log('  ✅ Syntax check passed');
      
    } catch (syntaxError) {
      console.log('  ❌ Syntax check failed:', syntaxError.message);
    }
    
    console.log('');
    console.log('🔄 Step 5: Testing server file...');
    
    try {
      const { execSync } = await import('child_process');
      console.log('  - Running: node --check src/server.js');
      
      execSync.execSync('node --check src/server.js', {
        stdio: 'pipe',
        timeout: 5000
      });
      
      console.log('  ✅ Server syntax check passed');
      
    } catch (serverError) {
      console.log('  ❌ Server syntax check failed:', serverError.message);
    }
    
    console.log('');
    console.log('✅ DIAGNOSTIC COMPLETE');
    console.log('======================');
    console.log('If all checks passed, the issue is likely:');
    console.log('1. The comprehensive script is hanging on user input');
    console.log('2. There\'s an infinite loop or blocking operation');
    console.log('3. Windows-specific TTY/console issues');
    console.log('');
    console.log('Next step: Try running the server directly with:');
    console.log('npm start');
    
  } catch (error) {
    console.log('💥 DIAGNOSTIC FAILED:', error.message);
    console.log('Stack:', error.stack);
  }
}

runDiagnostic();

