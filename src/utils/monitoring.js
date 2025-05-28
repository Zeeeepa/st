// src/utils/monitoring.js - Enhanced Monitoring and Alerting System
import { EventEmitter } from 'events';

class MonitoringSystem extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        rate: 0,
        avgResponseTime: 0
      },
      events: {
        total: 0,
        processed: 0,
        failed: 0,
        duplicated: 0,
        rate: 0
      },
      database: {
        connections: 0,
        queries: 0,
        errors: 0,
        avgQueryTime: 0
      },
      system: {
        uptime: 0,
        memory: 0,
        cpu: 0
      }
    };
    
    this.alerts = [];
    this.thresholds = {
      errorRate: 0.05, // 5% error rate
      responseTime: 5000, // 5 seconds
      memoryUsage: 0.9, // 90% memory usage
      diskSpace: 0.9, // 90% disk usage
      queueSize: 1000, // 1000 events in queue
      dbConnections: 18 // 90% of max connections (20)
    };
    
    this.startTime = Date.now();
    this.lastMetricsUpdate = Date.now();
    
    // Start monitoring intervals
    this.startMonitoring();
  }
  
  startMonitoring() {
    // Update system metrics every 30 seconds
    setInterval(() => {
      this.updateSystemMetrics();
      this.checkThresholds();
    }, 30000);
    
    // Calculate rates every minute
    setInterval(() => {
      this.calculateRates();
    }, 60000);
    
    // Cleanup old alerts every hour
    setInterval(() => {
      this.cleanupOldAlerts();
    }, 3600000);
  }
  
  // Record request metrics
  recordRequest(duration, success = true) {
    this.metrics.requests.total++;
    if (success) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }
    
    // Update average response time
    this.metrics.requests.avgResponseTime = 
      (this.metrics.requests.avgResponseTime + duration) / 2;
  }
  
  // Record event metrics
  recordEvent(type = 'processed', source = null) {
    this.metrics.events.total++;
    this.metrics.events[type]++;
    
    this.emit('event_recorded', { type, source, timestamp: Date.now() });
  }
  
  // Record database metrics
  recordDatabaseQuery(duration, success = true) {
    this.metrics.database.queries++;
    if (!success) {
      this.metrics.database.errors++;
    }
    
    // Update average query time
    this.metrics.database.avgQueryTime = 
      (this.metrics.database.avgQueryTime + duration) / 2;
  }
  
  // Update system metrics
  updateSystemMetrics() {
    const now = Date.now();
    this.metrics.system.uptime = Math.floor((now - this.startTime) / 1000);
    
    // Memory usage
    const memUsage = process.memoryUsage();
    this.metrics.system.memory = memUsage.heapUsed / memUsage.heapTotal;
    
    // CPU usage (simplified)
    const cpuUsage = process.cpuUsage();
    this.metrics.system.cpu = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
  }
  
  // Calculate rates
  calculateRates() {
    const now = Date.now();
    const timeDiff = (now - this.lastMetricsUpdate) / 1000; // seconds
    
    // Request rate (requests per second)
    this.metrics.requests.rate = this.metrics.requests.total / timeDiff;
    
    // Event rate (events per second)
    this.metrics.events.rate = this.metrics.events.total / timeDiff;
    
    this.lastMetricsUpdate = now;
  }
  
  // Check thresholds and create alerts
  checkThresholds() {
    const now = Date.now();
    
    // Error rate threshold
    const errorRate = this.metrics.requests.failed / this.metrics.requests.total;
    if (errorRate > this.thresholds.errorRate) {
      this.createAlert('high_error_rate', `Error rate is ${(errorRate * 100).toFixed(2)}%`, 'warning');
    }
    
    // Response time threshold
    if (this.metrics.requests.avgResponseTime > this.thresholds.responseTime) {
      this.createAlert('slow_response', `Average response time is ${this.metrics.requests.avgResponseTime}ms`, 'warning');
    }
    
    // Memory usage threshold
    if (this.metrics.system.memory > this.thresholds.memoryUsage) {
      this.createAlert('high_memory', `Memory usage is ${(this.metrics.system.memory * 100).toFixed(2)}%`, 'critical');
    }
    
    // Database connection threshold
    if (this.metrics.database.connections > this.thresholds.dbConnections) {
      this.createAlert('high_db_connections', `Database connections: ${this.metrics.database.connections}`, 'warning');
    }
  }
  
  // Create alert
  createAlert(type, message, severity = 'info') {
    const alert = {
      id: `${type}_${Date.now()}`,
      type,
      message,
      severity,
      timestamp: new Date().toISOString(),
      acknowledged: false
    };
    
    this.alerts.push(alert);
    this.emit('alert_created', alert);
    
    // Log alert
    const logLevel = severity === 'critical' ? 'error' : severity === 'warning' ? 'warn' : 'info';
    console[logLevel](`🚨 ALERT [${severity.toUpperCase()}]: ${message}`);
    
    return alert;
  }
  
  // Acknowledge alert
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
      this.emit('alert_acknowledged', alert);
      return true;
    }
    return false;
  }
  
  // Get active alerts
  getActiveAlerts() {
    return this.alerts.filter(alert => !alert.acknowledged);
  }
  
  // Get all alerts
  getAllAlerts(limit = 100) {
    return this.alerts
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }
  
  // Cleanup old alerts
  cleanupOldAlerts() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    this.alerts = this.alerts.filter(alert => 
      new Date(alert.timestamp).getTime() > cutoff
    );
  }
  
  // Get comprehensive metrics
  getMetrics() {
    return {
      ...this.metrics,
      alerts: {
        total: this.alerts.length,
        active: this.getActiveAlerts().length,
        critical: this.alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length,
        warning: this.alerts.filter(a => a.severity === 'warning' && !a.acknowledged).length
      },
      thresholds: this.thresholds,
      timestamp: new Date().toISOString()
    };
  }
  
  // Health check
  getHealthStatus() {
    const activeAlerts = this.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
    
    let status = 'healthy';
    if (criticalAlerts.length > 0) {
      status = 'critical';
    } else if (activeAlerts.length > 0) {
      status = 'warning';
    }
    
    return {
      status,
      uptime: this.metrics.system.uptime,
      alerts: {
        total: activeAlerts.length,
        critical: criticalAlerts.length,
        warning: activeAlerts.filter(a => a.severity === 'warning').length
      },
      metrics: this.metrics,
      timestamp: new Date().toISOString()
    };
  }
  
  // Performance report
  getPerformanceReport() {
    const now = Date.now();
    const uptimeHours = this.metrics.system.uptime / 3600;
    
    return {
      uptime: {
        seconds: this.metrics.system.uptime,
        hours: uptimeHours,
        days: uptimeHours / 24
      },
      requests: {
        total: this.metrics.requests.total,
        rate: this.metrics.requests.rate,
        successRate: this.metrics.requests.successful / this.metrics.requests.total,
        errorRate: this.metrics.requests.failed / this.metrics.requests.total,
        avgResponseTime: this.metrics.requests.avgResponseTime
      },
      events: {
        total: this.metrics.events.total,
        rate: this.metrics.events.rate,
        successRate: this.metrics.events.processed / this.metrics.events.total,
        duplicateRate: this.metrics.events.duplicated / this.metrics.events.total
      },
      database: {
        queries: this.metrics.database.queries,
        errorRate: this.metrics.database.errors / this.metrics.database.queries,
        avgQueryTime: this.metrics.database.avgQueryTime
      },
      system: {
        memoryUsage: this.metrics.system.memory,
        cpuUsage: this.metrics.system.cpu
      },
      timestamp: new Date().toISOString()
    };
  }
  
  // Reset metrics
  resetMetrics() {
    this.metrics = {
      requests: { total: 0, successful: 0, failed: 0, rate: 0, avgResponseTime: 0 },
      events: { total: 0, processed: 0, failed: 0, duplicated: 0, rate: 0 },
      database: { connections: 0, queries: 0, errors: 0, avgQueryTime: 0 },
      system: { uptime: 0, memory: 0, cpu: 0 }
    };
    this.startTime = Date.now();
    this.lastMetricsUpdate = Date.now();
  }
  
  // Export metrics for external monitoring systems
  exportMetrics(format = 'json') {
    const metrics = this.getMetrics();
    
    switch (format) {
      case 'prometheus':
        return this.exportPrometheusMetrics(metrics);
      case 'json':
      default:
        return JSON.stringify(metrics, null, 2);
    }
  }
  
  // Export metrics in Prometheus format
  exportPrometheusMetrics(metrics) {
    const lines = [];
    
    // Request metrics
    lines.push(`# HELP webhook_requests_total Total number of webhook requests`);
    lines.push(`# TYPE webhook_requests_total counter`);
    lines.push(`webhook_requests_total ${metrics.requests.total}`);
    
    lines.push(`# HELP webhook_requests_successful_total Total number of successful webhook requests`);
    lines.push(`# TYPE webhook_requests_successful_total counter`);
    lines.push(`webhook_requests_successful_total ${metrics.requests.successful}`);
    
    lines.push(`# HELP webhook_requests_failed_total Total number of failed webhook requests`);
    lines.push(`# TYPE webhook_requests_failed_total counter`);
    lines.push(`webhook_requests_failed_total ${metrics.requests.failed}`);
    
    lines.push(`# HELP webhook_request_duration_avg Average request duration in milliseconds`);
    lines.push(`# TYPE webhook_request_duration_avg gauge`);
    lines.push(`webhook_request_duration_avg ${metrics.requests.avgResponseTime}`);
    
    // Event metrics
    lines.push(`# HELP webhook_events_total Total number of webhook events`);
    lines.push(`# TYPE webhook_events_total counter`);
    lines.push(`webhook_events_total ${metrics.events.total}`);
    
    lines.push(`# HELP webhook_events_processed_total Total number of processed webhook events`);
    lines.push(`# TYPE webhook_events_processed_total counter`);
    lines.push(`webhook_events_processed_total ${metrics.events.processed}`);
    
    // System metrics
    lines.push(`# HELP webhook_system_uptime_seconds System uptime in seconds`);
    lines.push(`# TYPE webhook_system_uptime_seconds counter`);
    lines.push(`webhook_system_uptime_seconds ${metrics.system.uptime}`);
    
    lines.push(`# HELP webhook_system_memory_usage Memory usage ratio`);
    lines.push(`# TYPE webhook_system_memory_usage gauge`);
    lines.push(`webhook_system_memory_usage ${metrics.system.memory}`);
    
    // Alert metrics
    lines.push(`# HELP webhook_alerts_active_total Number of active alerts`);
    lines.push(`# TYPE webhook_alerts_active_total gauge`);
    lines.push(`webhook_alerts_active_total ${metrics.alerts.active}`);
    
    return lines.join('\n');
  }
}

// Circuit breaker implementation
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
  }
  
  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      } else {
        this.state = 'HALF_OPEN';
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
    }
  }
  
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt
    };
  }
}

export { MonitoringSystem, CircuitBreaker };

