// scripts/setup-database.js - PostgreSQL Database Setup
import chalk from 'chalk';
import { getConfig } from '../src/config.js';
import { initDatabase, checkDatabaseHealth } from '../src/utils/postgresql.js';

async function setupDatabase() {
  console.log(chalk.blue('🗄️  Setting up PostgreSQL database...\\n'));
  
  try {
    // Get configuration
    const config = getConfig();
    
    console.log(chalk.gray('Configuration:'));
    console.log(chalk.gray(`  Host: ${config.database.host}:${config.database.port}`));
    console.log(chalk.gray(`  Database: ${config.database.name}`));
    console.log(chalk.gray(`  User: ${config.database.user}`));
    console.log(chalk.gray(`  SSL: ${config.database.ssl ? 'enabled' : 'disabled'}\\n`));
    
    // Initialize database
    console.log(chalk.yellow('📋 Initializing database schema...'));
    await initDatabase(config);
    console.log(chalk.green('✅ Database schema initialized successfully\\n'));
    
    // Test connection
    console.log(chalk.yellow('🔍 Testing database connection...'));
    const health = await checkDatabaseHealth(config);
    
    if (health.healthy) {
      console.log(chalk.green(`✅ Database connection successful (${health.responseTime}ms)\\n`));
    } else {
      throw new Error(health.error || 'Database health check failed');
    }
    
    // Verify tables
    console.log(chalk.yellow('📊 Verifying database tables...'));
    const { pool } = await import('../src/utils/postgresql.js');
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT table_name, 
               (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
        FROM information_schema.tables t
        WHERE table_schema = 'public' 
        AND table_name LIKE 'webhook_%'
        ORDER BY table_name
      `);
      
      console.log(chalk.green('✅ Database tables verified:'));
      for (const row of result.rows) {
        console.log(chalk.gray(`   - ${row.table_name} (${row.column_count} columns)`));
      }
      console.log('');
      
      // Check indexes
      const indexResult = await client.query(`
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename LIKE 'webhook_%'
        ORDER BY tablename, indexname
      `);
      
      console.log(chalk.green(`✅ Database indexes: ${indexResult.rows.length} indexes created`));
      console.log('');
      
      // Check functions
      const functionResult = await client.query(`
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_type = 'FUNCTION'
        ORDER BY routine_name
      `);
      
      console.log(chalk.green(`✅ Database functions: ${functionResult.rows.length} functions created`));
      for (const row of functionResult.rows) {
        console.log(chalk.gray(`   - ${row.routine_name}()`));
      }
      console.log('');
      
    } finally {
      client.release();
    }
    
    console.log(chalk.green('🎉 Database setup completed successfully!\\n'));
    
    console.log(chalk.blue('📝 Next Steps:'));
    console.log(chalk.gray('1. Start the webhook gateway: npm start'));
    console.log(chalk.gray('2. Test webhook endpoints: npm run test'));
    console.log(chalk.gray('3. Monitor health: npm run health:check'));
    console.log(chalk.gray('4. View metrics: npm run metrics\\n'));
    
    return true;
    
  } catch (error) {
    console.error(chalk.red('❌ Database setup failed:'), error.message);
    
    console.log('\\n' + chalk.yellow('💡 Troubleshooting:'));
    console.log(chalk.yellow('1. Ensure PostgreSQL is running:'));
    console.log(chalk.gray('   service postgresql start'));
    console.log(chalk.yellow('2. Check database exists:'));
    console.log(chalk.gray('   su - postgres -c "psql -l | grep Events"'));
    console.log(chalk.yellow('3. Verify user permissions:'));
    console.log(chalk.gray('   su - postgres -c "psql -c \\"\\\\du\\""'));
    console.log(chalk.yellow('4. Test connection manually:'));
    console.log(chalk.gray('   psql -h localhost -U postgres -d Events'));
    console.log('');
    
    return false;
  }
}

// Create database if it doesn't exist
async function createDatabaseIfNotExists() {
  try {
    const config = getConfig();
    
    console.log(chalk.yellow('🔍 Checking if database exists...'));
    
    // Try to connect to the database
    try {
      await initDatabase(config);
      console.log(chalk.green('✅ Database already exists'));
      return true;
    } catch (error) {
      if (error.message.includes('does not exist')) {
        console.log(chalk.yellow('📝 Database does not exist, creating...'));
        
        // Connect to postgres database to create the target database
        const { Pool } = await import('pg');
        const adminPool = new Pool({
          user: config.database.user,
          password: config.database.password,
          host: config.database.host,
          port: config.database.port,
          database: 'postgres', // Connect to default postgres database
          ssl: config.database.ssl
        });
        
        const client = await adminPool.connect();
        
        try {
          await client.query(`CREATE DATABASE "${config.database.name}"`);
          console.log(chalk.green(`✅ Database "${config.database.name}" created successfully`));
          return true;
        } finally {
          client.release();
          await adminPool.end();
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error(chalk.red('❌ Failed to create database:'), error.message);
    return false;
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      // First, try to create database if it doesn't exist
      const dbCreated = await createDatabaseIfNotExists();
      if (!dbCreated) {
        process.exit(1);
      }
      
      // Then setup the database schema
      const success = await setupDatabase();
      process.exit(success ? 0 : 1);
    } catch (error) {
      console.error(chalk.red('Setup failed:'), error.message);
      process.exit(1);
    }
  })();
}

export { setupDatabase, createDatabaseIfNotExists };

