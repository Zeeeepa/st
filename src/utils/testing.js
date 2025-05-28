// src/utils/testing.js - Comprehensive Testing Framework
import crypto from 'crypto';

// Mock webhook payloads for testing
export const mockPayloads = {
  github: {
    push: {
      ref: 'refs/heads/main',
      before: '0000000000000000000000000000000000000000',
      after: 'a1b2c3d4e5f6789012345678901234567890abcd',
      repository: {
        id: 123456789,
        name: 'test-repo',
        full_name: 'testuser/test-repo',
        owner: {
          name: 'testuser',
          email: 'test@example.com'
        }
      },
      pusher: {
        name: 'testuser',
        email: 'test@example.com'
      },
      commits: [
        {
          id: 'a1b2c3d4e5f6789012345678901234567890abcd',
          message: 'Test commit',
          author: {
            name: 'Test User',
            email: 'test@example.com'
          },
          timestamp: new Date().toISOString()
        }
      ]
    },
    
    pull_request: {
      action: 'opened',
      number: 1,
      pull_request: {
        id: 987654321,
        number: 1,
        title: 'Test Pull Request',
        body: 'This is a test pull request',
        state: 'open',
        user: {
          login: 'testuser',
          id: 12345
        },
        head: {
          ref: 'feature-branch',
          sha: 'a1b2c3d4e5f6789012345678901234567890abcd'
        },
        base: {
          ref: 'main',
          sha: '0000000000000000000000000000000000000000'
        }
      },
      repository: {
        id: 123456789,
        name: 'test-repo',
        full_name: 'testuser/test-repo'
      }
    },
    
    issues: {
      action: 'opened',
      issue: {
        id: 555666777,
        number: 42,
        title: 'Test Issue',
        body: 'This is a test issue',
        state: 'open',
        user: {
          login: 'testuser',
          id: 12345
        }
      },
      repository: {
        id: 123456789,
        name: 'test-repo',
        full_name: 'testuser/test-repo'
      }
    }
  },
  
  linear: {
    issue: {
      type: 'Issue',
      action: 'create',
      organizationId: 'org_123456789',
      webhookId: 'webhook_987654321',
      data: {
        id: 'issue_abc123def456',
        title: 'Test Linear Issue',
        description: 'This is a test Linear issue',
        state: {
          id: 'state_todo',
          name: 'Todo'
        },
        team: {
          id: 'team_xyz789',
          name: 'Engineering'
        },
        assignee: {
          id: 'user_123',
          name: 'Test User',
          email: 'test@example.com'
        },
        creator: {
          id: 'user_456',
          name: 'Creator User',
          email: 'creator@example.com'
        },
        priority: 2,
        estimate: 3
      },
      createdAt: new Date().toISOString()
    },
    
    comment: {
      type: 'Comment',
      action: 'create',
      organizationId: 'org_123456789',
      webhookId: 'webhook_987654321',
      data: {
        id: 'comment_def456ghi789',
        body: 'This is a test comment',
        issue: {
          id: 'issue_abc123def456',
          title: 'Test Linear Issue'
        },
        user: {
          id: 'user_789',
          name: 'Commenter User',
          email: 'commenter@example.com'
        }
      },
      createdAt: new Date().toISOString()
    }
  },
  
  slack: {
    url_verification: {
      token: 'verification_token_123',
      challenge: 'challenge_string_456',
      type: 'url_verification'
    },
    
    event_callback: {
      token: 'verification_token_123',
      team_id: 'T123456789',
      api_app_id: 'A987654321',
      type: 'event_callback',
      event: {
        type: 'message',
        channel: 'C123456789',
        user: 'U987654321',
        text: 'Hello, this is a test message!',
        ts: '1234567890.123456'
      },
      event_time: Math.floor(Date.now() / 1000)
    },
    
    app_mention: {
      token: 'verification_token_123',
      team_id: 'T123456789',
      api_app_id: 'A987654321',
      type: 'event_callback',
      event: {
        type: 'app_mention',
        channel: 'C123456789',
        user: 'U987654321',
        text: '<@U123456789> Hello bot!',
        ts: '1234567890.123456'
      },
      event_time: Math.floor(Date.now() / 1000)
    }
  }
};

// Generate webhook signatures for testing
export function generateWebhookSignature(payload, secret, algorithm = 'sha256') {
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  
  switch (algorithm) {
    case 'sha1':
      return 'sha1=' + crypto
        .createHmac('sha1', secret)
        .update(payloadString, 'utf8')
        .digest('hex');
    
    case 'sha256':
    default:
      return 'sha256=' + crypto
        .createHmac('sha256', secret)
        .update(payloadString, 'utf8')
        .digest('hex');
  }
}

// Generate GitHub webhook headers
export function generateGitHubHeaders(event, payload, secret) {
  const payloadString = JSON.stringify(payload);
  const signature = generateWebhookSignature(payloadString, secret, 'sha256');
  
  return {
    'x-github-event': event,
    'x-github-delivery': crypto.randomUUID(),
    'x-hub-signature-256': signature,
    'content-type': 'application/json',
    'user-agent': 'GitHub-Hookshot/test'
  };
}

// Generate Linear webhook headers
export function generateLinearHeaders(payload, secret) {
  const payloadString = JSON.stringify(payload);
  const signature = generateWebhookSignature(payloadString, secret, 'sha256');
  
  return {
    'linear-signature': signature,
    'content-type': 'application/json',
    'user-agent': 'Linear-Webhook/1.0'
  };
}

// Generate Slack webhook headers
export function generateSlackHeaders(payload, secret, timestamp = null) {
  const ts = timestamp || Math.floor(Date.now() / 1000);
  const payloadString = JSON.stringify(payload);
  const baseString = `v0:${ts}:${payloadString}`;
  const signature = 'v0=' + crypto
    .createHmac('sha256', secret)
    .update(baseString, 'utf8')
    .digest('hex');
  
  return {
    'x-slack-signature': signature,
    'x-slack-request-timestamp': ts.toString(),
    'content-type': 'application/json',
    'user-agent': 'Slackbot 1.0 (+https://api.slack.com/robots)'
  };
}

// Test webhook endpoint
export async function testWebhookEndpoint(url, method = 'POST', headers = {}, body = null) {
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : null
    });
    
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }
    
    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
      raw: responseText
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: 0
    };
  }
}

// Load testing utility
export class LoadTester {
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl;
    this.concurrency = options.concurrency || 10;
    this.duration = options.duration || 60000; // 1 minute
    this.rampUp = options.rampUp || 5000; // 5 seconds
    this.results = [];
  }
  
  async runLoadTest(endpoint, payload, headers = {}) {
    console.log(`🚀 Starting load test: ${this.concurrency} concurrent requests for ${this.duration}ms`);
    
    const startTime = Date.now();
    const endTime = startTime + this.duration;
    const workers = [];
    
    // Ramp up workers gradually
    for (let i = 0; i < this.concurrency; i++) {
      setTimeout(() => {
        workers.push(this.createWorker(endpoint, payload, headers, endTime));
      }, (i * this.rampUp) / this.concurrency);
    }
    
    // Wait for all workers to complete
    await Promise.all(workers);
    
    return this.analyzeResults();
  }
  
  async createWorker(endpoint, payload, headers, endTime) {
    const url = `${this.baseUrl}${endpoint}`;
    
    while (Date.now() < endTime) {
      const startTime = Date.now();
      
      try {
        const result = await testWebhookEndpoint(url, 'POST', headers, payload);
        const duration = Date.now() - startTime;
        
        this.results.push({
          timestamp: startTime,
          duration,
          success: result.success,
          status: result.status,
          error: result.error
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        
        this.results.push({
          timestamp: startTime,
          duration,
          success: false,
          status: 0,
          error: error.message
        });
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  analyzeResults() {
    const totalRequests = this.results.length;
    const successfulRequests = this.results.filter(r => r.success).length;
    const failedRequests = totalRequests - successfulRequests;
    
    const durations = this.results.map(r => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    
    // Calculate percentiles
    const sortedDurations = durations.sort((a, b) => a - b);
    const p50 = sortedDurations[Math.floor(sortedDurations.length * 0.5)];
    const p95 = sortedDurations[Math.floor(sortedDurations.length * 0.95)];
    const p99 = sortedDurations[Math.floor(sortedDurations.length * 0.99)];
    
    // Calculate requests per second
    const testDuration = (this.results[this.results.length - 1].timestamp - this.results[0].timestamp) / 1000;
    const requestsPerSecond = totalRequests / testDuration;
    
    // Status code distribution
    const statusCodes = {};
    this.results.forEach(r => {
      statusCodes[r.status] = (statusCodes[r.status] || 0) + 1;
    });
    
    return {
      summary: {
        totalRequests,
        successfulRequests,
        failedRequests,
        successRate: (successfulRequests / totalRequests) * 100,
        requestsPerSecond,
        testDuration
      },
      timing: {
        average: avgDuration,
        minimum: minDuration,
        maximum: maxDuration,
        p50,
        p95,
        p99
      },
      statusCodes,
      errors: this.results
        .filter(r => !r.success)
        .reduce((acc, r) => {
          acc[r.error] = (acc[r.error] || 0) + 1;
          return acc;
        }, {})
    };
  }
}

// Test suite runner
export class TestSuite {
  constructor(baseUrl, config) {
    this.baseUrl = baseUrl;
    this.config = config;
    this.tests = [];
    this.results = [];
  }
  
  addTest(name, testFunction) {
    this.tests.push({ name, testFunction });
  }
  
  async runAllTests() {
    console.log(`🧪 Running ${this.tests.length} tests...`);
    
    for (const test of this.tests) {
      console.log(`\n📋 Running test: ${test.name}`);
      
      try {
        const startTime = Date.now();
        const result = await test.testFunction();
        const duration = Date.now() - startTime;
        
        this.results.push({
          name: test.name,
          success: true,
          duration,
          result
        });
        
        console.log(`✅ ${test.name} passed (${duration}ms)`);
      } catch (error) {
        const duration = Date.now() - startTime;
        
        this.results.push({
          name: test.name,
          success: false,
          duration,
          error: error.message
        });
        
        console.log(`❌ ${test.name} failed: ${error.message}`);
      }
    }
    
    return this.generateReport();
  }
  
  generateReport() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    const report = {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        passRate: (passedTests / totalTests) * 100,
        totalDuration
      },
      tests: this.results
    };
    
    console.log(`\n📊 Test Results:`);
    console.log(`Total: ${totalTests}, Passed: ${passedTests}, Failed: ${failedTests}`);
    console.log(`Pass Rate: ${report.summary.passRate.toFixed(2)}%`);
    console.log(`Total Duration: ${totalDuration}ms`);
    
    return report;
  }
}

// Webhook validation tests
export function createWebhookTests(baseUrl, config) {
  const suite = new TestSuite(baseUrl, config);
  
  // GitHub webhook tests
  suite.addTest('GitHub Push Webhook', async () => {
    const payload = mockPayloads.github.push;
    const headers = generateGitHubHeaders('push', payload, config.githubWebhookSecret);
    const result = await testWebhookEndpoint(`${baseUrl}/webhook/github`, 'POST', headers, payload);
    
    if (!result.success) {
      throw new Error(`GitHub webhook failed: ${result.status} ${result.statusText}`);
    }
    
    return result;
  });
  
  suite.addTest('GitHub Pull Request Webhook', async () => {
    const payload = mockPayloads.github.pull_request;
    const headers = generateGitHubHeaders('pull_request', payload, config.githubWebhookSecret);
    const result = await testWebhookEndpoint(`${baseUrl}/webhook/github`, 'POST', headers, payload);
    
    if (!result.success) {
      throw new Error(`GitHub PR webhook failed: ${result.status} ${result.statusText}`);
    }
    
    return result;
  });
  
  // Linear webhook tests
  suite.addTest('Linear Issue Webhook', async () => {
    const payload = mockPayloads.linear.issue;
    const headers = generateLinearHeaders(payload, config.linearWebhookSecret);
    const result = await testWebhookEndpoint(`${baseUrl}/webhook/linear`, 'POST', headers, payload);
    
    if (!result.success) {
      throw new Error(`Linear webhook failed: ${result.status} ${result.statusText}`);
    }
    
    return result;
  });
  
  // Slack webhook tests
  suite.addTest('Slack URL Verification', async () => {
    const payload = mockPayloads.slack.url_verification;
    const headers = generateSlackHeaders(payload, config.slackSigningSecret);
    const result = await testWebhookEndpoint(`${baseUrl}/webhook/slack`, 'POST', headers, payload);
    
    if (!result.success) {
      throw new Error(`Slack URL verification failed: ${result.status} ${result.statusText}`);
    }
    
    if (result.data !== payload.challenge) {
      throw new Error(`Slack challenge response mismatch: expected ${payload.challenge}, got ${result.data}`);
    }
    
    return result;
  });
  
  // Health check test
  suite.addTest('Health Check', async () => {
    const result = await testWebhookEndpoint(`${baseUrl}/health`, 'GET');
    
    if (!result.success) {
      throw new Error(`Health check failed: ${result.status} ${result.statusText}`);
    }
    
    if (result.data.status !== 'healthy') {
      throw new Error(`Health check returned unhealthy status: ${result.data.status}`);
    }
    
    return result;
  });
  
  // Metrics test
  suite.addTest('Metrics Endpoint', async () => {
    const result = await testWebhookEndpoint(`${baseUrl}/metrics`, 'GET');
    
    if (!result.success) {
      throw new Error(`Metrics endpoint failed: ${result.status} ${result.statusText}`);
    }
    
    if (!result.data.metrics) {
      throw new Error(`Metrics response missing metrics data`);
    }
    
    return result;
  });
  
  return suite;
}

export { testWebhookEndpoint, LoadTester, TestSuite };

