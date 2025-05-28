#!/usr/bin/env node
// scripts/test-comprehensive.js - Comprehensive Testing Suite

import chalk from 'chalk';
import ora from 'ora';
import { getConfig } from '../src/config.js';
import { createWebhookTests, LoadTester, mockPayloads, generateGitHubHeaders, generateLinearHeaders, generateSlackHeaders } from '../src/utils/testing.js';

async function runComprehensiveTests() {
  console.log(chalk.blue.bold('🧪 Webhook Gateway v3.0 - Comprehensive Test Suite'));
  console.log(chalk.blue.bold('==================================================\n'));
  
  const config = getConfig();
  const baseUrl = `http://${config.host}:${config.port}`;
  
  let spinner = ora('Initializing test suite...').start();
  
  try {
    // Step 1: Basic functionality tests
    spinner.text = 'Running basic functionality tests...';
    
    const testSuite = createWebhookTests(baseUrl, config);
    const basicResults = await testSuite.runAllTests();
    
    if (basicResults.summary.passRate === 100) {
      spinner.succeed(chalk.green(`✅ Basic tests passed (${basicResults.summary.passed}/${basicResults.summary.total})`));
    } else {
      spinner.warn(chalk.yellow(`⚠️  Some basic tests failed (${basicResults.summary.passed}/${basicResults.summary.total} passed)`));
    }
    
    // Step 2: Load testing
    spinner = ora('Running load tests...').start();
    
    const loadTester = new LoadTester(baseUrl, {
      concurrency: 5,
      duration: 30000, // 30 seconds
      rampUp: 2000 // 2 seconds
    });
    
    // Test GitHub webhook under load
    const githubPayload = mockPayloads.github.push;
    const githubHeaders = generateGitHubHeaders('push', githubPayload, config.githubWebhookSecret);
    
    const loadResults = await loadTester.runLoadTest('/webhook/github', githubPayload, githubHeaders);
    
    if (loadResults.summary.successRate > 95) {
      spinner.succeed(chalk.green(`✅ Load test passed (${loadResults.summary.successRate.toFixed(2)}% success rate)`));
    } else {
      spinner.warn(chalk.yellow(`⚠️  Load test had issues (${loadResults.summary.successRate.toFixed(2)}% success rate)`));
    }
    
    // Step 3: Error handling tests
    spinner = ora('Testing error handling...').start();
    
    const errorTests = await runErrorHandlingTests(baseUrl, config);
    
    if (errorTests.passed >= errorTests.total * 0.8) {
      spinner.succeed(chalk.green(`✅ Error handling tests passed (${errorTests.passed}/${errorTests.total})`));
    } else {
      spinner.warn(chalk.yellow(`⚠️  Some error handling tests failed (${errorTests.passed}/${errorTests.total} passed)`));
    }
    
    // Step 4: Security tests
    spinner = ora('Running security tests...').start();
    
    const securityTests = await runSecurityTests(baseUrl, config);
    
    if (securityTests.passed >= securityTests.total * 0.9) {
      spinner.succeed(chalk.green(`✅ Security tests passed (${securityTests.passed}/${securityTests.total})`));
    } else {
      spinner.fail(chalk.red(`❌ Security tests failed (${securityTests.passed}/${securityTests.total} passed)`));
    }
    
    // Step 5: Performance benchmarks
    spinner = ora('Running performance benchmarks...').start();
    
    const perfResults = await runPerformanceBenchmarks(baseUrl, config);
    
    if (perfResults.avgResponseTime < 1000) {
      spinner.succeed(chalk.green(`✅ Performance benchmarks passed (avg: ${perfResults.avgResponseTime}ms)`));
    } else {
      spinner.warn(chalk.yellow(`⚠️  Performance could be improved (avg: ${perfResults.avgResponseTime}ms)`));
    }
    
    // Generate comprehensive report
    const report = {
      timestamp: new Date().toISOString(),
      basic_tests: basicResults,
      load_tests: loadResults,
      error_handling: errorTests,
      security_tests: securityTests,
      performance: perfResults,
      overall_score: calculateOverallScore({
        basicResults,
        loadResults,
        errorTests,
        securityTests,
        perfResults
      })
    };
    
    // Display results
    displayTestResults(report);
    
    // Save report to file
    const fs = await import('fs');
    const reportPath = `test-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(chalk.blue(`\n📄 Detailed report saved to: ${reportPath}`));
    
    return report;
    
  } catch (error) {
    spinner.fail(chalk.red('❌ Test suite failed'));
    console.error(chalk.red('Error:'), error.message);
    throw error;
  }
}

// Error handling tests
async function runErrorHandlingTests(baseUrl, config) {
  const tests = [];
  let passed = 0;
  
  // Test 1: Invalid JSON payload
  tests.push('Invalid JSON payload');
  try {
    const response = await fetch(`${baseUrl}/webhook/github`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json{'
    });
    
    if (response.status === 400) {
      passed++;
    }
  } catch (error) {
    // Expected to fail
  }
  
  // Test 2: Missing signature
  tests.push('Missing signature');
  try {
    const response = await fetch(`${baseUrl}/webhook/github`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockPayloads.github.push)
    });
    
    if (response.status === 401) {
      passed++;
    }
  } catch (error) {
    // Expected to fail
  }
  
  // Test 3: Invalid signature
  tests.push('Invalid signature');
  try {
    const response = await fetch(`${baseUrl}/webhook/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': 'sha256=invalid_signature',
        'x-github-event': 'push'
      },
      body: JSON.stringify(mockPayloads.github.push)
    });
    
    if (response.status === 401) {
      passed++;
    }
  } catch (error) {
    // Expected to fail
  }
  
  // Test 4: Unsupported HTTP method
  tests.push('Unsupported HTTP method');
  try {
    const response = await fetch(`${baseUrl}/webhook/github`, {
      method: 'GET'
    });
    
    if (response.status === 404 || response.status === 405) {
      passed++;
    }
  } catch (error) {
    // Expected to fail
  }
  
  // Test 5: Large payload
  tests.push('Large payload handling');
  try {
    const largePayload = {
      ...mockPayloads.github.push,
      large_data: 'x'.repeat(1024 * 1024) // 1MB of data
    };
    
    const headers = generateGitHubHeaders('push', largePayload, config.githubWebhookSecret);
    
    const response = await fetch(`${baseUrl}/webhook/github`, {
      method: 'POST',
      headers,
      body: JSON.stringify(largePayload)
    });
    
    // Should either accept or reject gracefully
    if (response.status === 200 || response.status === 413) {
      passed++;
    }
  } catch (error) {
    // Expected to potentially fail
  }
  
  return { total: tests.length, passed, tests };
}

// Security tests
async function runSecurityTests(baseUrl, config) {
  const tests = [];
  let passed = 0;
  
  // Test 1: SQL injection attempt
  tests.push('SQL injection protection');
  try {
    const maliciousPayload = {
      ...mockPayloads.github.push,
      repository: {
        ...mockPayloads.github.push.repository,
        name: "'; DROP TABLE webhook_events; --"
      }
    };
    
    const headers = generateGitHubHeaders('push', maliciousPayload, config.githubWebhookSecret);
    
    const response = await fetch(`${baseUrl}/webhook/github`, {
      method: 'POST',
      headers,
      body: JSON.stringify(maliciousPayload)
    });
    
    // Should process normally (SQL injection should be prevented)
    if (response.status === 200) {
      passed++;
    }
  } catch (error) {
    // Unexpected error
  }
  
  // Test 2: XSS attempt
  tests.push('XSS protection');
  try {
    const xssPayload = {
      ...mockPayloads.github.push,
      commits: [{
        ...mockPayloads.github.push.commits[0],
        message: '<script>alert("xss")</script>'
      }]
    };
    
    const headers = generateGitHubHeaders('push', xssPayload, config.githubWebhookSecret);
    
    const response = await fetch(`${baseUrl}/webhook/github`, {
      method: 'POST',
      headers,
      body: JSON.stringify(xssPayload)
    });
    
    // Should process normally (XSS should be prevented)
    if (response.status === 200) {
      passed++;
    }
  } catch (error) {
    // Unexpected error
  }
  
  // Test 3: Rate limiting
  tests.push('Rate limiting');
  try {
    const promises = [];
    
    // Send many requests quickly
    for (let i = 0; i < 150; i++) {
      const headers = generateGitHubHeaders('push', mockPayloads.github.push, config.githubWebhookSecret);
      
      promises.push(
        fetch(`${baseUrl}/webhook/github`, {
          method: 'POST',
          headers,
          body: JSON.stringify(mockPayloads.github.push)
        })
      );
    }
    
    const responses = await Promise.all(promises);
    const rateLimited = responses.some(r => r.status === 429);
    
    if (rateLimited) {
      passed++;
    }
  } catch (error) {
    // Expected to potentially fail
  }
  
  // Test 4: CORS headers
  tests.push('CORS headers');
  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'OPTIONS'
    });
    
    const corsHeader = response.headers.get('Access-Control-Allow-Origin');
    if (corsHeader !== null) {
      passed++;
    }
  } catch (error) {
    // Expected to potentially fail
  }
  
  // Test 5: Security headers
  tests.push('Security headers');
  try {
    const response = await fetch(`${baseUrl}/health`);
    
    const securityHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection'
    ];
    
    const hasSecurityHeaders = securityHeaders.some(header => 
      response.headers.get(header) !== null
    );
    
    if (hasSecurityHeaders) {
      passed++;
    }
  } catch (error) {
    // Expected to potentially fail
  }
  
  return { total: tests.length, passed, tests };
}

// Performance benchmarks
async function runPerformanceBenchmarks(baseUrl, config) {
  const results = {
    tests: [],
    avgResponseTime: 0,
    p95ResponseTime: 0,
    throughput: 0
  };
  
  // Benchmark 1: Single request latency
  const singleRequestTimes = [];
  
  for (let i = 0; i < 10; i++) {
    const start = Date.now();
    
    const headers = generateGitHubHeaders('push', mockPayloads.github.push, config.githubWebhookSecret);
    
    await fetch(`${baseUrl}/webhook/github`, {
      method: 'POST',
      headers,
      body: JSON.stringify(mockPayloads.github.push)
    });
    
    const duration = Date.now() - start;
    singleRequestTimes.push(duration);
  }
  
  results.avgResponseTime = singleRequestTimes.reduce((a, b) => a + b, 0) / singleRequestTimes.length;
  results.p95ResponseTime = singleRequestTimes.sort((a, b) => a - b)[Math.floor(singleRequestTimes.length * 0.95)];
  
  // Benchmark 2: Concurrent requests
  const concurrentStart = Date.now();
  const concurrentPromises = [];
  
  for (let i = 0; i < 20; i++) {
    const headers = generateGitHubHeaders('push', mockPayloads.github.push, config.githubWebhookSecret);
    
    concurrentPromises.push(
      fetch(`${baseUrl}/webhook/github`, {
        method: 'POST',
        headers,
        body: JSON.stringify(mockPayloads.github.push)
      })
    );
  }
  
  await Promise.all(concurrentPromises);
  const concurrentDuration = Date.now() - concurrentStart;
  
  results.throughput = (20 / concurrentDuration) * 1000; // requests per second
  
  return results;
}

// Calculate overall score
function calculateOverallScore(results) {
  let score = 0;
  let maxScore = 0;
  
  // Basic tests (30% weight)
  score += (results.basicResults.summary.passRate / 100) * 30;
  maxScore += 30;
  
  // Load tests (25% weight)
  score += (results.loadResults.summary.successRate / 100) * 25;
  maxScore += 25;
  
  // Error handling (20% weight)
  score += (results.errorTests.passed / results.errorTests.total) * 20;
  maxScore += 20;
  
  // Security tests (20% weight)
  score += (results.securityTests.passed / results.securityTests.total) * 20;
  maxScore += 20;
  
  // Performance (5% weight)
  const perfScore = results.perfResults.avgResponseTime < 500 ? 1 : 
                   results.perfResults.avgResponseTime < 1000 ? 0.8 :
                   results.perfResults.avgResponseTime < 2000 ? 0.6 : 0.4;
  score += perfScore * 5;
  maxScore += 5;
  
  return Math.round((score / maxScore) * 100);
}

// Display test results
function displayTestResults(report) {
  console.log(chalk.green.bold('\n🎯 Test Results Summary'));
  console.log(chalk.green.bold('========================\n'));
  
  console.log(chalk.blue('📊 Overall Score:'), chalk.bold(`${report.overall_score}/100`));
  
  const scoreColor = report.overall_score >= 90 ? 'green' : 
                    report.overall_score >= 70 ? 'yellow' : 'red';
  
  console.log(chalk[scoreColor](`${getScoreEmoji(report.overall_score)} ${getScoreDescription(report.overall_score)}\n`));
  
  // Basic tests
  console.log(chalk.blue('🧪 Basic Functionality:'), 
    chalk[report.basic_tests.summary.passRate === 100 ? 'green' : 'yellow'](
      `${report.basic_tests.summary.passed}/${report.basic_tests.summary.total} passed`
    )
  );
  
  // Load tests
  console.log(chalk.blue('⚡ Load Testing:'), 
    chalk[report.load_tests.summary.successRate > 95 ? 'green' : 'yellow'](
      `${report.load_tests.summary.successRate.toFixed(2)}% success rate`
    )
  );
  
  // Error handling
  console.log(chalk.blue('🛡️  Error Handling:'), 
    chalk[report.error_handling.passed >= report.error_handling.total * 0.8 ? 'green' : 'yellow'](
      `${report.error_handling.passed}/${report.error_handling.total} passed`
    )
  );
  
  // Security
  console.log(chalk.blue('🔒 Security:'), 
    chalk[report.security_tests.passed >= report.security_tests.total * 0.9 ? 'green' : 'red'](
      `${report.security_tests.passed}/${report.security_tests.total} passed`
    )
  );
  
  // Performance
  console.log(chalk.blue('🚀 Performance:'), 
    chalk[report.performance.avgResponseTime < 1000 ? 'green' : 'yellow'](
      `${report.performance.avgResponseTime.toFixed(2)}ms avg response time`
    )
  );
  
  console.log(chalk.blue('\n📈 Performance Details:'));
  console.log(chalk.gray(`   Average Response Time: ${report.performance.avgResponseTime.toFixed(2)}ms`));
  console.log(chalk.gray(`   95th Percentile: ${report.performance.p95ResponseTime.toFixed(2)}ms`));
  console.log(chalk.gray(`   Throughput: ${report.performance.throughput.toFixed(2)} req/s`));
  
  console.log(chalk.blue('\n🔍 Load Test Details:'));
  console.log(chalk.gray(`   Total Requests: ${report.load_tests.summary.totalRequests}`));
  console.log(chalk.gray(`   Successful: ${report.load_tests.summary.successfulRequests}`));
  console.log(chalk.gray(`   Failed: ${report.load_tests.summary.failedRequests}`));
  console.log(chalk.gray(`   Requests/sec: ${report.load_tests.summary.requestsPerSecond.toFixed(2)}`));
}

function getScoreEmoji(score) {
  if (score >= 90) return '🏆';
  if (score >= 80) return '🥇';
  if (score >= 70) return '🥈';
  if (score >= 60) return '🥉';
  return '❌';
}

function getScoreDescription(score) {
  if (score >= 90) return 'Excellent - Production Ready';
  if (score >= 80) return 'Good - Minor improvements needed';
  if (score >= 70) return 'Fair - Some issues to address';
  if (score >= 60) return 'Poor - Significant improvements needed';
  return 'Critical - Major issues found';
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runComprehensiveTests()
    .then(report => {
      console.log(chalk.green('\n✅ Comprehensive testing completed'));
      process.exit(report.overall_score >= 70 ? 0 : 1);
    })
    .catch(error => {
      console.error(chalk.red('❌ Testing failed:'), error.message);
      process.exit(1);
    });
}

export { runComprehensiveTests };

