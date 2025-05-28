#!/usr/bin/env node
// scripts/diagnose-linear.js - Linear Webhook Diagnostic Tool
import chalk from 'chalk';
import ora from 'ora';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { LinearWebhookManager } from './managers/linear-webhook-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env') });

async function checkLinearConfiguration() {
  console.log(chalk.blue('🔍 Linear Configuration Diagnostic'));
  console.log(chalk.blue('===================================\n'));

  const config = {
    linear: {
      apiKey: process.env.LINEAR_API_KEY,
      secret: process.env.LINEAR_WEBHOOK_SECRET
    },
    workerUrl: process.env.CLOUDFLARE_WORKER_URL
  };

  // Check environment variables
  console.log(chalk.blue('📋 Environment Variables:'));
  console.log(chalk[config.linear.apiKey ? 'green' : 'red'](`   ${config.linear.apiKey ? '✓' : '✗'} LINEAR_API_KEY: ${config.linear.apiKey ? 'Set' : 'Missing'}`));
  console.log(chalk[config.linear.secret ? 'green' : 'red'](`   ${config.linear.secret ? '✓' : '✗'} LINEAR_WEBHOOK_SECRET: ${config.linear.secret ? 'Set' : 'Missing'}`));
  console.log(chalk[config.workerUrl ? 'green' : 'red'](`   ${config.workerUrl ? '✓' : '✗'} CLOUDFLARE_WORKER_URL: ${config.workerUrl || 'Missing'}`));

  if (!config.linear.apiKey) {
    console.log(chalk.red('\n❌ LINEAR_API_KEY is required. Get it from:'));
    console.log(chalk.gray('   1. Go to https://linear.app/settings/api'));
    console.log(chalk.gray('   2. Create a new Personal API Key'));
    console.log(chalk.gray('   3. Add it to your .env file as LINEAR_API_KEY=your_key_here'));
    return false;
  }

  if (!config.workerUrl) {
    console.log(chalk.red('\n❌ CLOUDFLARE_WORKER_URL is required'));
    return false;
  }

  return config;
}

async function testLinearAPI(config) {
  console.log(chalk.blue('\n🔌 Testing Linear API Connection...'));
  
  const manager = new LinearWebhookManager(config);
  
  try {
    const resources = await manager.discoverResources();
    
    console.log(chalk.green('✅ Linear API connection successful!'));
    console.log(chalk.gray(`   Organization: ${resources.organization.name}`));
    console.log(chalk.gray(`   Teams: ${resources.teams.length}`));
    console.log(chalk.gray(`   Users: ${resources.users.length}`));
    
    return { success: true, resources };
  } catch (error) {
    console.log(chalk.red('❌ Linear API connection failed:'));
    console.log(chalk.red(`   Error: ${error.message}`));
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.log(chalk.yellow('\n💡 This looks like an authentication issue:'));
      console.log(chalk.yellow('   1. Check that your LINEAR_API_KEY is correct'));
      console.log(chalk.yellow('   2. Ensure the API key has the required permissions'));
      console.log(chalk.yellow('   3. Try creating a new API key from https://linear.app/settings/api'));
    }
    
    return { success: false, error };
  }
}

async function checkExistingWebhooks(config) {
  console.log(chalk.blue('\n🔗 Checking Existing Webhooks...'));
  
  const manager = new LinearWebhookManager(config);
  
  try {
    const webhooks = await manager.listWebhooks();
    
    console.log(chalk.green(`✅ Found ${webhooks.length} existing webhooks`));
    
    if (webhooks.length === 0) {
      console.log(chalk.yellow('   No webhooks configured yet'));
      return { webhooks: [], needsSetup: true };
    }
    
    // Check for our webhook
    const ourWebhook = webhooks.find(webhook => 
      webhook.url === config.workerUrl + '/webhook/linear'
    );
    
    if (ourWebhook) {
      console.log(chalk.green('✅ Found our webhook:'));
      console.log(chalk.gray(`   ID: ${ourWebhook.id}`));
      console.log(chalk.gray(`   URL: ${ourWebhook.url}`));
      console.log(chalk.gray(`   Enabled: ${ourWebhook.enabled}`));
      console.log(chalk.gray(`   Resource Types: ${ourWebhook.resourceTypes?.length || 0}`));
      console.log(chalk.gray(`   Created: ${ourWebhook.createdAt}`));
      
      if (!ourWebhook.enabled) {
        console.log(chalk.yellow('⚠️  Webhook exists but is disabled'));
      }
      
      return { webhooks, ourWebhook, needsSetup: false };
    } else {
      console.log(chalk.yellow('⚠️  No webhook found for our worker URL'));
      console.log(chalk.gray('   Expected URL: ' + config.workerUrl + '/webhook/linear'));
      
      if (webhooks.length > 0) {
        console.log(chalk.gray('\n   Existing webhooks:'));
        webhooks.forEach((webhook, index) => {
          console.log(chalk.gray(`   ${index + 1}. ${webhook.url} (${webhook.enabled ? 'enabled' : 'disabled'})`));
        });
      }
      
      return { webhooks, ourWebhook: null, needsSetup: true };
    }
  } catch (error) {
    console.log(chalk.red('❌ Failed to check webhooks:'));
    console.log(chalk.red(`   Error: ${error.message}`));
    return { webhooks: [], error };
  }
}

async function testWebhookEndpoint(config) {
  console.log(chalk.blue('\n🌐 Testing Webhook Endpoint...'));
  
  const webhookUrl = config.workerUrl + '/webhook/linear';
  
  try {
    // Test if the endpoint is accessible
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Linear-Event': 'Issue',
        'X-Linear-Delivery': 'test-delivery-id',
        'X-Linear-Timestamp': Date.now().toString()
      },
      body: JSON.stringify({
        type: 'Issue',
        action: 'create',
        data: {
          id: 'test-issue-id',
          title: 'Test Issue',
          identifier: 'TEST-1'
        },
        organizationId: 'test-org-id',
        webhookId: 'test-webhook-id'
      })
    });
    
    console.log(chalk.green(`✅ Webhook endpoint is accessible`));
    console.log(chalk.gray(`   Status: ${response.status}`));
    console.log(chalk.gray(`   URL: ${webhookUrl}`));
    
    if (response.status === 200) {
      console.log(chalk.green('✅ Webhook endpoint processed the test successfully'));
    } else if (response.status === 401) {
      console.log(chalk.yellow('⚠️  Webhook endpoint returned 401 (signature validation)'));
      console.log(chalk.gray('   This is expected for test requests without proper signatures'));
    } else {
      console.log(chalk.yellow(`⚠️  Webhook endpoint returned ${response.status}`));
    }
    
    return { accessible: true, status: response.status };
  } catch (error) {
    console.log(chalk.red('❌ Webhook endpoint is not accessible:'));
    console.log(chalk.red(`   Error: ${error.message}`));
    
    if (error.code === 'ECONNREFUSED') {
      console.log(chalk.yellow('\n💡 Connection refused. Possible issues:'));
      console.log(chalk.yellow('   1. Worker is not running (try: npm run dev)'));
      console.log(chalk.yellow('   2. Worker URL is incorrect'));
      console.log(chalk.yellow('   3. Worker is not deployed to production'));
    }
    
    return { accessible: false, error };
  }
}

async function validateWebhookConfiguration(config, webhookData) {
  console.log(chalk.blue('\n⚙️  Validating Webhook Configuration...'));
  
  if (!webhookData.ourWebhook) {
    console.log(chalk.yellow('⚠️  No webhook configured - this explains why events aren\'t being caught'));
    return { valid: false, issues: ['No webhook configured'] };
  }
  
  const webhook = webhookData.ourWebhook;
  const issues = [];
  
  // Check if webhook is enabled
  if (!webhook.enabled) {
    issues.push('Webhook is disabled');
  }
  
  // Check URL
  const expectedUrl = config.workerUrl + '/webhook/linear';
  if (webhook.url !== expectedUrl) {
    issues.push(`Webhook URL mismatch: expected ${expectedUrl}, got ${webhook.url}`);
  }
  
  // Check resource types
  const requiredResourceTypes = [
    'Issue', 'Comment', 'Project', 'ProjectUpdate',
    'Cycle', 'User', 'Team', 'Label', 'WorkflowState'
  ];
  
  const missingTypes = requiredResourceTypes.filter(type => 
    !webhook.resourceTypes?.includes(type)
  );
  
  if (missingTypes.length > 0) {
    issues.push(`Missing resource types: ${missingTypes.join(', ')}`);
  }
  
  if (issues.length === 0) {
    console.log(chalk.green('✅ Webhook configuration is valid'));
    return { valid: true, issues: [] };
  } else {
    console.log(chalk.yellow('⚠️  Webhook configuration has issues:'));
    issues.forEach(issue => {
      console.log(chalk.yellow(`   - ${issue}`));
    });
    return { valid: false, issues };
  }
}

async function generateRecommendations(diagnosticResults) {
  console.log(chalk.blue('\n💡 Recommendations'));
  console.log(chalk.blue('================\n'));
  
  const { config, apiTest, webhookCheck, endpointTest, configValidation } = diagnosticResults;
  
  if (!apiTest.success) {
    console.log(chalk.red('🔧 Fix Linear API Connection:'));
    console.log(chalk.gray('   1. Verify your LINEAR_API_KEY in .env'));
    console.log(chalk.gray('   2. Create a new API key at https://linear.app/settings/api'));
    console.log(chalk.gray('   3. Ensure the API key has proper permissions'));
    return;
  }
  
  if (!endpointTest.accessible) {
    console.log(chalk.red('🔧 Fix Webhook Endpoint:'));
    console.log(chalk.gray('   1. Start your worker: npm run dev'));
    console.log(chalk.gray('   2. Or deploy to production: npm run deploy'));
    console.log(chalk.gray('   3. Verify CLOUDFLARE_WORKER_URL is correct'));
    return;
  }
  
  if (webhookCheck.needsSetup || !configValidation.valid) {
    console.log(chalk.yellow('🔧 Setup/Fix Linear Webhook:'));
    console.log(chalk.gray('   1. Run: npm run setup'));
    console.log(chalk.gray('   2. Or manually run: node scripts/setup-linear-webhooks.js'));
    
    if (webhookCheck.ourWebhook && !configValidation.valid) {
      console.log(chalk.gray('   3. This will update the existing webhook configuration'));
    } else {
      console.log(chalk.gray('   3. This will create a new webhook with proper configuration'));
    }
    return;
  }
  
  if (apiTest.success && endpointTest.accessible && configValidation.valid) {
    console.log(chalk.green('🎉 Everything looks good!'));
    console.log(chalk.gray('   Your Linear webhook should be working properly.'));
    console.log(chalk.gray('   If events still aren\'t being caught:'));
    console.log(chalk.gray('   1. Check worker logs: npm run logs:live'));
    console.log(chalk.gray('   2. Test with: npm run webhook:linear'));
    console.log(chalk.gray('   3. Verify events are being triggered in Linear'));
    
    // Additional debugging steps
    console.log(chalk.blue('\n🔍 Additional Debugging:'));
    console.log(chalk.gray('   1. Monitor worker logs in real-time:'));
    console.log(chalk.gray('      npm run logs:live'));
    console.log(chalk.gray('   2. Create a test issue in Linear and watch for events'));
    console.log(chalk.gray('   3. Check PostgreSQL database for stored events:'));
    console.log(chalk.gray('      psql -h localhost -U postgres -d Events -c "SELECT * FROM webhook_events WHERE source = \'linear\' ORDER BY created_at DESC LIMIT 5;"'));
    console.log(chalk.gray('   4. Verify webhook deliveries in Linear:'));
    console.log(chalk.gray('      Linear Settings → API → Webhooks → View deliveries'));
  }
}

async function main() {
  try {
    // Check configuration
    const config = await checkLinearConfiguration();
    if (!config) {
      process.exit(1);
    }
    
    // Test Linear API
    const apiTest = await testLinearAPI(config);
    
    // Check existing webhooks
    const webhookCheck = await checkExistingWebhooks(config);
    
    // Test webhook endpoint
    const endpointTest = await testWebhookEndpoint(config);
    
    // Validate webhook configuration
    const configValidation = await validateWebhookConfiguration(config, webhookCheck);
    
    // Generate recommendations
    await generateRecommendations({
      config,
      apiTest,
      webhookCheck,
      endpointTest,
      configValidation
    });
    
    // Summary
    console.log(chalk.blue('\n📊 Diagnostic Summary'));
    console.log(chalk.blue('===================='));
    console.log(chalk[apiTest.success ? 'green' : 'red'](`   ${apiTest.success ? '✅' : '❌'} Linear API Connection`));
    console.log(chalk[endpointTest.accessible ? 'green' : 'red'](`   ${endpointTest.accessible ? '✅' : '❌'} Webhook Endpoint`));
    console.log(chalk[!webhookCheck.needsSetup ? 'green' : 'yellow'](`   ${!webhookCheck.needsSetup ? '✅' : '⚠️ '} Webhook Exists`));
    console.log(chalk[configValidation.valid ? 'green' : 'yellow'](`   ${configValidation.valid ? '✅' : '⚠️ '} Webhook Configuration`));
    
    const allGood = apiTest.success && endpointTest.accessible && !webhookCheck.needsSetup && configValidation.valid;
    
    if (allGood) {
      console.log(chalk.green('\n🎉 All systems operational! Linear events should be flowing.'));
    } else {
      console.log(chalk.yellow('\n⚠️  Issues found. Follow the recommendations above to fix them.'));
    }
    
  } catch (error) {
    console.error(chalk.red('\n💥 Diagnostic failed:'), error.message);
    console.error(chalk.gray(error.stack));
    process.exit(1);
  }
}

// Export for use by other scripts
export { main as diagnoseLinear };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}
