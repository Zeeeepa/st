#!/usr/bin/env node
// scripts/create-database.js - Database Creation Script

import pg from 'pg';
import chalk from 'chalk';
import ora from 'ora';
import { getConfig } from '../src/config.js';

const { Pool } = pg;

async function createDatabase() {
  const config = getConfig();
  const spinner = ora('Creating PostgreSQL database...').start();
  
  try {
    // Connect to default postgres database to create our target database
    const adminPool = new Pool({
      user: config.database.user,
      password: config.database.password,
      host: config.database.host,
      port: config.database.port,
      database: 'postgres', // Connect to default postgres database
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    const client = await adminPool.connect();
    
    try {
      // Check if database exists
      const result = await client.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [config.database.name]
      );
      
      if (result.rows.length === 0) {
        // Create the database
        await client.query(`CREATE DATABASE "${config.database.name}"`);
        spinner.succeed(chalk.green(`✅ Database '${config.database.name}' created successfully`));
      } else {
        spinner.succeed(chalk.yellow(`⚠️  Database '${config.database.name}' already exists`));
      }
      
      // Test connection to the new database
      const testPool = new Pool({
        user: config.database.user,
        password: config.database.password,
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      const testClient = await testPool.connect();
      await testClient.query('SELECT NOW()');
      testClient.release();
      await testPool.end();
      
      console.log(chalk.green(`✅ Successfully connected to database '${config.database.name}'`));
      
    } finally {
      client.release();
      await adminPool.end();
    }
    
  } catch (error) {
    spinner.fail(chalk.red('❌ Failed to create database'));
    console.error(chalk.red('Error:'), error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log(chalk.yellow('\n💡 Troubleshooting tips:'));
      console.log(chalk.yellow('1. Make sure PostgreSQL is running'));
      console.log(chalk.yellow('2. Check your database connection settings in .env'));
      console.log(chalk.yellow('3. Verify the database user has permission to create databases'));
      console.log(chalk.yellow(`4. Try connecting manually: psql -h ${config.database.host} -p ${config.database.port} -U ${config.database.user} -d postgres`));
    }
    
    process.exit(1);
  }
}

// Print configuration info
function printDatabaseInfo() {
  const config = getConfig();
  
  console.log(chalk.blue('\n📋 Database Configuration:'));
  console.log(chalk.blue('=========================='));
  console.log(`🏠 Host: ${config.database.host}`);
  console.log(`🔌 Port: ${config.database.port}`);
  console.log(`📊 Database: ${config.database.name}`);
  console.log(`👤 User: ${config.database.user}`);
  console.log(`🔐 Password: ${'*'.repeat(config.database.password.length)}`);
  console.log('');
}

// Main execution
async function main() {
  console.log(chalk.blue.bold('🗄️  PostgreSQL Database Setup'));
  console.log(chalk.blue.bold('==============================\n'));
  
  printDatabaseInfo();
  await createDatabase();
  
  console.log(chalk.green('\n🎉 Database setup completed!'));
  console.log(chalk.green('You can now run the webhook gateway with: npm start'));
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('Unhandled error:'), error);
  process.exit(1);
});

// Run the script
main().catch(console.error);

