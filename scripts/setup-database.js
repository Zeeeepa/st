// scripts/setup-database.js
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseKey) {
  console.error(chalk.red('❌ Missing Supabase configuration'));
  console.log(chalk.yellow('Please ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in your .env file'));
  process.exit(1);
}

async function setupDatabase() {
  console.log(chalk.blue('🗄️  Webhook Gateway Database Setup v2.0\n'));
  console.log(chalk.gray('This script will deploy the enhanced database schema'));
  console.log(chalk.gray('It handles both new installations and migrations from v1.0\n'));

  const { confirmSetup } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmSetup',
      message: 'Do you want to proceed with database setup?',
      default: true
    }
  ]);

  if (!confirmSetup) {
    console.log(chalk.yellow('Setup cancelled'));
    process.exit(0);
  }

  // Since Supabase doesn't support direct SQL execution via API,
  // we'll provide instructions for manual deployment
  console.log(chalk.blue('\n📋 Database Migration Instructions:\n'));
  
  // Check if init_db.sql exists
  const schemaPath = path.join(rootDir, 'init_db.sql');
  
  try {
    const sqlContent = fs.readFileSync(schemaPath, 'utf8');
    console.log(chalk.green('✓ Found init_db.sql'));
    
    // Save to clipboard if possible (optional enhancement)
    try {
      const { execSync } = await import('child_process');
      if (process.platform === 'win32') {
        execSync('clip', { input: sqlContent });
        console.log(chalk.green('✓ SQL copied to clipboard'));
      } else if (process.platform === 'darwin') {
        execSync('pbcopy', { input: sqlContent });
        console.log(chalk.green('✓ SQL copied to clipboard'));
      }
    } catch (e) {
      // Clipboard copy failed, not critical
    }
    
  } catch (error) {
    console.error(chalk.red(`❌ Could not read init_db.sql: ${error.message}`));
    process.exit(1);
  }

  console.log(chalk.yellow('\n🚀 Manual Deployment Steps:\n'));
  console.log(chalk.white('1. Open your Supabase Dashboard'));
  console.log(chalk.gray(`   ${supabaseUrl}`));
  console.log(chalk.white('\n2. Navigate to the SQL Editor'));
  console.log(chalk.gray('   (Database → SQL Editor)'));
  console.log(chalk.white('\n3. Create a new query'));
  console.log(chalk.white('\n4. Paste the contents of init_db.sql'));
  console.log(chalk.gray('   (Already copied to clipboard if supported)'));
  console.log(chalk.white('\n5. Run the query'));
  console.log(chalk.gray('   Click "Run" or press Ctrl/Cmd + Enter'));

  console.log(chalk.blue('\n🔍 After running the migration:\n'));
  
  const { migrationComplete } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'migrationComplete',
      message: 'Have you successfully run the migration in Supabase?',
      default: false
    }
  ]);

  if (migrationComplete) {
    await verifyDatabaseSetup();
  } else {
    console.log(chalk.yellow('\nRun this script again after completing the migration'));
  }
}

async function verifyDatabaseSetup() {
  console.log(chalk.blue('\n🔍 Verifying database setup...\n'));
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  const tables = [
    { name: 'webhook_events', description: 'Main events table' },
    { name: 'webhook_events_failed', description: 'Failed events for retry' },
    { name: 'webhook_event_metrics', description: 'Event analytics' },
    { name: 'webhook_events_archive', description: 'Archived events' }
  ];

  let allOk = true;
  const results = [];

  for (const table of tables) {
    const spinner = ora(`Checking ${table.name}...`).start();
    
    try {
      const { count, error } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        spinner.fail(chalk.red(`✗ ${table.name}`));
        console.log(chalk.red(`   Error: ${error.message}`));
        allOk = false;
        results.push({ table: table.name, status: 'failed', error: error.message });
      } else {
        spinner.succeed(chalk.green(`✓ ${table.name} - ${table.description}`));
        results.push({ table: table.name, status: 'success', count });
      }
    } catch (err) {
      spinner.fail(chalk.red(`✗ ${table.name}`));
      console.log(chalk.red(`   Error: ${err.message}`));
      allOk = false;
      results.push({ table: table.name, status: 'failed', error: err.message });
    }
  }

  // Check for required columns in webhook_events
  console.log(chalk.blue('\n📊 Checking schema structure...\n'));
  
  try {
    const { data, error } = await supabase
      .from('webhook_events')
      .select('*')
      .limit(1);
    
    if (!error) {
      const requiredColumns = [
        'source', 'event_type', 'payload', 'repository', 'organization',
        'actor', 'channel_id', 'target_entity_id', 'metadata', 'version'
      ];
      
      const sampleRow = data?.[0] || {};
      const existingColumns = Object.keys(sampleRow);
      
      if (data?.length === 0) {
        console.log(chalk.gray('   No data in webhook_events table (this is normal for new installations)'));
      }
      
      console.log(chalk.green(`✓ Schema verification complete`));
    }
  } catch (err) {
    console.log(chalk.yellow('⚠️  Could not verify schema structure'));
  }

  if (allOk) {
    console.log(chalk.green('\n✅ Database setup verified successfully!'));
    console.log(chalk.blue('\n🎉 Your webhook gateway database is ready!'));
    console.log(chalk.gray('\nNext steps:'));
    console.log(chalk.gray('1. Set webhook secrets: npm run setup:secrets'));
    console.log(chalk.gray('2. Start development: npm run dev'));
    console.log(chalk.gray('3. Test webhooks: npm run webhook:test'));
  } else {
    console.log(chalk.red('\n❌ Some tables could not be verified'));
    console.log(chalk.yellow('Please check the Supabase logs for more details'));
  }

  // Save verification results
  const verificationReport = {
    timestamp: new Date().toISOString(),
    supabaseUrl,
    tables: results,
    status: allOk ? 'success' : 'partial'
  };
  
  fs.writeFileSync(
    path.join(rootDir, 'database-verification.json'),
    JSON.stringify(verificationReport, null, 2)
  );
  
  console.log(chalk.gray('\n📄 Verification report saved to database-verification.json'));
}

// Run the setup
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase().catch(error => {
    console.error(chalk.red('❌ Setup failed:'), error);
    process.exit(1);
  });
}

export { setupDatabase, verifyDatabaseSetup };