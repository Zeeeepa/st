// scripts/quick-fix-port.js - Quick fix for database port
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '..', '.env');

console.log('🔧 Quick Fix: Updating database port from 10000 to 5432...');

if (fs.existsSync(envPath)) {
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Replace DB_PORT=10000 with DB_PORT=5432
  envContent = envContent.replace(/DB_PORT=10000/, 'DB_PORT=5432');
  
  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ Updated DB_PORT to 5432 in .env file');
  console.log('🎯 Now try running: npm run dev');
} else {
  console.log('❌ .env file not found');
}

