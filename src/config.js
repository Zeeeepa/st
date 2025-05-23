// src/config.js
export function getConfig(env) {
  return {
    // Supabase configuration
    supabaseUrl: env.SUPABASE_URL,
    supabaseKey: env.SUPABASE_SERVICE_KEY,
    
    // Webhook secrets
    githubWebhookSecret: env.GITHUB_WEBHOOK_SECRET,
    linearWebhookSecret: env.LINEAR_WEBHOOK_SECRET,
    slackSigningSecret: env.SLACK_SIGNING_SECRET,
    
    // Feature flags
    debug: env.DEBUG === 'true',
    enableBatching: env.ENABLE_BATCHING !== 'false', // Default to true
    enableMetrics: env.ENABLE_METRICS !== 'false', // Default to true
    enableRetry: env.ENABLE_RETRY !== 'false', // Default to true
    
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
    
    // Worker identification
    workerId: env.WORKER_ID || 'webhook-gateway',
    workerEnvironment: env.WORKER_ENVIRONMENT || 'production'
  };
}

// Environment variable validation
export function validateConfig(config) {
  const required = [
    'supabaseUrl',
    'supabaseKey'
  ];
  
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
  
  // Validate URLs
  try {
    new URL(config.supabaseUrl);
  } catch (error) {
    throw new Error('Invalid SUPABASE_URL format');
  }
  
  // Validate numeric values
  const numericFields = [
    'batchSize',
    'batchInterval',
    'maxRetries',
    'retryDelay',
    'rateLimitWindow',
    'rateLimitMaxRequests',
    'dataRetentionDays'
  ];
  
  for (const field of numericFields) {
    if (isNaN(config[field]) || config[field] < 0) {
      throw new Error(`Invalid ${field} value: ${config[field]}`);
    }
  }
  
  return true;
}