// scripts/test-webhook.js
import fetch from 'node-fetch';
import crypto from 'crypto';
import chalk from 'chalk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env') });

// Determine the correct URL based on environment
const isProduction = process.env.NODE_ENV === 'production';
const WORKER_URL = process.env.TEST_WEBHOOK_ENDPOINT || 
                   (isProduction ? process.env.CLOUDFLARE_WORKER_URL : 'http://localhost:8787') || 
                   'http://localhost:8787';

console.log(chalk.gray(`Using webhook URL: ${WORKER_URL}`));

// Sample payloads for each service
const samplePayloads = {
  github: {
    action: 'opened',
    pull_request: {
      id: 1,
      number: 123,
      title: 'Test PR',
      state: 'open',
      user: {
        login: 'testuser'
      }
    },
    repository: {
      id: 12345,
      name: 'test-repo',
      full_name: 'testorg/test-repo',
      owner: {
        login: 'testorg',
        id: 1,
        type: 'Organization'
      }
    },
    sender: {
      login: 'testuser',
      id: 1,
      type: 'User'
    }
  },
  linear: {
    action: 'create',
    type: 'Issue',
    data: {
      id: 'test-issue-id',
      identifier: 'TEST-123',
      title: 'Test Issue',
      description: 'This is a test issue',
      state: {
        name: 'In Progress',
        type: 'started'
      },
      team: {
        id: 'test-team-id',
        name: 'Test Team',
        key: 'TEST'
      },
      assignee: {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com'
      }
    },
    organizationId: 'test-org-id',
    webhookId: 'test-webhook-id'
  },
  slack: {
    type: 'event_callback',
    team_id: 'T12345',
    api_app_id: 'A12345',
    event: {
      type: 'message',
      user: 'U12345',
      text: 'Hello, this is a test message!',
      channel: 'C12345',
      channel_type: 'channel',
      ts: '1234567890.123456'
    },
    event_id: 'Ev12345',
    event_time: 1234567890
  }
};

// Generate webhook signatures
function generateGitHubSignature(payload, secret) {
  const signature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return `sha256=${signature}`;
}

function generateLinearSignature(payload, secret) {
  const signature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('base64');
  return signature;
}

function generateSlackSignature(payload, secret, timestamp) {
  const baseString = `v0:${timestamp}:${JSON.stringify(payload)}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(baseString)
    .digest('hex');
  return `v0=${signature}`;
}

async function testWebhook(service) {
  console.log(chalk.blue(`\n🚀 Testing ${service} webhook...\n`));

  const url = `${WORKER_URL}/webhook/${service}`;
  const payload = samplePayloads[service];
  
  if (!payload) {
    console.error(chalk.red(`❌ No sample payload for service: ${service}`));
    return;
  }

  const headers = {
    'Content-Type': 'application/json'
  };

  // Add service-specific headers
  switch (service) {
    case 'github':
      headers['X-GitHub-Event'] = 'pull_request';
      headers['X-GitHub-Delivery'] = crypto.randomUUID();
      headers['X-GitHub-Hook-ID'] = '12345';
      headers['X-GitHub-Hook-Installation-Target-ID'] = '12345';
      headers['X-GitHub-Hook-Installation-Target-Type'] = 'organization';
      
      // Add signature if secret is available
      const githubSecret = process.env.GITHUB_WEBHOOK_SECRET;
      if (githubSecret) {
        headers['X-Hub-Signature-256'] = generateGitHubSignature(payload, githubSecret);
      }
      break;

    case 'linear':
      headers['X-Linear-Event'] = 'Issue';
      headers['X-Linear-Delivery'] = crypto.randomUUID();
      headers['X-Linear-Timestamp'] = Date.now().toString();
      
      // Add signature if secret is available
      const linearSecret = process.env.LINEAR_WEBHOOK_SECRET;
      if (linearSecret) {
        headers['X-Linear-Signature'] = generateLinearSignature(payload, linearSecret);
      }
      break;

    case 'slack':
      const timestamp = Math.floor(Date.now() / 1000).toString();
      headers['X-Slack-Request-Timestamp'] = timestamp;
      
      // Add signature if secret is available
      const slackSecret = process.env.SLACK_SIGNING_SECRET;
      if (slackSecret) {
        headers['X-Slack-Signature'] = generateSlackSignature(payload, slackSecret, timestamp);
      }
      break;
  }

  console.log(chalk.gray('URL:'), url);
  console.log(chalk.gray('Headers:'), JSON.stringify(headers, null, 2));
  console.log(chalk.gray('Payload:'), JSON.stringify(payload, null, 2));

  try {
    console.log(chalk.blue('\n📤 Sending webhook...'));
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    if (response.ok) {
      console.log(chalk.green(`\n✅ Webhook sent successfully!`));
      console.log(chalk.gray('Status:'), response.status);
      console.log(chalk.gray('Response:'), JSON.stringify(responseData, null, 2));
      
      // Success message
      console.log(chalk.green(`\n✨ ${service} webhook processed successfully!`));
      console.log(chalk.blue('📊 Check your Supabase dashboard to see the stored event.'));
    } else {
      console.log(chalk.red(`\n❌ Webhook failed!`));
      console.log(chalk.gray('Status:'), response.status);
      console.log(chalk.gray('Response:'), JSON.stringify(responseData, null, 2));
      
      // Helpful error messages
      if (response.status === 404) {
        console.log(chalk.yellow('\n💡 Make sure your worker is running with: npm run dev'));
        console.log(chalk.yellow(`   And that the URL is correct: ${url}`));
      } else if (response.status === 401) {
        console.log(chalk.yellow('\n💡 Authentication failed. You may need to set up webhook secrets.'));
        console.log(chalk.yellow('   Run: npm run setup:secrets'));
      }
    }
  } catch (error) {
    console.error(chalk.red(`\n❌ Error sending webhook:`), error.message);
    console.log(chalk.yellow('\n💡 Make sure the worker is running with: npm run dev'));
    console.log(chalk.yellow(`   URL being used: ${WORKER_URL}`));
    
    if (error.code === 'ECONNREFUSED') {
      console.log(chalk.yellow('\n⚠️  Connection refused. The worker might not be running.'));
      console.log(chalk.yellow('   Start it with: npm run dev'));
    }
  }
}

// Main execution
const service = process.argv[2];

if (!service) {
  console.log(chalk.blue('🧪 Webhook Testing Tool\n'));
  console.log(chalk.gray('Usage: npm run webhook:test [service]'));
  console.log(chalk.gray('       npm run webhook:github'));
  console.log(chalk.gray('       npm run webhook:linear'));
  console.log(chalk.gray('       npm run webhook:slack'));
  console.log(chalk.gray('\nTesting all services...'));
  
  // Test all services
  (async () => {
    for (const s of ['github', 'linear', 'slack']) {
      await testWebhook(s);
      // Add a small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(chalk.blue('\n📝 Summary:'));
    console.log(chalk.gray('- All webhook tests completed'));
    console.log(chalk.gray('- Check your Supabase dashboard for stored events'));
    console.log(chalk.gray('- URL: https://app.supabase.com/project/uedotecntvufyjrjrgbk/editor'));
  })();
} else if (['github', 'linear', 'slack'].includes(service)) {
  testWebhook(service).then(() => {
    console.log(chalk.blue('\n📊 Next steps:'));
    console.log(chalk.gray('1. Check Supabase dashboard for the stored event'));
    console.log(chalk.gray('2. Set up real webhooks from your services'));
    console.log(chalk.gray('3. Deploy to production when ready: npm run deploy'));
  });
} else {
  console.error(chalk.red(`❌ Unknown service: ${service}`));
  console.log(chalk.gray('Valid services: github, linear, slack'));
}