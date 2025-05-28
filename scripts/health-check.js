// scripts/health-check.js - PostgreSQL Health Check
import chalk from 'chalk';
import { getConfig } from '../src/config.js';
import { initDatabase, checkDatabaseHealth, getMetrics } from '../src/utils/postgresql.js';

// Health check configuration
const healthChecks = [
  {
    name: 'PostgreSQL Connection',
    check: async () => {
      const config = getConfig();
      if (!config.database.host || !config.database.user || !config.database.password) {
        throw new Error('Missing PostgreSQL configuration');
      }
      
      // Initialize database if not already done
      await initDatabase(config);
      
      // Check database health
      const health = await checkDatabaseHealth(config);
      if (!health.healthy) {
        throw new Error(health.error || 'Database health check failed');
      }
      
      return {
        status: 'healthy',
        responseTime: health.responseTime,
        details: 'PostgreSQL connection successful'
      };
    }
  },
  {
    name: 'Database Schema',
    check: async () => {
      const config = getConfig();
      await initDatabase(config);
      
      // Check if main tables exist
      const { pool } = await import('../src/utils/postgresql.js');
      const client = await pool.connect();
      
      try {
        const result = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('webhook_events', 'webhook_events_failed', 'webhook_event_metrics')
        `);
        
        const tables = result.rows.map(row => row.table_name);
        const requiredTables = ['webhook_events', 'webhook_events_failed', 'webhook_event_metrics'];
        const missingTables = requiredTables.filter(table => !tables.includes(table));
        
        if (missingTables.length > 0) {
          throw new Error(`Missing required tables: ${missingTables.join(', ')}`);
        }
        
        return {
          status: 'healthy',
          details: `All required tables present: ${tables.join(', ')}`
        };
      } finally {
        client.release();
      }
    }
  },
  {
    name: 'Database Metrics',
    check: async () => {
      const config = getConfig();
      const metrics = await getMetrics(config);
      
      return {
        status: 'healthy',
        details: `Total events: ${metrics.overall.total_events || 0}, Sources: ${metrics.overall.unique_sources || 0}`
      };
    }
  },
  {
    name: 'Environment Variables',
    check: async () => {
      const config = getConfig();
      const required = [
        'database.host',
        'database.port', 
        'database.name',
        'database.user',
        'database.password'
      ];
      
      const missing = required.filter(key => {
        const value = key.split('.').reduce((obj, k) => obj?.[k], config);
        return !value;
      });
      
      if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
      }
      
      return {
        status: 'healthy',
        details: 'All required environment variables present'
      };
    }
  }
];

// Run health checks
async function runHealthChecks() {
  console.log(chalk.blue('🏥 Running Health Checks...\\n'));
  
  let allPassed = true;
  const results = [];
  
  for (const healthCheck of healthChecks) {
    try {
      console.log(chalk.gray(`Checking ${healthCheck.name}...`));
      const result = await healthCheck.check();
      
      console.log(chalk.green(`✅ ${healthCheck.name}: ${result.details || 'OK'}`));
      if (result.responseTime) {
        console.log(chalk.gray(`   Response time: ${result.responseTime}ms`));
      }
      
      results.push({
        name: healthCheck.name,
        status: 'passed',
        details: result.details,
        responseTime: result.responseTime
      });
    } catch (error) {
      console.log(chalk.red(`❌ ${healthCheck.name}: ${error.message}`));
      allPassed = false;
      
      results.push({
        name: healthCheck.name,
        status: 'failed',
        error: error.message
      });
    }
  }
  
  console.log('\\n' + chalk.blue('📊 Health Check Summary'));
  console.log('========================');
  
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  
  console.log(chalk.green(`✅ Passed: ${passed}`));
  console.log(chalk.red(`❌ Failed: ${failed}`));
  
  if (allPassed) {
    console.log('\\n' + chalk.green('🎉 All health checks passed! System is healthy.'));
  } else {
    console.log('\\n' + chalk.red('⚠️  Some health checks failed. Please review the issues above.'));
    
    // Provide troubleshooting tips
    console.log('\\n' + chalk.yellow('💡 Troubleshooting Tips:'));
    
    for (const result of results) {
      if (result.status === 'failed') {
        if (result.name === 'PostgreSQL Connection') {
          console.log(chalk.yellow('   - Check your PostgreSQL credentials in .env'));
          console.log(chalk.yellow('   - Ensure PostgreSQL server is running'));
          console.log(chalk.yellow('   - Verify database "Events" exists'));
        } else if (result.name === 'Database Schema') {
          console.log(chalk.yellow('   - Run database initialization: npm run setup:db'));
          console.log(chalk.yellow('   - Check PostgreSQL logs for schema creation errors'));
        } else if (result.name === 'Environment Variables') {
          console.log(chalk.yellow('   - Review your .env file configuration'));
          console.log(chalk.yellow('   - Ensure all required PostgreSQL variables are set'));
        }
      }
    }
  }
  
  return allPassed;
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runHealthChecks()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error(chalk.red('Health check failed:'), error.message);
      process.exit(1);
    });
}

export { runHealthChecks };

