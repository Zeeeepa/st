// src/config.js - Configuration Management for Local PostgreSQL Setup
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Get configuration from environment variables
 */
export function getConfig() {
  return {
    // Server Configuration
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || 'localhost',
    environment: process.env.NODE_ENV || 'development',
    serverId: process.env.SERVER_ID || 'webhook-gateway',
    
    // Database Configuration (PostgreSQL)
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      name: process.env.DB_NAME || 'Events',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    },
    
    // GitHub Configuration
    githubToken: process.env.GITHUB_TOKEN,
    githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
    
    // Linear Configuration
    linearApiKey: process.env.LINEAR_API_KEY,
    linearWebhookSecret: process.env.LINEAR_WEBHOOK_SECRET,
    
    // Slack Configuration
    slackBotToken: process.env.SLACK_BOT_TOKEN,
    slackSigningSecret: process.env.SLACK_SIGNING_SECRET,
    slackAppId: process.env.SLACK_APP_ID,
    
    // Processing Configuration
    debug: process.env.DEBUG === 'true',
    enableBatching: process.env.ENABLE_BATCHING !== 'false',
    enableMetrics: process.env.ENABLE_METRICS !== 'false',
    enableRetry: process.env.ENABLE_RETRY !== 'false',
    batchSize: parseInt(process.env.BATCH_SIZE) || 50,
    batchInterval: parseInt(process.env.BATCH_INTERVAL) || 5000,
    maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
    retryDelay: parseInt(process.env.RETRY_DELAY) || 500,
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000,
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS) || 90
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config) {
  const errors = [];
  
  // Validate database configuration
  if (!config.database.host) {
    errors.push('DB_HOST is required');
  }
  
  if (!config.database.user) {
    errors.push('DB_USER is required');
  }
  
  if (!config.database.password) {
    errors.push('DB_PASSWORD is required');
  }
  
  if (!config.database.name) {
    errors.push('DB_NAME is required');
  }
  
  // Validate port
  if (isNaN(config.port) || config.port < 1 || config.port > 65535) {
    errors.push('PORT must be a valid port number (1-65535)');
  }
  
  // Validate batch configuration
  if (config.enableBatching) {
    if (isNaN(config.batchSize) || config.batchSize < 1) {
      errors.push('BATCH_SIZE must be a positive number');
    }
    
    if (isNaN(config.batchInterval) || config.batchInterval < 100) {
      errors.push('BATCH_INTERVAL must be at least 100ms');
    }
  }
  
  // Validate retry configuration
  if (config.enableRetry) {
    if (isNaN(config.maxRetries) || config.maxRetries < 0) {
      errors.push('MAX_RETRIES must be a non-negative number');
    }
    
    if (isNaN(config.retryDelay) || config.retryDelay < 0) {
      errors.push('RETRY_DELAY must be a non-negative number');
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
  
  return true;
}

/**
 * Get webhook endpoint URLs
 */
export function getWebhookEndpoints(config) {
  const baseUrl = `http://${config.host}:${config.port}`;
  
  return {
    github: `${baseUrl}/webhook/github`,
    linear: `${baseUrl}/webhook/linear`,
    slack: `${baseUrl}/webhook/slack`,
    health: `${baseUrl}/health`,
    metrics: `${baseUrl}/metrics`
  };
}

/**
 * Print configuration summary
 */
export function printConfigSummary(config) {
  const endpoints = getWebhookEndpoints(config);
  
  console.log('\n📋 Configuration Summary:');
  console.log('========================');
  console.log(`🌐 Server: http://${config.host}:${config.port}`);
  console.log(`🗄️  Database: PostgreSQL (${config.database.host}:${config.database.port}/${config.database.name})`);
  console.log(`👤 DB User: ${config.database.user}`);
  console.log(`🔧 Environment: ${config.environment}`);
  console.log(`📦 Batching: ${config.enableBatching ? 'Enabled' : 'Disabled'}`);
  console.log(`📊 Metrics: ${config.enableMetrics ? 'Enabled' : 'Disabled'}`);
  console.log(`🔄 Retry: ${config.enableRetry ? 'Enabled' : 'Disabled'}`);
  console.log(`🐛 Debug: ${config.debug ? 'Enabled' : 'Disabled'}`);
  
  console.log('\n🔗 Webhook Endpoints:');
  console.log('=====================');
  console.log(`📱 GitHub: ${endpoints.github}`);
  console.log(`📋 Linear: ${endpoints.linear}`);
  console.log(`💬 Slack: ${endpoints.slack}`);
  console.log(`❤️  Health: ${endpoints.health}`);
  console.log(`📈 Metrics: ${endpoints.metrics}`);
  
  if (config.enableBatching) {
    console.log('\n⚡ Batch Configuration:');
    console.log('======================');
    console.log(`📦 Batch Size: ${config.batchSize} events`);
    console.log(`⏱️  Batch Interval: ${config.batchInterval}ms`);
  }
  
  if (config.enableRetry) {
    console.log('\n🔄 Retry Configuration:');
    console.log('======================');
    console.log(`🔢 Max Retries: ${config.maxRetries}`);
    console.log(`⏱️  Retry Delay: ${config.retryDelay}ms`);
  }
  
  console.log('\n');
}
