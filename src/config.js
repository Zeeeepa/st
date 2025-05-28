// src/config.js - Enhanced Configuration for PostgreSQL Migration
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

export function getConfig(env = process.env) {
  return {
    // Server configuration
    port: parseInt(env.PORT || '3000'),
    host: env.HOST || 'localhost',
    nodeEnv: env.NODE_ENV || 'development',
    serverId: env.SERVER_ID || 'webhook-gateway-local',
    
    // PostgreSQL database configuration
    database: {
      host: env.DB_HOST || 'localhost',
      port: parseInt(env.DB_PORT || '5432'),
      name: env.DB_NAME || 'Events',
      user: env.DB_USER || 'postgres',
      password: env.DB_PASSWORD || 'password',
      ssl: env.DB_SSL === 'true' || false,
      maxConnections: parseInt(env.DB_MAX_CONNECTIONS || '20'),
      connectionTimeout: parseInt(env.DB_CONNECTION_TIMEOUT || '5000'),
      idleTimeout: parseInt(env.DB_IDLE_TIMEOUT || '30000')
    },
    
    // Legacy Supabase configuration (for migration compatibility)
    
    // Webhook secrets
    githubWebhookSecret: env.GITHUB_WEBHOOK_SECRET,
    linearWebhookSecret: env.LINEAR_WEBHOOK_SECRET,
    slackSigningSecret: env.SLACK_SIGNING_SECRET,
    
    // API tokens (optional)
    githubToken: env.GITHUB_TOKEN,
    linearToken: env.LINEAR_TOKEN,
    slackBotToken: env.SLACK_BOT_TOKEN,
    
    // Feature flags
    debug: env.DEBUG === 'true',
    enableBatching: env.ENABLE_BATCHING !== 'false', // Default to true
    enableMetrics: env.ENABLE_METRICS !== 'false', // Default to true
    enableRetry: env.ENABLE_RETRY !== 'false', // Default to true
    enableArchiving: env.ENABLE_ARCHIVING !== 'false', // Default to true
    enableRateLimit: env.ENABLE_RATE_LIMIT !== 'false', // Default to true
    
    // Performance settings
    batchSize: parseInt(env.BATCH_SIZE || '50'),
    batchInterval: parseInt(env.BATCH_INTERVAL || '5000'), // 5 seconds
    maxRetries: parseInt(env.MAX_RETRIES || '3'),
    retryDelay: parseInt(env.RETRY_DELAY || '500'), // 500ms
    
    // Rate limiting
    rateLimitWindow: parseInt(env.RATE_LIMIT_WINDOW || '60000'), // 1 minute
    rateLimitMaxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS || '100'),
    
    // Data retention
    dataRetentionDays: parseInt(env.DATA_RETENTION_DAYS || '90'),
    
    // Security settings
    enableCors: env.ENABLE_CORS !== 'false', // Default to true
    enableHelmet: env.ENABLE_HELMET !== 'false', // Default to true
    enableCompression: env.ENABLE_COMPRESSION !== 'false', // Default to true
    
    // Monitoring settings
    enableHealthCheck: env.ENABLE_HEALTH_CHECK !== 'false', // Default to true
    enableMetricsEndpoint: env.ENABLE_METRICS_ENDPOINT !== 'false', // Default to true
    healthCheckInterval: parseInt(env.HEALTH_CHECK_INTERVAL || '30000'), // 30 seconds
    
    // Legacy worker identification (for compatibility)
    workerId: env.WORKER_ID || env.SERVER_ID || 'webhook-gateway-local',
    workerEnvironment: env.WORKER_ENVIRONMENT || env.NODE_ENV || 'development'
  };
}

// Environment variable validation
export function validateConfig(config) {
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
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
  
  // Validate numeric values
  const numericFields = [
    'port', 'database.port', 'batchSize', 'batchInterval', 
    'maxRetries', 'retryDelay', 'rateLimitWindow', 'rateLimitMaxRequests',
    'dataRetentionDays', 'database.maxConnections', 'database.connectionTimeout',
    'database.idleTimeout', 'healthCheckInterval'
  ];
  
  for (const field of numericFields) {
    const value = field.split('.').reduce((obj, k) => obj?.[k], config);
    if (value !== undefined && (isNaN(value) || value < 0)) {
      throw new Error(`Invalid numeric value for ${field}: ${value}`);
    }
  }
  
  // Validate database connection parameters
  if (config.database.port < 1 || config.database.port > 65535) {
    throw new Error(`Invalid database port: ${config.database.port}`);
  }
  
  if (config.port < 1 || config.port > 65535) {
    throw new Error(`Invalid server port: ${config.port}`);
  }
  
  // Validate retention period
  if (config.dataRetentionDays < 1) {
    throw new Error(`Data retention days must be at least 1: ${config.dataRetentionDays}`);
  }
  
  // Validate batch settings
  if (config.batchSize < 1 || config.batchSize > 1000) {
    throw new Error(`Batch size must be between 1 and 1000: ${config.batchSize}`);
  }
  
  if (config.batchInterval < 100) {
    throw new Error(`Batch interval must be at least 100ms: ${config.batchInterval}`);
  }
  
  // Validate retry settings
  if (config.maxRetries < 0 || config.maxRetries > 10) {
    throw new Error(`Max retries must be between 0 and 10: ${config.maxRetries}`);
  }
  
  if (config.retryDelay < 100) {
    throw new Error(`Retry delay must be at least 100ms: ${config.retryDelay}`);
  }
  
  // Validate rate limiting
  if (config.rateLimitMaxRequests < 1) {
    throw new Error(`Rate limit max requests must be at least 1: ${config.rateLimitMaxRequests}`);
  }
  
  if (config.rateLimitWindow < 1000) {
    throw new Error(`Rate limit window must be at least 1000ms: ${config.rateLimitWindow}`);
  }
}

// Print configuration summary
export function printConfigSummary(config) {
  console.log('\n📋 Webhook Gateway Configuration Summary');
  console.log('==========================================');
  console.log(`🚀 Server: ${config.host}:${config.port}`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
  console.log(`🆔 Server ID: ${config.serverId}`);
  console.log(`🗄️  Database: ${config.database.host}:${config.database.port}/${config.database.name}`);
  console.log(`👤 DB User: ${config.database.user}`);
  console.log(`🔐 DB SSL: ${config.database.ssl ? 'enabled' : 'disabled'}`);
  console.log(`📦 Batching: ${config.enableBatching ? 'enabled' : 'disabled'} (size: ${config.batchSize}, interval: ${config.batchInterval}ms)`);
  console.log(`🔄 Retry: ${config.enableRetry ? 'enabled' : 'disabled'} (max: ${config.maxRetries}, delay: ${config.retryDelay}ms)`);
  console.log(`📊 Metrics: ${config.enableMetrics ? 'enabled' : 'disabled'}`);
  console.log(`🛡️  Rate Limiting: ${config.enableRateLimit ? 'enabled' : 'disabled'} (${config.rateLimitMaxRequests} req/${config.rateLimitWindow}ms)`);
  console.log(`🗂️  Data Retention: ${config.dataRetentionDays} days`);
  console.log(`🔍 Debug: ${config.debug ? 'enabled' : 'disabled'}`);
  
  // Security features
  const securityFeatures = [];
  if (config.enableCors) securityFeatures.push('CORS');
  if (config.enableHelmet) securityFeatures.push('Helmet');
  if (config.enableCompression) securityFeatures.push('Compression');
  console.log(`🔒 Security: ${securityFeatures.join(', ')}`);
  
  // Webhook secrets status
  const webhookSecrets = [];
  if (config.githubWebhookSecret) webhookSecrets.push('GitHub');
  if (config.linearWebhookSecret) webhookSecrets.push('Linear');
  if (config.slackSigningSecret) webhookSecrets.push('Slack');
  console.log(`🔑 Webhook Secrets: ${webhookSecrets.length > 0 ? webhookSecrets.join(', ') : 'None configured'}`);
  
  console.log('==========================================\n');
}

// Get database connection string (for external tools)
export function getDatabaseConnectionString(config) {
  const { host, port, name, user, password, ssl } = config.database;
  return `postgresql://${user}:${password}@${host}:${port}/${name}${ssl ? '?sslmode=require' : ''}`;
}

// Check if running in production
export function isProduction(config) {
  return config.nodeEnv === 'production';
}

// Check if running in development
export function isDevelopment(config) {
  return config.nodeEnv === 'development';
}

// Get webhook endpoint URLs
export function getWebhookEndpoints(config) {
  const baseUrl = `http${config.database.ssl ? 's' : ''}://${config.host}:${config.port}`;
  
  return {
    github: `${baseUrl}/webhook/github`,
    linear: `${baseUrl}/webhook/linear`,
    slack: `${baseUrl}/webhook/slack`,
    health: `${baseUrl}/health`,
    metrics: `${baseUrl}/metrics`
  };
}
