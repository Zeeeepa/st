// scripts/health-check.js
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import ora from 'ora';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env') });

const WORKER_URL = process.env.CLOUDFLARE_WORKER_URL || 'http://localhost:8787';
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE;

async function checkHealth() {
  console.log(chalk.blue('🏥 Running health checks...\n'));

  const checks = [
    {
      name: 'Worker Health',
      check: async () => {
        const response = await fetch(`${WORKER_URL}/health`);
        const data = await response.json();
        return {
          success: response.ok && data.status === 'healthy',
          details: data
        };
      }
    },
    {
      name: 'Worker Metrics',
      check: async () => {
        const response = await fetch(`${WORKER_URL}/metrics`);
        const data = await response.json();
        return {
          success: response.ok,
          details: data.metrics || data
        };
      }
    },
    {
      name: 'Supabase Connection',
      check: async () => {
        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Missing Supabase configuration');
        }
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { count, error } = await supabase
          .from('webhook_events')
          .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        
        return {
          success: true,
          details: { total_events: count }
        };
      }
    },
    {
      name: 'Failed Events',
      check: async () => {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase
          .from('webhook_events_failed')
          .select('*', { count: 'exact' })
          .eq('resolved', false);
        
        if (error) throw error;
        
        return {
          success: true,
          details: {
            unresolved_failures: data?.length || 0,
            requires_attention: (data?.length || 0) > 0
          }
        };
      }
    },
    {
      name: 'Recent Events',
      check: async () => {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase
          .from('webhook_events')
          .select('source, event_type, created_at')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (error) throw error;
        
        return {
          success: true,
          details: {
            recent_events: data?.map(e => ({
              source: e.source,
              type: e.event_type,
              time: new Date(e.created_at).toLocaleString()
            }))
          }
        };
      }
    },
    {
      name: 'Event Metrics',
      check: async () => {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('webhook_event_metrics')
          .select('source, event_type, count')
          .eq('date', today)
          .order('count', { ascending: false })
          .limit(10);
        
        if (error) throw error;
        
        return {
          success: true,
          details: {
            todays_top_events: data
          }
        };
      }
    }
  ];

  const results = [];

  for (const check of checks) {
    const spinner = ora(check.name).start();
    
    try {
      const result = await check.check();
      spinner.succeed(chalk.green(`✓ ${check.name}`));
      results.push({
        name: check.name,
        success: result.success,
        details: result.details
      });
      
      if (result.details) {
        console.log(chalk.gray(JSON.stringify(result.details, null, 2)));
      }
      console.log();
    } catch (error) {
      spinner.fail(chalk.red(`✗ ${check.name}`));
      console.log(chalk.red(`  Error: ${error.message}\n`));
      results.push({
        name: check.name,
        success: false,
        error: error.message
      });
    }
  }

  // Summary
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;

  console.log(chalk.blue('📊 Health Check Summary:'));
  console.log(chalk.green(`   ✓ Passed: ${successCount}`));
  if (failureCount > 0) {
    console.log(chalk.red(`   ✗ Failed: ${failureCount}`));
  }

  // Overall status
  const allHealthy = failureCount === 0;
  console.log(chalk.blue('\n🎯 Overall Status:'), allHealthy ? chalk.green('HEALTHY') : chalk.red('UNHEALTHY'));

  // Recommendations
  if (!allHealthy) {
    console.log(chalk.yellow('\n💡 Recommendations:'));
    results.filter(r => !r.success).forEach(r => {
      if (r.name === 'Worker Health' || r.name === 'Worker Metrics') {
        console.log(chalk.yellow('   - Make sure the worker is running: npm run dev'));
      } else if (r.name === 'Supabase Connection') {
        console.log(chalk.yellow('   - Check your Supabase credentials in .env'));
        console.log(chalk.yellow('   - Ensure the database schema is set up: npm run setup:db'));
      }
    });
  }

  process.exit(allHealthy ? 0 : 1);
}

// Run health check
checkHealth().catch(error => {
  console.error(chalk.red('❌ Health check failed:'), error);
  process.exit(1);
});