// src/utils/supabase.js
let supabaseClient = null;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;
const BATCH_SIZE = 100;
const DEDUPLICATION_WINDOW_MS = 5000; // 5 seconds

// In-memory cache for deduplication
const eventCache = new Map();
const CACHE_CLEANUP_INTERVAL = 60000; // 1 minute

/**
 * Initialize the Supabase client with enhanced error handling
 */
export function initSupabase(config) {
  if (!config.supabaseUrl || !config.supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  const customFetch = async (...args) => {
    try {
      return await fetch(...args);
    } catch (error) {
      console.error(`Network error during Supabase operation: ${error.message}`);
      throw new Error(`Supabase network error: ${error.message}`);
    }
  };
  
  supabaseClient = {
    url: config.supabaseUrl,
    key: config.supabaseKey,
    fetch: customFetch,
    
    from: (table) => ({
      insert: async (data, options = {}) => {
        // Validate data before insertion
        if (!data || (Array.isArray(data) && data.length === 0)) {
          throw new Error('Cannot insert empty data');
        }
        
        return await retryOperation(async () => {
          const response = await customFetch(`${config.supabaseUrl}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.supabaseKey}`,
              'apikey': config.supabaseKey,
              'Prefer': options.returning ? 'return=representation' : 'return=minimal'
            },
            body: JSON.stringify(data)
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Supabase error (${response.status}): ${errorText}`);
          }
          
          return options.returning ? await response.json() : { status: response.status };
        });
      },
      
      select: async (columns = '*', options = {}) => {
        return await retryOperation(async () => {
          let url = `${config.supabaseUrl}/rest/v1/${table}?select=${columns}`;
          
          if (options.filters) {
            for (const [key, value] of Object.entries(options.filters)) {
              url += `&${key}=${encodeURIComponent(value)}`;
            }
          }
          
          // Add pagination support
          if (options.limit) {
            url += `&limit=${options.limit}`;
          }
          
          if (options.offset) {
            url += `&offset=${options.offset}`;
          }
          
          // Add ordering
          if (options.orderBy) {
            url += `&order=${options.orderBy}`;
          }
          
          const response = await customFetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${config.supabaseKey}`,
              'apikey': config.supabaseKey
            }
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Supabase error (${response.status}): ${errorText}`);
          }
          
          return await response.json();
        });
      },
      
      update: async (data, options = {}) => {
        if (!data || Object.keys(data).length === 0) {
          throw new Error('Cannot update with empty data');
        }
        
        return await retryOperation(async () => {
          let url = `${config.supabaseUrl}/rest/v1/${table}`;
          if (options.match) {
            url += '?';
            for (const [key, value] of Object.entries(options.match)) {
              url += `${key}=eq.${encodeURIComponent(value)}&`;
            }
            url = url.slice(0, -1);
          }
          
          const response = await customFetch(url, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.supabaseKey}`,
              'apikey': config.supabaseKey,
              'Prefer': options.returning ? 'return=representation' : 'return=minimal'
            },
            body: JSON.stringify(data)
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Supabase error (${response.status}): ${errorText}`);
          }
          
          return options.returning ? await response.json() : { status: response.status };
        });
      },
      
      delete: async (options = {}) => {
        if (!options.match || Object.keys(options.match).length === 0) {
          throw new Error('Delete operation requires match criteria');
        }
        
        return await retryOperation(async () => {
          let url = `${config.supabaseUrl}/rest/v1/${table}?`;
          for (const [key, value] of Object.entries(options.match)) {
            url += `${key}=eq.${encodeURIComponent(value)}&`;
          }
          url = url.slice(0, -1);
          
          const response = await customFetch(url, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${config.supabaseKey}`,
              'apikey': config.supabaseKey,
              'Prefer': options.returning ? 'return=representation' : 'return=minimal'
            }
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Supabase error (${response.status}): ${errorText}`);
          }
          
          return options.returning ? await response.json() : { status: response.status };
        });
      },
      
      count: async (options = {}) => {
        return await retryOperation(async () => {
          let url = `${config.supabaseUrl}/rest/v1/${table}?select=count`;
          
          if (options.filters) {
            for (const [key, value] of Object.entries(options.filters)) {
              url += `&${key}=${encodeURIComponent(value)}`;
            }
          }
          
          const response = await customFetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${config.supabaseKey}`,
              'apikey': config.supabaseKey,
              'Prefer': 'count=exact'
            }
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Supabase error (${response.status}): ${errorText}`);
          }
          
          const result = await response.json();
          return parseInt(response.headers.get('content-range')?.split('/')[1] || '0');
        });
      },
      
      upsert: async (data, options = {}) => {
        if (!data || (Array.isArray(data) && data.length === 0)) {
          throw new Error('Cannot upsert empty data');
        }
        
        return await retryOperation(async () => {
          let url = `${config.supabaseUrl}/rest/v1/${table}`;
          
          // Add upsert parameters
          url += '?on_conflict=' + (options.onConflict || 'id');
          
          const response = await customFetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.supabaseKey}`,
              'apikey': config.supabaseKey,
              'Prefer': `resolution=merge-duplicates${options.returning ? ',return=representation' : ''}`
            },
            body: JSON.stringify(data)
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Supabase error (${response.status}): ${errorText}`);
          }
          
          return options.returning ? await response.json() : { status: response.status };
        });
      }
    }),
    
    rpc: async (functionName, params = {}) => {
      return await retryOperation(async () => {
        const response = await customFetch(`${config.supabaseUrl}/rest/v1/rpc/${functionName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.supabaseKey}`,
            'apikey': config.supabaseKey
          },
          body: JSON.stringify(params)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Supabase RPC error (${response.status}): ${errorText}`);
        }
        
        return await response.json();
      });
    }
  };
  
  // Start cache cleanup interval
  startCacheCleanup();
  
  return supabaseClient;
}

/**
 * Retry an operation with exponential backoff
 */
async function retryOperation(operation, maxRetries = MAX_RETRIES) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(`Operation failed (attempt ${attempt + 1}/${maxRetries}): ${error.message}`);
      
      // Don't retry for client errors (4xx)
      if (error.message.includes('error (4')) {
        break;
      }
      
      // Exponential backoff
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Get or create the Supabase client
 */
export function getSupabaseClient(config) {
  if (!supabaseClient && config) {
    return initSupabase(config);
  }
  
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized. Call initSupabase first.');
  }
  
  return supabaseClient;
}

/**
 * Generate event fingerprint for deduplication
 */
function generateEventFingerprint(eventData) {
  const key = `${eventData.source}_${eventData.event_type}_${eventData.repository || ''}_${eventData.actor || ''}_${eventData.payload?.id || ''}`;
  return key;
}

/**
 * Check if event is duplicate
 */
function isDuplicateEvent(eventData) {
  const fingerprint = generateEventFingerprint(eventData);
  const cachedTime = eventCache.get(fingerprint);
  
  if (cachedTime && (Date.now() - cachedTime) < DEDUPLICATION_WINDOW_MS) {
    return true;
  }
  
  eventCache.set(fingerprint, Date.now());
  return false;
}

/**
 * Clean up old entries from event cache
 */
function startCacheCleanup() {
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of eventCache.entries()) {
      if (now - timestamp > DEDUPLICATION_WINDOW_MS) {
        eventCache.delete(key);
      }
    }
  }, CACHE_CLEANUP_INTERVAL);
}

/**
 * Store an event in Supabase with enhanced features
 */
export async function storeEvent(eventData, config) {
  try {
    // Validate required fields
    if (!eventData.source) throw new Error('Event source is required');
    if (!eventData.event_type) throw new Error('Event type is required');
    if (!eventData.payload) throw new Error('Event payload is required');
    
    // Add timestamp if not provided
    if (!eventData.created_at) {
      eventData.created_at = new Date().toISOString();
    }
    
    // Check for duplicate events
    if (isDuplicateEvent(eventData)) {
      console.warn('Duplicate event detected, skipping storage');
      return {
        success: true,
        duplicate: true
      };
    }
    
    // Initialize Supabase if needed
    if (!supabaseClient) {
      initSupabase(config);
    }
    
    // Add enhanced fields
    const enhancedEventData = {
      ...eventData,
      processed_at: new Date().toISOString(),
      version: '2.0' // Schema version for future migrations
    };
    
    // Store the event
    const result = await supabaseClient.from('webhook_events').insert(enhancedEventData, {
      returning: true
    });
    
    // Track metrics
    await updateEventMetrics(eventData.source, eventData.event_type, config);
    
    return {
      success: true,
      id: result[0]?.id,
      duplicate: false
    };
  } catch (error) {
    console.error('Error storing event in Supabase:', error);
    
    // Store failed event for retry
    await storeFailedEvent(eventData, error.message, config);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Store multiple events in a batch with optimizations
 */
export async function storeBatchEvents(eventsData, config) {
  if (!Array.isArray(eventsData) || eventsData.length === 0) {
    return {
      success: false,
      error: 'No events provided for batch storage'
    };
  }
  
  try {
    // Initialize Supabase if needed
    if (!supabaseClient) {
      initSupabase(config);
    }
    
    const results = {
      success: true,
      stored: [],
      duplicates: [],
      failed: []
    };
    
    // Process events in chunks
    for (let i = 0; i < eventsData.length; i += BATCH_SIZE) {
      const chunk = eventsData.slice(i, i + BATCH_SIZE);
      const validEvents = [];
      
      // Validate and filter events
      for (const event of chunk) {
        try {
          if (!event.source) throw new Error('Missing source');
          if (!event.event_type) throw new Error('Missing event_type');
          if (!event.payload) throw new Error('Missing payload');
          
          // Add timestamp if not provided
          if (!event.created_at) {
            event.created_at = new Date().toISOString();
          }
          
          // Check for duplicates
          if (isDuplicateEvent(event)) {
            results.duplicates.push(event);
            continue;
          }
          
          // Add enhanced fields
          validEvents.push({
            ...event,
            processed_at: new Date().toISOString(),
            version: '2.0'
          });
        } catch (error) {
          results.failed.push({
            event,
            error: error.message
          });
        }
      }
      
      // Store valid events
      if (validEvents.length > 0) {
        try {
          const insertResult = await supabaseClient.from('webhook_events').insert(validEvents, {
            returning: true
          });
          
          results.stored.push(...insertResult);
          
          // Update metrics for each event type
          const metricsUpdates = {};
          for (const event of validEvents) {
            const key = `${event.source}_${event.event_type}`;
            metricsUpdates[key] = (metricsUpdates[key] || 0) + 1;
          }
          
          for (const [key, count] of Object.entries(metricsUpdates)) {
            const [source, eventType] = key.split('_');
            await updateEventMetrics(source, eventType, config, count);
          }
        } catch (error) {
          console.error('Error storing batch chunk:', error);
          results.failed.push(...validEvents.map(event => ({
            event,
            error: error.message
          })));
        }
      }
    }
    
    // Store failed events for retry
    if (results.failed.length > 0) {
      await Promise.all(
        results.failed.map(({ event, error }) => 
          storeFailedEvent(event, error, config)
        )
      );
    }
    
    return results;
  } catch (error) {
    console.error('Error in batch storage:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Store failed events for later retry
 */
async function storeFailedEvent(eventData, errorMessage, config) {
  try {
    if (!supabaseClient) {
      initSupabase(config);
    }
    
    await supabaseClient.from('webhook_events_failed').insert({
      source: eventData.source,
      event_type: eventData.event_type,
      payload: eventData.payload,
      error_message: errorMessage,
      original_data: eventData,
      failed_at: new Date().toISOString(),
      retry_count: 0
    });
  } catch (error) {
    console.error('Error storing failed event:', error);
  }
}

/**
 * Update event metrics
 */
async function updateEventMetrics(source, eventType, config, count = 1) {
  try {
    if (!supabaseClient) {
      initSupabase(config);
    }
    
    // Use RPC function to increment metrics atomically
    await supabaseClient.rpc('increment_event_metrics', {
      p_source: source,
      p_event_type: eventType,
      p_count: count
    });
  } catch (error) {
    console.error('Error updating metrics:', error);
  }
}

/**
 * Retry failed events
 */
export async function retryFailedEvents(config, maxRetries = 3) {
  try {
    if (!supabaseClient) {
      initSupabase(config);
    }
    
    // Get failed events that haven't exceeded retry limit
    const failedEvents = await supabaseClient
      .from('webhook_events_failed')
      .select('*', {
        filters: {
          retry_count: `lt.${maxRetries}`
        },
        limit: 100,
        orderBy: 'failed_at.asc'
      });
    
    const results = {
      success: true,
      retried: 0,
      succeeded: 0,
      failed: 0
    };
    
    for (const failedEvent of failedEvents) {
      results.retried++;
      
      try {
        // Try to store the original event
        const storeResult = await storeEvent(failedEvent.original_data, config);
        
        if (storeResult.success) {
          // Delete from failed table on success
          await supabaseClient
            .from('webhook_events_failed')
            .delete({
              match: { id: failedEvent.id }
            });
          
          results.succeeded++;
        } else {
          // Update retry count
          await supabaseClient
            .from('webhook_events_failed')
            .update(
              {
                retry_count: failedEvent.retry_count + 1,
                last_retry_at: new Date().toISOString(),
                last_error: storeResult.error
              },
              {
                match: { id: failedEvent.id }
              }
            );
          
          results.failed++;
        }
      } catch (error) {
        console.error('Error retrying failed event:', error);
        results.failed++;
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error in retry process:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get events with enhanced filtering and aggregation
 */
export async function getEvents(options = {}, config) {
  try {
    if (!supabaseClient) {
      initSupabase(config);
    }
    
    const limit = options.limit || 100;
    const offset = options.offset || 0;
    const orderBy = options.orderBy || 'created_at.desc';
    
    // Build filters
    const filters = { ...options.filters };
    
    // Add date range filters if provided
    if (options.startDate) {
      filters.created_at = `gte.${options.startDate}`;
    }
    if (options.endDate) {
      filters.created_at = `${filters.created_at ? filters.created_at + ',' : ''}lte.${options.endDate}`;
    }
    
    // Add search filter if provided
    if (options.search) {
      filters['payload->>id'] = `ilike.%${options.search}%`;
    }
    
    const events = await supabaseClient.from('webhook_events').select('*', {
      filters,
      limit,
      offset,
      orderBy
    });
    
    // Get total count if requested
    let totalCount = null;
    if (options.includeCount) {
      totalCount = await supabaseClient.from('webhook_events').count({
        filters
      });
    }
    
    // Get aggregations if requested
    let aggregations = null;
    if (options.includeAggregations) {
      aggregations = await getEventAggregations(filters, config);
    }
    
    return {
      success: true,
      data: events,
      pagination: {
        limit,
        offset,
        hasMore: events.length === limit,
        totalCount
      },
      aggregations
    };
  } catch (error) {
    console.error('Error retrieving events from Supabase:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get event aggregations
 */
async function getEventAggregations(filters, config) {
  try {
    if (!supabaseClient) {
      initSupabase(config);
    }
    
    // Get aggregations using RPC function
    const aggregations = await supabaseClient.rpc('get_event_aggregations', {
      p_filters: filters
    });
    
    return aggregations;
  } catch (error) {
    console.error('Error getting aggregations:', error);
    return null;
  }
}

/**
 * Get event statistics
 */
export async function getEventStatistics(options = {}, config) {
  try {
    if (!supabaseClient) {
      initSupabase(config);
    }
    
    const stats = await supabaseClient.rpc('get_event_statistics', {
      p_start_date: options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      p_end_date: options.endDate || new Date().toISOString(),
      p_source: options.source,
      p_event_type: options.eventType
    });
    
    return {
      success: true,
      statistics: stats
    };
  } catch (error) {
    console.error('Error getting statistics:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Search events with full-text search
 */
export async function searchEvents(query, options = {}, config) {
  try {
    if (!supabaseClient) {
      initSupabase(config);
    }
    
    const results = await supabaseClient.rpc('search_events', {
      p_query: query,
      p_limit: options.limit || 100,
      p_offset: options.offset || 0,
      p_source: options.source,
      p_event_type: options.eventType
    });
    
    return {
      success: true,
      data: results,
      query
    };
  } catch (error) {
    console.error('Error searching events:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Archive old events
 */
export async function archiveOldEvents(daysToKeep = 90, config) {
  try {
    if (!supabaseClient) {
      initSupabase(config);
    }
    
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();
    
    const result = await supabaseClient.rpc('archive_old_events', {
      p_cutoff_date: cutoffDate
    });
    
    return {
      success: true,
      archived_count: result
    };
  } catch (error) {
    console.error('Error archiving events:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Export events to CSV/JSON
 */
export async function exportEvents(format = 'json', options = {}, config) {
  try {
    if (!supabaseClient) {
      initSupabase(config);
    }
    
    // Get events with filters
    const result = await getEvents({
      ...options,
      limit: options.limit || 1000
    }, config);
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    if (format === 'json') {
      return {
        success: true,
        data: JSON.stringify(result.data, null, 2),
        format: 'json',
        mimeType: 'application/json'
      };
    } else if (format === 'csv') {
      // Convert to CSV
      const csv = await convertToCSV(result.data);
      return {
        success: true,
        data: csv,
        format: 'csv',
        mimeType: 'text/csv'
      };
    }
    
    throw new Error(`Unsupported export format: ${format}`);
  } catch (error) {
    console.error('Error exporting events:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Convert events to CSV format
 */
async function convertToCSV(events) {
  if (events.length === 0) return '';
  
  // Get all unique keys
  const keys = new Set();
  events.forEach(event => {
    Object.keys(event).forEach(key => {
      if (key !== 'payload' && key !== 'headers' && key !== 'metadata' && key !== 'additional_context') {
        keys.add(key);
      }
    });
  });
  
  // Create CSV header
  const header = Array.from(keys).join(',');
  
  // Create CSV rows
  const rows = events.map(event => {
    return Array.from(keys).map(key => {
      const value = event[key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      if (typeof value === 'string' && value.includes(',')) return `"${value.replace(/"/g, '""')}"`;
      return value;
    }).join(',');
  });
  
  return [header, ...rows].join('\n');
}

/**
 * Run a health check on the Supabase connection
 */
export async function checkSupabaseHealth(config) {
  try {
    if (!supabaseClient) {
      initSupabase(config);
    }
    
    // Test a simple query
    const startTime = Date.now();
    await supabaseClient.from('webhook_events').select('count');
    const responseTime = Date.now() - startTime;
    
    // Check if response time is acceptable
    const isHealthy = responseTime < 5000; // 5 second threshold
    
    return {
      success: true,
      status: isHealthy ? 'healthy' : 'degraded',
      responseTime,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Supabase health check failed:', error);
    return {
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}