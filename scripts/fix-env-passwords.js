#!/usr/bin/env node
// scripts/fix-env-passwords.js - Fix URL encoding issues in .env passwords

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateSecurePassword(length = 32) {
  // Use URL-safe characters to avoid encoding issues
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

async function fixEnvPasswords() {
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found');
    return;
  }
  
  console.log('🔧 Fixing .env passwords to be URL-safe...');
  
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check if DB_PASSWORD contains special characters that need encoding
  const dbPasswordMatch = envContent.match(/^DB_PASSWORD=(.*)$/m);
  if (dbPasswordMatch) {
    const currentPassword = dbPasswordMatch[1];
    // Check if password contains characters that would need URL encoding
    if (/[%&=+#]/.test(currentPassword)) {
      const newPassword = generateSecurePassword(32);
      envContent = envContent.replace(/^DB_PASSWORD=.*$/m, `DB_PASSWORD=${newPassword}`);
      console.log('✅ Updated DB_PASSWORD to be URL-safe');
    } else {
      console.log('ℹ️ DB_PASSWORD is already URL-safe');
    }
  }
  
  // Write back the fixed .env file
  fs.writeFileSync(envPath, envContent, { mode: 0o600 });
  console.log('✅ .env file updated successfully');
}

fixEnvPasswords().catch(console.error);

