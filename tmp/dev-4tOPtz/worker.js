var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-z1ww6Z/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// .wrangler/tmp/bundle-z1ww6Z/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// node_modules/itty-router/index.mjs
var e = /* @__PURE__ */ __name(({ base: e2 = "", routes: t = [], ...o2 } = {}) => ({ __proto__: new Proxy({}, { get: /* @__PURE__ */ __name((o3, s2, r, n) => "handle" == s2 ? r.fetch : (o4, ...a) => t.push([s2.toUpperCase?.(), RegExp(`^${(n = (e2 + o4).replace(/\/+(\/|$)/g, "$1")).replace(/(\/?\.?):(\w+)\+/g, "($1(?<$2>*))").replace(/(\/?\.?):(\w+)/g, "($1(?<$2>[^$1/]+?))").replace(/\./g, "\\.").replace(/(\/?)\*/g, "($1.*)?")}/*$`), a, n]) && r, "get") }), routes: t, ...o2, async fetch(e3, ...o3) {
  let s2, r, n = new URL(e3.url), a = e3.query = { __proto__: null };
  for (let [e4, t2] of n.searchParams) a[e4] = a[e4] ? [].concat(a[e4], t2) : t2;
  for (let [a2, c2, i2, l2] of t) if ((a2 == e3.method || "ALL" == a2) && (r = n.pathname.match(c2))) {
    e3.params = r.groups || {}, e3.route = l2;
    for (let t2 of i2) if (null != (s2 = await t2(e3.proxy ?? e3, ...o3))) return s2;
  }
} }), "e");
var o = /* @__PURE__ */ __name((e2 = "text/plain; charset=utf-8", t) => (o2, { headers: s2 = {}, ...r } = {}) => void 0 === o2 || "Response" === o2?.constructor.name ? o2 : new Response(t ? t(o2) : o2, { headers: { "content-type": e2, ...s2.entries ? Object.fromEntries(s2) : s2 }, ...r }), "o");
var s = o("application/json; charset=utf-8", JSON.stringify);
var c = o("text/plain; charset=utf-8", String);
var i = o("text/html");
var l = o("image/jpeg");
var p = o("image/png");
var d = o("image/webp");

// src/config.js
function getConfig(env) {
  return {
    // Supabase configuration
    supabaseUrl: env.SUPABASE_URL,
    supabaseKey: env.SUPABASE_SERVICE_KEY,
    // Webhook secrets
    githubWebhookSecret: env.GITHUB_WEBHOOK_SECRET,
    linearWebhookSecret: env.LINEAR_WEBHOOK_SECRET,
    slackSigningSecret: env.SLACK_SIGNING_SECRET,
    // Feature flags
    debug: env.DEBUG === "true",
    enableBatching: env.ENABLE_BATCHING !== "false",
    // Default to true
    enableMetrics: env.ENABLE_METRICS !== "false",
    // Default to true
    enableRetry: env.ENABLE_RETRY !== "false",
    // Default to true
    // Performance settings
    batchSize: parseInt(env.BATCH_SIZE || "50"),
    batchInterval: parseInt(env.BATCH_INTERVAL || "5000"),
    // 5 seconds
    maxRetries: parseInt(env.MAX_RETRIES || "3"),
    retryDelay: parseInt(env.RETRY_DELAY || "500"),
    // 500ms
    // Rate limiting
    rateLimitWindow: parseInt(env.RATE_LIMIT_WINDOW || "60000"),
    // 1 minute
    rateLimitMaxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS || "100"),
    // Data retention
    dataRetentionDays: parseInt(env.DATA_RETENTION_DAYS || "90"),
    // Worker identification
    workerId: env.WORKER_ID || "webhook-gateway",
    workerEnvironment: env.WORKER_ENVIRONMENT || "production"
  };
}
__name(getConfig, "getConfig");
function validateConfig(config2) {
  const required = [
    "supabaseUrl",
    "supabaseKey"
  ];
  const missing = required.filter((key) => !config2[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(", ")}`);
  }
  try {
    new URL(config2.supabaseUrl);
  } catch (error) {
    throw new Error("Invalid SUPABASE_URL format");
  }
  const numericFields = [
    "batchSize",
    "batchInterval",
    "maxRetries",
    "retryDelay",
    "rateLimitWindow",
    "rateLimitMaxRequests",
    "dataRetentionDays"
  ];
  for (const field of numericFields) {
    if (isNaN(config2[field]) || config2[field] < 0) {
      throw new Error(`Invalid ${field} value: ${config2[field]}`);
    }
  }
  return true;
}
__name(validateConfig, "validateConfig");

// src/utils/supabase.js
var supabaseClient = null;
var MAX_RETRIES = 3;
var RETRY_DELAY_MS = 500;
var BATCH_SIZE = 100;
var DEDUPLICATION_WINDOW_MS = 5e3;
var eventCache = /* @__PURE__ */ new Map();
var CACHE_CLEANUP_INTERVAL = 6e4;
function initSupabase(config2) {
  if (!config2.supabaseUrl || !config2.supabaseKey) {
    throw new Error("Missing Supabase configuration");
  }
  const customFetch = /* @__PURE__ */ __name(async (...args) => {
    try {
      return await fetch(...args);
    } catch (error) {
      console.error(`Network error during Supabase operation: ${error.message}`);
      throw new Error(`Supabase network error: ${error.message}`);
    }
  }, "customFetch");
  supabaseClient = {
    url: config2.supabaseUrl,
    key: config2.supabaseKey,
    fetch: customFetch,
    from: /* @__PURE__ */ __name((table) => ({
      insert: /* @__PURE__ */ __name(async (data, options = {}) => {
        if (!data || Array.isArray(data) && data.length === 0) {
          throw new Error("Cannot insert empty data");
        }
        return await retryOperation(async () => {
          const response = await customFetch(`${config2.supabaseUrl}/rest/v1/${table}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${config2.supabaseKey}`,
              "apikey": config2.supabaseKey,
              "Prefer": options.returning ? "return=representation" : "return=minimal"
            },
            body: JSON.stringify(data)
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Supabase error (${response.status}): ${errorText}`);
          }
          return options.returning ? await response.json() : { status: response.status };
        });
      }, "insert"),
      select: /* @__PURE__ */ __name(async (columns = "*", options = {}) => {
        return await retryOperation(async () => {
          let url = `${config2.supabaseUrl}/rest/v1/${table}?select=${columns}`;
          if (options.filters) {
            for (const [key, value] of Object.entries(options.filters)) {
              url += `&${key}=${encodeURIComponent(value)}`;
            }
          }
          if (options.limit) {
            url += `&limit=${options.limit}`;
          }
          if (options.offset) {
            url += `&offset=${options.offset}`;
          }
          if (options.orderBy) {
            url += `&order=${options.orderBy}`;
          }
          const response = await customFetch(url, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${config2.supabaseKey}`,
              "apikey": config2.supabaseKey
            }
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Supabase error (${response.status}): ${errorText}`);
          }
          return await response.json();
        });
      }, "select"),
      update: /* @__PURE__ */ __name(async (data, options = {}) => {
        if (!data || Object.keys(data).length === 0) {
          throw new Error("Cannot update with empty data");
        }
        return await retryOperation(async () => {
          let url = `${config2.supabaseUrl}/rest/v1/${table}`;
          if (options.match) {
            url += "?";
            for (const [key, value] of Object.entries(options.match)) {
              url += `${key}=eq.${encodeURIComponent(value)}&`;
            }
            url = url.slice(0, -1);
          }
          const response = await customFetch(url, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${config2.supabaseKey}`,
              "apikey": config2.supabaseKey,
              "Prefer": options.returning ? "return=representation" : "return=minimal"
            },
            body: JSON.stringify(data)
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Supabase error (${response.status}): ${errorText}`);
          }
          return options.returning ? await response.json() : { status: response.status };
        });
      }, "update"),
      delete: /* @__PURE__ */ __name(async (options = {}) => {
        if (!options.match || Object.keys(options.match).length === 0) {
          throw new Error("Delete operation requires match criteria");
        }
        return await retryOperation(async () => {
          let url = `${config2.supabaseUrl}/rest/v1/${table}?`;
          for (const [key, value] of Object.entries(options.match)) {
            url += `${key}=eq.${encodeURIComponent(value)}&`;
          }
          url = url.slice(0, -1);
          const response = await customFetch(url, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${config2.supabaseKey}`,
              "apikey": config2.supabaseKey,
              "Prefer": options.returning ? "return=representation" : "return=minimal"
            }
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Supabase error (${response.status}): ${errorText}`);
          }
          return options.returning ? await response.json() : { status: response.status };
        });
      }, "delete"),
      count: /* @__PURE__ */ __name(async (options = {}) => {
        return await retryOperation(async () => {
          let url = `${config2.supabaseUrl}/rest/v1/${table}?select=count`;
          if (options.filters) {
            for (const [key, value] of Object.entries(options.filters)) {
              url += `&${key}=${encodeURIComponent(value)}`;
            }
          }
          const response = await customFetch(url, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${config2.supabaseKey}`,
              "apikey": config2.supabaseKey,
              "Prefer": "count=exact"
            }
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Supabase error (${response.status}): ${errorText}`);
          }
          const result = await response.json();
          return parseInt(response.headers.get("content-range")?.split("/")[1] || "0");
        });
      }, "count"),
      upsert: /* @__PURE__ */ __name(async (data, options = {}) => {
        if (!data || Array.isArray(data) && data.length === 0) {
          throw new Error("Cannot upsert empty data");
        }
        return await retryOperation(async () => {
          let url = `${config2.supabaseUrl}/rest/v1/${table}`;
          url += "?on_conflict=" + (options.onConflict || "id");
          const response = await customFetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${config2.supabaseKey}`,
              "apikey": config2.supabaseKey,
              "Prefer": `resolution=merge-duplicates${options.returning ? ",return=representation" : ""}`
            },
            body: JSON.stringify(data)
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Supabase error (${response.status}): ${errorText}`);
          }
          return options.returning ? await response.json() : { status: response.status };
        });
      }, "upsert")
    }), "from"),
    rpc: /* @__PURE__ */ __name(async (functionName, params = {}) => {
      return await retryOperation(async () => {
        const response = await customFetch(`${config2.supabaseUrl}/rest/v1/rpc/${functionName}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${config2.supabaseKey}`,
            "apikey": config2.supabaseKey
          },
          body: JSON.stringify(params)
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Supabase RPC error (${response.status}): ${errorText}`);
        }
        return await response.json();
      });
    }, "rpc")
  };
  startCacheCleanup();
  return supabaseClient;
}
__name(initSupabase, "initSupabase");
async function retryOperation(operation, maxRetries = MAX_RETRIES) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(`Operation failed (attempt ${attempt + 1}/${maxRetries}): ${error.message}`);
      if (error.message.includes("error (4")) {
        break;
      }
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
__name(retryOperation, "retryOperation");
function generateEventFingerprint(eventData) {
  const key = `${eventData.source}_${eventData.event_type}_${eventData.repository || ""}_${eventData.actor || ""}_${eventData.payload?.id || ""}`;
  return key;
}
__name(generateEventFingerprint, "generateEventFingerprint");
function isDuplicateEvent(eventData) {
  const fingerprint = generateEventFingerprint(eventData);
  const cachedTime = eventCache.get(fingerprint);
  if (cachedTime && Date.now() - cachedTime < DEDUPLICATION_WINDOW_MS) {
    return true;
  }
  eventCache.set(fingerprint, Date.now());
  return false;
}
__name(isDuplicateEvent, "isDuplicateEvent");
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
__name(startCacheCleanup, "startCacheCleanup");
async function storeEvent(eventData, config2) {
  try {
    if (!eventData.source) throw new Error("Event source is required");
    if (!eventData.event_type) throw new Error("Event type is required");
    if (!eventData.payload) throw new Error("Event payload is required");
    if (!eventData.created_at) {
      eventData.created_at = (/* @__PURE__ */ new Date()).toISOString();
    }
    if (isDuplicateEvent(eventData)) {
      console.warn("Duplicate event detected, skipping storage");
      return {
        success: true,
        duplicate: true
      };
    }
    if (!supabaseClient) {
      initSupabase(config2);
    }
    const enhancedEventData = {
      ...eventData,
      processed_at: (/* @__PURE__ */ new Date()).toISOString(),
      version: "2.0"
      // Schema version for future migrations
    };
    const result = await supabaseClient.from("webhook_events").insert(enhancedEventData, {
      returning: true
    });
    await updateEventMetrics(eventData.source, eventData.event_type, config2);
    return {
      success: true,
      id: result[0]?.id,
      duplicate: false
    };
  } catch (error) {
    console.error("Error storing event in Supabase:", error);
    await storeFailedEvent(eventData, error.message, config2);
    return {
      success: false,
      error: error.message
    };
  }
}
__name(storeEvent, "storeEvent");
async function storeBatchEvents(eventsData, config2) {
  if (!Array.isArray(eventsData) || eventsData.length === 0) {
    return {
      success: false,
      error: "No events provided for batch storage"
    };
  }
  try {
    if (!supabaseClient) {
      initSupabase(config2);
    }
    const results = {
      success: true,
      stored: [],
      duplicates: [],
      failed: []
    };
    for (let i2 = 0; i2 < eventsData.length; i2 += BATCH_SIZE) {
      const chunk = eventsData.slice(i2, i2 + BATCH_SIZE);
      const validEvents = [];
      for (const event of chunk) {
        try {
          if (!event.source) throw new Error("Missing source");
          if (!event.event_type) throw new Error("Missing event_type");
          if (!event.payload) throw new Error("Missing payload");
          if (!event.created_at) {
            event.created_at = (/* @__PURE__ */ new Date()).toISOString();
          }
          if (isDuplicateEvent(event)) {
            results.duplicates.push(event);
            continue;
          }
          validEvents.push({
            ...event,
            processed_at: (/* @__PURE__ */ new Date()).toISOString(),
            version: "2.0"
          });
        } catch (error) {
          results.failed.push({
            event,
            error: error.message
          });
        }
      }
      if (validEvents.length > 0) {
        try {
          const insertResult = await supabaseClient.from("webhook_events").insert(validEvents, {
            returning: true
          });
          results.stored.push(...insertResult);
          const metricsUpdates = {};
          for (const event of validEvents) {
            const key = `${event.source}_${event.event_type}`;
            metricsUpdates[key] = (metricsUpdates[key] || 0) + 1;
          }
          for (const [key, count] of Object.entries(metricsUpdates)) {
            const [source, eventType] = key.split("_");
            await updateEventMetrics(source, eventType, config2, count);
          }
        } catch (error) {
          console.error("Error storing batch chunk:", error);
          results.failed.push(...validEvents.map((event) => ({
            event,
            error: error.message
          })));
        }
      }
    }
    if (results.failed.length > 0) {
      await Promise.all(
        results.failed.map(
          ({ event, error }) => storeFailedEvent(event, error, config2)
        )
      );
    }
    return results;
  } catch (error) {
    console.error("Error in batch storage:", error);
    return {
      success: false,
      error: error.message
    };
  }
}
__name(storeBatchEvents, "storeBatchEvents");
async function storeFailedEvent(eventData, errorMessage, config2) {
  try {
    if (!supabaseClient) {
      initSupabase(config2);
    }
    await supabaseClient.from("webhook_events_failed").insert({
      source: eventData.source,
      event_type: eventData.event_type,
      payload: eventData.payload,
      error_message: errorMessage,
      original_data: eventData,
      failed_at: (/* @__PURE__ */ new Date()).toISOString(),
      retry_count: 0
    });
  } catch (error) {
    console.error("Error storing failed event:", error);
  }
}
__name(storeFailedEvent, "storeFailedEvent");
async function updateEventMetrics(source, eventType, config2, count = 1) {
  try {
    if (!supabaseClient) {
      initSupabase(config2);
    }
    await supabaseClient.rpc("increment_event_metrics", {
      p_source: source,
      p_event_type: eventType,
      p_count: count
    });
  } catch (error) {
    console.error("Error updating metrics:", error);
  }
}
__name(updateEventMetrics, "updateEventMetrics");

// src/utils/security.js
async function verifyGitHubSignature(payload, signature, secret) {
  try {
    if (!signature) {
      return false;
    }
    const providedSignature = signature.slice(7);
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const msgUint8 = new TextEncoder().encode(payload);
    const expectedSignatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      msgUint8
    );
    const expectedSignature = Array.from(new Uint8Array(expectedSignatureBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
    return timingSafeEqual(providedSignature, expectedSignature);
  } catch (error) {
    console.error("GitHub signature verification error:", error);
    return false;
  }
}
__name(verifyGitHubSignature, "verifyGitHubSignature");
async function verifyLinearSignature(payload, signature, secret) {
  try {
    if (!signature) {
      return false;
    }
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const msgUint8 = new TextEncoder().encode(payload);
    const expectedSignatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      msgUint8
    );
    const expectedSignature = btoa(
      String.fromCharCode(...new Uint8Array(expectedSignatureBuffer))
    );
    return timingSafeEqual(signature, expectedSignature);
  } catch (error) {
    console.error("Linear signature verification error:", error);
    return false;
  }
}
__name(verifyLinearSignature, "verifyLinearSignature");
async function verifySlackSignature(payload, timestamp, signature, secret) {
  try {
    if (!signature || !timestamp) {
      return false;
    }
    const currentTime = Math.floor(Date.now() / 1e3);
    if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
      return false;
    }
    const baseString = `v0:${timestamp}:${payload}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const msgUint8 = new TextEncoder().encode(baseString);
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      msgUint8
    );
    const expectedSignature = "v0=" + Array.from(new Uint8Array(signatureBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
    return timingSafeEqual(signature, expectedSignature);
  } catch (error) {
    console.error("Slack signature verification error:", error);
    return false;
  }
}
__name(verifySlackSignature, "verifySlackSignature");
function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i2 = 0; i2 < a.length; i2++) {
    result |= a.charCodeAt(i2) ^ b.charCodeAt(i2);
  }
  return result === 0;
}
__name(timingSafeEqual, "timingSafeEqual");

// src/utils/metadata.js
function extractGitHubMetadata(payload, eventType) {
  const metadata = {
    eventType,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    source: "github"
  };
  if (payload.repository) {
    metadata.repository = {
      id: payload.repository.id,
      name: payload.repository.name,
      full_name: payload.repository.full_name,
      private: payload.repository.private,
      owner: {
        login: payload.repository.owner?.login,
        id: payload.repository.owner?.id,
        type: payload.repository.owner?.type
      },
      html_url: payload.repository.html_url,
      description: payload.repository.description,
      fork: payload.repository.fork,
      created_at: payload.repository.created_at,
      updated_at: payload.repository.updated_at,
      pushed_at: payload.repository.pushed_at,
      size: payload.repository.size,
      stargazers_count: payload.repository.stargazers_count,
      watchers_count: payload.repository.watchers_count,
      language: payload.repository.language,
      has_issues: payload.repository.has_issues,
      has_projects: payload.repository.has_projects,
      has_downloads: payload.repository.has_downloads,
      has_wiki: payload.repository.has_wiki,
      has_pages: payload.repository.has_pages,
      forks_count: payload.repository.forks_count,
      archived: payload.repository.archived,
      disabled: payload.repository.disabled,
      open_issues_count: payload.repository.open_issues_count,
      license: payload.repository.license?.name,
      topics: payload.repository.topics,
      visibility: payload.repository.visibility,
      default_branch: payload.repository.default_branch
    };
  }
  if (payload.organization) {
    metadata.organization = {
      login: payload.organization.login,
      id: payload.organization.id,
      url: payload.organization.url,
      avatar_url: payload.organization.avatar_url,
      description: payload.organization.description
    };
  }
  if (payload.sender) {
    metadata.sender = {
      login: payload.sender.login,
      id: payload.sender.id,
      avatar_url: payload.sender.avatar_url,
      type: payload.sender.type,
      site_admin: payload.sender.site_admin
    };
  }
  if (payload.installation) {
    metadata.installation = {
      id: payload.installation.id,
      account: {
        login: payload.installation.account?.login,
        id: payload.installation.account?.id,
        type: payload.installation.account?.type
      }
    };
  }
  switch (eventType) {
    case "push":
      if (payload.ref) {
        metadata.push = {
          ref: payload.ref,
          before: payload.before,
          after: payload.after,
          created: payload.created,
          deleted: payload.deleted,
          forced: payload.forced,
          base_ref: payload.base_ref,
          compare: payload.compare,
          commits_count: payload.commits?.length || 0,
          distinct_commits_count: payload.distinct_commits?.length || 0,
          head_commit_id: payload.head_commit?.id,
          head_commit_message: payload.head_commit?.message,
          head_commit_author: payload.head_commit?.author
        };
      }
      break;
    case "pull_request":
      if (payload.pull_request) {
        metadata.pull_request = {
          id: payload.pull_request.id,
          number: payload.pull_request.number,
          state: payload.pull_request.state,
          locked: payload.pull_request.locked,
          title: payload.pull_request.title,
          body: payload.pull_request.body,
          created_at: payload.pull_request.created_at,
          updated_at: payload.pull_request.updated_at,
          closed_at: payload.pull_request.closed_at,
          merged_at: payload.pull_request.merged_at,
          merge_commit_sha: payload.pull_request.merge_commit_sha,
          assignees: payload.pull_request.assignees?.map((a) => a.login),
          requested_reviewers: payload.pull_request.requested_reviewers?.map((r) => r.login),
          requested_teams: payload.pull_request.requested_teams?.map((t) => t.name),
          labels: payload.pull_request.labels?.map((l2) => l2.name),
          milestone: payload.pull_request.milestone?.title,
          draft: payload.pull_request.draft,
          commits: payload.pull_request.commits,
          additions: payload.pull_request.additions,
          deletions: payload.pull_request.deletions,
          changed_files: payload.pull_request.changed_files,
          base: payload.pull_request.base ? {
            ref: payload.pull_request.base.ref,
            sha: payload.pull_request.base.sha
          } : null,
          head: payload.pull_request.head ? {
            ref: payload.pull_request.head.ref,
            sha: payload.pull_request.head.sha
          } : null
        };
      }
      break;
    case "issues":
      if (payload.issue) {
        metadata.issue = {
          id: payload.issue.id,
          number: payload.issue.number,
          state: payload.issue.state,
          title: payload.issue.title,
          body: payload.issue.body,
          created_at: payload.issue.created_at,
          updated_at: payload.issue.updated_at,
          closed_at: payload.issue.closed_at,
          assignees: payload.issue.assignees?.map((a) => a.login),
          labels: payload.issue.labels?.map((l2) => l2.name),
          milestone: payload.issue.milestone?.title,
          locked: payload.issue.locked,
          comments: payload.issue.comments,
          author_association: payload.issue.author_association
        };
      }
      break;
    case "release":
      if (payload.release) {
        metadata.release = {
          id: payload.release.id,
          tag_name: payload.release.tag_name,
          target_commitish: payload.release.target_commitish,
          name: payload.release.name,
          draft: payload.release.draft,
          prerelease: payload.release.prerelease,
          created_at: payload.release.created_at,
          published_at: payload.release.published_at,
          assets: payload.release.assets?.map((a) => ({
            name: a.name,
            size: a.size,
            download_count: a.download_count
          }))
        };
      }
      break;
    case "workflow_run":
      if (payload.workflow_run) {
        metadata.workflow_run = {
          id: payload.workflow_run.id,
          name: payload.workflow_run.name,
          head_branch: payload.workflow_run.head_branch,
          head_sha: payload.workflow_run.head_sha,
          status: payload.workflow_run.status,
          conclusion: payload.workflow_run.conclusion,
          workflow_id: payload.workflow_run.workflow_id,
          run_number: payload.workflow_run.run_number,
          event: payload.workflow_run.event,
          created_at: payload.workflow_run.created_at,
          updated_at: payload.workflow_run.updated_at,
          run_attempt: payload.workflow_run.run_attempt
        };
      }
      break;
  }
  return metadata;
}
__name(extractGitHubMetadata, "extractGitHubMetadata");
function extractLinearMetadata(payload) {
  const metadata = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    source: "linear",
    action: payload.action,
    type: payload.type,
    organizationId: payload.organizationId,
    webhookId: payload.webhookId,
    webhookTimestamp: payload.createdAt
  };
  if (payload.data) {
    metadata.data = {
      id: payload.data.id,
      createdAt: payload.data.createdAt,
      updatedAt: payload.data.updatedAt,
      archivedAt: payload.data.archivedAt
    };
    switch (payload.type) {
      case "Issue":
        Object.assign(metadata.data, {
          identifier: payload.data.identifier,
          title: payload.data.title,
          description: payload.data.description,
          priority: payload.data.priority,
          priorityLabel: payload.data.priorityLabel,
          estimate: payload.data.estimate,
          dueDate: payload.data.dueDate,
          completedAt: payload.data.completedAt,
          canceledAt: payload.data.canceledAt,
          startedAt: payload.data.startedAt,
          number: payload.data.number,
          url: payload.data.url,
          branchName: payload.data.branchName,
          customerTicketCount: payload.data.customerTicketCount,
          previousIdentifiers: payload.data.previousIdentifiers,
          subIssueSortOrder: payload.data.subIssueSortOrder,
          sortOrder: payload.data.sortOrder
        });
        if (payload.data.state) {
          metadata.data.state = {
            id: payload.data.state.id,
            name: payload.data.state.name,
            type: payload.data.state.type,
            color: payload.data.state.color
          };
        }
        if (payload.data.team) {
          metadata.data.team = {
            id: payload.data.team.id,
            name: payload.data.team.name,
            key: payload.data.team.key
          };
        }
        if (payload.data.assignee) {
          metadata.data.assignee = {
            id: payload.data.assignee.id,
            name: payload.data.assignee.name,
            email: payload.data.assignee.email
          };
        }
        if (payload.data.creator) {
          metadata.data.creator = {
            id: payload.data.creator.id,
            name: payload.data.creator.name,
            email: payload.data.creator.email
          };
        }
        if (payload.data.project) {
          metadata.data.project = {
            id: payload.data.project.id,
            name: payload.data.project.name,
            state: payload.data.project.state
          };
        }
        if (payload.data.cycle) {
          metadata.data.cycle = {
            id: payload.data.cycle.id,
            name: payload.data.cycle.name,
            number: payload.data.cycle.number
          };
        }
        if (payload.data.parent) {
          metadata.data.parent = {
            id: payload.data.parent.id,
            identifier: payload.data.parent.identifier,
            title: payload.data.parent.title
          };
        }
        if (payload.data.labels) {
          metadata.data.labels = payload.data.labels.map((l2) => ({
            id: l2.id,
            name: l2.name,
            color: l2.color
          }));
        }
        break;
      case "Project":
        Object.assign(metadata.data, {
          name: payload.data.name,
          description: payload.data.description,
          icon: payload.data.icon,
          color: payload.data.color,
          state: payload.data.state,
          startDate: payload.data.startDate,
          targetDate: payload.data.targetDate,
          progress: payload.data.progress,
          scopeProgress: payload.data.scopeProgress,
          slackNewIssue: payload.data.slackNewIssue,
          slackIssueComments: payload.data.slackIssueComments,
          slackIssueStatuses: payload.data.slackIssueStatuses,
          url: payload.data.url
        });
        if (payload.data.lead) {
          metadata.data.lead = {
            id: payload.data.lead.id,
            name: payload.data.lead.name,
            email: payload.data.lead.email
          };
        }
        if (payload.data.milestone) {
          metadata.data.milestone = {
            id: payload.data.milestone.id,
            name: payload.data.milestone.name
          };
        }
        break;
      case "Cycle":
        Object.assign(metadata.data, {
          number: payload.data.number,
          name: payload.data.name,
          description: payload.data.description,
          startsAt: payload.data.startsAt,
          endsAt: payload.data.endsAt,
          completedAt: payload.data.completedAt,
          progress: payload.data.progress,
          scopeProgress: payload.data.scopeProgress
        });
        if (payload.data.team) {
          metadata.data.team = {
            id: payload.data.team.id,
            name: payload.data.team.name,
            key: payload.data.team.key
          };
        }
        break;
      case "User":
        Object.assign(metadata.data, {
          name: payload.data.name,
          displayName: payload.data.displayName,
          email: payload.data.email,
          avatarUrl: payload.data.avatarUrl,
          active: payload.data.active,
          admin: payload.data.admin,
          guest: payload.data.guest,
          lastSeen: payload.data.lastSeen,
          statusEmoji: payload.data.statusEmoji,
          statusLabel: payload.data.statusLabel,
          statusUntilAt: payload.data.statusUntilAt,
          timezone: payload.data.timezone,
          url: payload.data.url
        });
        break;
      case "Comment":
        Object.assign(metadata.data, {
          body: payload.data.body,
          edited: payload.data.editedAt ? true : false,
          url: payload.data.url
        });
        if (payload.data.issue) {
          metadata.data.issue = {
            id: payload.data.issue.id,
            identifier: payload.data.issue.identifier,
            title: payload.data.issue.title
          };
        }
        if (payload.data.user) {
          metadata.data.user = {
            id: payload.data.user.id,
            name: payload.data.user.name,
            email: payload.data.user.email
          };
        }
        if (payload.data.parent) {
          metadata.data.parent = {
            id: payload.data.parent.id
          };
        }
        break;
      case "Label":
        Object.assign(metadata.data, {
          name: payload.data.name,
          description: payload.data.description,
          color: payload.data.color
        });
        if (payload.data.team) {
          metadata.data.team = {
            id: payload.data.team.id,
            name: payload.data.team.name,
            key: payload.data.team.key
          };
        }
        if (payload.data.parent) {
          metadata.data.parent = {
            id: payload.data.parent.id,
            name: payload.data.parent.name
          };
        }
        break;
      case "WorkflowState":
        Object.assign(metadata.data, {
          name: payload.data.name,
          description: payload.data.description,
          color: payload.data.color,
          type: payload.data.type,
          position: payload.data.position
        });
        if (payload.data.team) {
          metadata.data.team = {
            id: payload.data.team.id,
            name: payload.data.team.name,
            key: payload.data.team.key
          };
        }
        break;
    }
  }
  return metadata;
}
__name(extractLinearMetadata, "extractLinearMetadata");
function extractSlackMetadata(payload) {
  const metadata = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    source: "slack"
  };
  if (payload.event_id) {
    metadata.event_id = payload.event_id;
    metadata.event_time = payload.event_time;
    metadata.event_context = payload.event_context;
  }
  if (payload.team_id || payload.team) {
    metadata.team = {
      id: payload.team_id || payload.team?.id,
      name: payload.team?.name,
      domain: payload.team?.domain
    };
  }
  if (payload.enterprise_id || payload.enterprise) {
    metadata.enterprise = {
      id: payload.enterprise_id || payload.enterprise?.id,
      name: payload.enterprise?.name
    };
  }
  if (payload.api_app_id) {
    metadata.api_app_id = payload.api_app_id;
  }
  if (payload.event) {
    metadata.event_type = payload.event.type;
    metadata.event_subtype = payload.event.subtype;
    if (payload.event.channel || payload.event.item?.channel) {
      const channelId = payload.event.channel || payload.event.item.channel;
      metadata.channel = {
        id: channelId,
        type: determineChannelType(channelId),
        name: payload.event.channel_name
      };
    }
    if (payload.event.user) {
      metadata.user = {
        id: payload.event.user,
        team_id: payload.event.user_team
      };
    }
    if (payload.event.ts) {
      metadata.message = {
        ts: payload.event.ts,
        thread_ts: payload.event.thread_ts,
        client_msg_id: payload.event.client_msg_id
      };
    }
  }
  if (payload.type === "block_actions" || payload.type === "view_submission") {
    metadata.interaction = {
      type: payload.type,
      trigger_id: payload.trigger_id,
      response_url: payload.response_url
    };
    if (payload.user) {
      metadata.user = {
        id: payload.user.id || payload.user.user_id,
        username: payload.user.username || payload.user.name,
        name: payload.user.name,
        team_id: payload.user.team_id
      };
    }
    if (payload.channel) {
      metadata.channel = {
        id: payload.channel.id,
        name: payload.channel.name,
        type: payload.channel.type || determineChannelType(payload.channel.id)
      };
    }
    if (payload.message) {
      metadata.message = {
        ts: payload.message.ts,
        thread_ts: payload.message.thread_ts,
        text: payload.message.text
      };
    }
    if (payload.view) {
      metadata.view = {
        id: payload.view.id,
        team_id: payload.view.team_id,
        type: payload.view.type,
        callback_id: payload.view.callback_id,
        hash: payload.view.hash,
        private_metadata: payload.view.private_metadata
      };
    }
    if (payload.actions) {
      metadata.actions = payload.actions.map((action) => ({
        type: action.type,
        action_id: action.action_id,
        block_id: action.block_id,
        action_ts: action.action_ts
      }));
    }
  }
  if (payload.command) {
    metadata.command = {
      command: payload.command,
      text: payload.text,
      response_url: payload.response_url,
      trigger_id: payload.trigger_id
    };
    metadata.user = {
      id: payload.user_id,
      name: payload.user_name
    };
    metadata.channel = {
      id: payload.channel_id,
      name: payload.channel_name
    };
  }
  if (payload.authorizations) {
    metadata.authorizations = payload.authorizations.map((auth) => ({
      enterprise_id: auth.enterprise_id,
      team_id: auth.team_id,
      user_id: auth.user_id,
      is_bot: auth.is_bot,
      is_enterprise_install: auth.is_enterprise_install
    }));
  }
  return metadata;
}
__name(extractSlackMetadata, "extractSlackMetadata");
function determineChannelType(channelId) {
  if (!channelId) return null;
  if (channelId.startsWith("C")) return "public_channel";
  if (channelId.startsWith("G")) return "private_channel";
  if (channelId.startsWith("D")) return "im";
  if (channelId.startsWith("M")) return "mpim";
  return "unknown";
}
__name(determineChannelType, "determineChannelType");

// src/handlers/github.js
var GITHUB_EVENT_MAPPING = {
  "pull_request": {
    opened: "pr_opened",
    closed: "pr_closed",
    merged: "pr_merged",
    reopened: "pr_reopened",
    synchronize: "pr_updated",
    review_requested: "pr_review_requested",
    review_request_removed: "pr_review_request_removed",
    labeled: "pr_labeled",
    unlabeled: "pr_unlabeled",
    assigned: "pr_assigned",
    unassigned: "pr_unassigned",
    converted_to_draft: "pr_converted_to_draft",
    ready_for_review: "pr_ready_for_review"
  },
  "issues": {
    opened: "issue_opened",
    closed: "issue_closed",
    reopened: "issue_reopened",
    edited: "issue_edited",
    deleted: "issue_deleted",
    transferred: "issue_transferred",
    pinned: "issue_pinned",
    unpinned: "issue_unpinned",
    labeled: "issue_labeled",
    unlabeled: "issue_unlabeled",
    locked: "issue_locked",
    unlocked: "issue_unlocked",
    milestoned: "issue_milestoned",
    demilestoned: "issue_demilestoned",
    assigned: "issue_assigned",
    unassigned: "issue_unassigned"
  },
  "push": "code_pushed",
  "release": {
    published: "release_published",
    unpublished: "release_unpublished",
    created: "release_created",
    edited: "release_edited",
    deleted: "release_deleted",
    prereleased: "release_prereleased",
    released: "release_released"
  },
  "deployment": {
    created: "deployment_created"
  },
  "deployment_status": {
    created: "deployment_status_updated"
  },
  "workflow_run": {
    requested: "workflow_requested",
    in_progress: "workflow_in_progress",
    completed: "workflow_completed"
  },
  "check_run": {
    created: "check_created",
    rerequested: "check_rerequested",
    completed: "check_completed",
    requested_action: "check_action_requested"
  },
  "check_suite": {
    completed: "checks_completed",
    requested: "checks_requested",
    rerequested: "checks_rerequested"
  },
  "status": "commit_status_updated",
  "repository": {
    created: "repo_created",
    deleted: "repo_deleted",
    archived: "repo_archived",
    unarchived: "repo_unarchived",
    edited: "repo_edited",
    renamed: "repo_renamed",
    transferred: "repo_transferred",
    publicized: "repo_made_public",
    privatized: "repo_made_private"
  },
  "create": "ref_created",
  "delete": "ref_deleted",
  "fork": "repo_forked",
  "star": {
    created: "repo_starred",
    deleted: "repo_unstarred"
  },
  "watch": {
    started: "repo_watched"
  },
  "member": {
    added: "member_added",
    removed: "member_removed",
    edited: "member_edited"
  },
  "team": {
    created: "team_created",
    deleted: "team_deleted",
    edited: "team_edited",
    added_to_repository: "team_added_to_repo",
    removed_from_repository: "team_removed_from_repo"
  },
  "organization": {
    member_added: "org_member_added",
    member_removed: "org_member_removed",
    member_invited: "org_member_invited"
  },
  "project": {
    created: "project_created",
    edited: "project_edited",
    closed: "project_closed",
    reopened: "project_reopened",
    deleted: "project_deleted"
  },
  "project_card": {
    created: "project_card_created",
    edited: "project_card_edited",
    moved: "project_card_moved",
    converted: "project_card_converted",
    deleted: "project_card_deleted"
  },
  "project_column": {
    created: "project_column_created",
    edited: "project_column_edited",
    moved: "project_column_moved",
    deleted: "project_column_deleted"
  },
  "milestone": {
    created: "milestone_created",
    closed: "milestone_closed",
    opened: "milestone_opened",
    edited: "milestone_edited",
    deleted: "milestone_deleted"
  },
  "package": {
    published: "package_published",
    updated: "package_updated"
  },
  "page_build": "pages_built",
  "ping": "webhook_ping",
  "public": "repo_made_public",
  "sponsorship": {
    created: "sponsorship_created",
    cancelled: "sponsorship_cancelled",
    edited: "sponsorship_edited",
    tier_changed: "sponsorship_tier_changed",
    pending_cancellation: "sponsorship_pending_cancellation",
    pending_tier_change: "sponsorship_pending_tier_change"
  },
  "repository_dispatch": "custom_event_triggered",
  "workflow_dispatch": "workflow_manually_triggered",
  "discussion": {
    created: "discussion_created",
    edited: "discussion_edited",
    deleted: "discussion_deleted",
    transferred: "discussion_transferred",
    pinned: "discussion_pinned",
    unpinned: "discussion_unpinned",
    labeled: "discussion_labeled",
    unlabeled: "discussion_unlabeled",
    locked: "discussion_locked",
    unlocked: "discussion_unlocked",
    category_changed: "discussion_category_changed",
    answered: "discussion_answered",
    unanswered: "discussion_unanswered"
  },
  "discussion_comment": {
    created: "discussion_comment_created",
    edited: "discussion_comment_edited",
    deleted: "discussion_comment_deleted"
  },
  "commit_comment": {
    created: "commit_commented"
  },
  "issue_comment": {
    created: "issue_commented",
    edited: "issue_comment_edited",
    deleted: "issue_comment_deleted"
  },
  "pull_request_review": {
    submitted: "pr_review_submitted",
    edited: "pr_review_edited",
    dismissed: "pr_review_dismissed"
  },
  "pull_request_review_comment": {
    created: "pr_review_comment_created",
    edited: "pr_review_comment_edited",
    deleted: "pr_review_comment_deleted"
  },
  "pull_request_review_thread": {
    resolved: "pr_review_thread_resolved",
    unresolved: "pr_review_thread_unresolved"
  },
  "gollum": "wiki_page_updated",
  "installation": {
    created: "app_installed",
    deleted: "app_uninstalled",
    suspend: "app_suspended",
    unsuspend: "app_unsuspended",
    new_permissions_accepted: "app_permissions_accepted"
  },
  "installation_repositories": {
    added: "app_repos_added",
    removed: "app_repos_removed"
  },
  "marketplace_purchase": {
    purchased: "marketplace_purchased",
    pending_change: "marketplace_pending_change",
    pending_change_cancelled: "marketplace_change_cancelled",
    changed: "marketplace_changed",
    cancelled: "marketplace_cancelled"
  },
  "meta": "webhook_deleted",
  "security_advisory": {
    published: "security_advisory_published",
    updated: "security_advisory_updated",
    performed: "security_advisory_performed",
    withdrawn: "security_advisory_withdrawn"
  },
  "code_scanning_alert": {
    created: "security_alert_created",
    reopened: "security_alert_reopened",
    closed: "security_alert_closed",
    fixed: "security_alert_fixed",
    appeared_in_branch: "security_alert_appeared",
    closed_by_user: "security_alert_dismissed"
  },
  "secret_scanning_alert": {
    created: "secret_detected",
    resolved: "secret_resolved",
    reopened: "secret_reopened"
  },
  "dependabot_alert": {
    created: "dependency_alert_created",
    dismissed: "dependency_alert_dismissed",
    fixed: "dependency_alert_fixed",
    reintroduced: "dependency_alert_reintroduced"
  },
  "dependency_graph": {
    updated: "dependencies_updated"
  },
  "merge_queue_entry": {
    created: "merge_queue_entry_added",
    deleted: "merge_queue_entry_removed"
  },
  "branch_protection_rule": {
    created: "branch_protection_created",
    edited: "branch_protection_edited",
    deleted: "branch_protection_deleted"
  },
  "repository_vulnerability_alert": {
    create: "vulnerability_alert_created",
    dismiss: "vulnerability_alert_dismissed",
    resolve: "vulnerability_alert_resolved"
  }
};
async function handleGitHubEvent(rawBody, payload, headers, config2) {
  const eventType = headers["x-github-event"] || "unknown";
  const signature = headers["x-hub-signature-256"];
  const deliveryId = headers["x-github-delivery"];
  const hookId = headers["x-github-hook-id"];
  const hookInstallationTargetId = headers["x-github-hook-installation-target-id"];
  const hookInstallationTargetType = headers["x-github-hook-installation-target-type"];
  if (config2.githubWebhookSecret && signature) {
    const isValid = await verifyGitHubSignature(
      rawBody,
      signature,
      config2.githubWebhookSecret
    );
    if (!isValid) {
      return {
        isValid: false,
        error: "Invalid GitHub signature"
      };
    }
  }
  const metadata = extractGitHubMetadata(payload, eventType);
  let repository = null;
  let repositoryId = null;
  let organization = null;
  let actor = null;
  let actorId = null;
  let actorType = null;
  if (payload.repository) {
    repository = payload.repository.full_name;
    repositoryId = payload.repository.id;
    if (payload.repository.owner) {
      organization = payload.repository.owner.login;
    }
  }
  if (payload.sender) {
    actor = payload.sender.login;
    actorId = payload.sender.id;
    actorType = payload.sender.type;
  } else if (payload.actor) {
    actor = payload.actor.login;
    actorId = payload.actor.id;
    actorType = payload.actor.type;
  }
  let specificEventType = eventType;
  if (GITHUB_EVENT_MAPPING[eventType]) {
    if (typeof GITHUB_EVENT_MAPPING[eventType] === "string") {
      specificEventType = GITHUB_EVENT_MAPPING[eventType];
    } else if (payload.action && GITHUB_EVENT_MAPPING[eventType][payload.action]) {
      specificEventType = GITHUB_EVENT_MAPPING[eventType][payload.action];
    }
  }
  let additionalContext = {};
  if (eventType === "push") {
    additionalContext = {
      ref: payload.ref,
      before: payload.before,
      after: payload.after,
      created: payload.created,
      deleted: payload.deleted,
      forced: payload.forced,
      compare: payload.compare,
      commits: payload.commits?.length || 0,
      head_commit: payload.head_commit?.id,
      pusher: payload.pusher?.name || payload.pusher?.email
    };
  } else if (eventType === "pull_request") {
    additionalContext = {
      pr_number: payload.pull_request?.number,
      pr_title: payload.pull_request?.title,
      pr_state: payload.pull_request?.state,
      pr_merged: payload.pull_request?.merged,
      pr_draft: payload.pull_request?.draft,
      pr_base: payload.pull_request?.base?.ref,
      pr_head: payload.pull_request?.head?.ref,
      pr_author: payload.pull_request?.user?.login,
      pr_labels: payload.pull_request?.labels?.map((l2) => l2.name) || [],
      pr_assignees: payload.pull_request?.assignees?.map((a) => a.login) || [],
      pr_reviewers: payload.pull_request?.requested_reviewers?.map((r) => r.login) || [],
      pr_teams: payload.pull_request?.requested_teams?.map((t) => t.name) || []
    };
  } else if (eventType === "issues") {
    additionalContext = {
      issue_number: payload.issue?.number,
      issue_title: payload.issue?.title,
      issue_state: payload.issue?.state,
      issue_labels: payload.issue?.labels?.map((l2) => l2.name) || [],
      issue_assignees: payload.issue?.assignees?.map((a) => a.login) || [],
      issue_author: payload.issue?.user?.login,
      issue_milestone: payload.issue?.milestone?.title
    };
  } else if (eventType === "release") {
    additionalContext = {
      release_tag: payload.release?.tag_name,
      release_name: payload.release?.name,
      release_draft: payload.release?.draft,
      release_prerelease: payload.release?.prerelease,
      release_author: payload.release?.author?.login,
      release_assets: payload.release?.assets?.length || 0
    };
  } else if (eventType === "workflow_run") {
    additionalContext = {
      workflow_id: payload.workflow_run?.workflow_id,
      workflow_name: payload.workflow_run?.name,
      workflow_run_id: payload.workflow_run?.id,
      workflow_run_number: payload.workflow_run?.run_number,
      workflow_status: payload.workflow_run?.status,
      workflow_conclusion: payload.workflow_run?.conclusion,
      workflow_branch: payload.workflow_run?.head_branch,
      workflow_actor: payload.workflow_run?.actor?.login,
      workflow_event: payload.workflow_run?.event
    };
  } else if (eventType === "deployment" || eventType === "deployment_status") {
    additionalContext = {
      deployment_id: payload.deployment?.id || payload.deployment_status?.deployment?.id,
      deployment_environment: payload.deployment?.environment || payload.deployment_status?.environment,
      deployment_ref: payload.deployment?.ref,
      deployment_task: payload.deployment?.task,
      deployment_description: payload.deployment?.description || payload.deployment_status?.description,
      deployment_status: payload.deployment_status?.state,
      deployment_creator: payload.deployment?.creator?.login || payload.deployment_status?.creator?.login
    };
  }
  return {
    isValid: true,
    eventType: specificEventType,
    repository,
    repositoryId,
    organization,
    actor,
    actorId,
    actorType,
    deliveryId,
    hookId,
    hookInstallationTargetId,
    hookInstallationTargetType,
    metadata,
    additionalContext,
    rawEventType: eventType,
    action: payload.action
  };
}
__name(handleGitHubEvent, "handleGitHubEvent");

// src/handlers/linear.js
var LINEAR_EVENT_MAPPING = {
  "Issue": {
    create: "issue_created",
    update: "issue_updated",
    remove: "issue_deleted",
    "state:update": "issue_state_changed",
    "assignee:update": "issue_assignee_changed",
    "priority:update": "issue_priority_changed",
    "estimate:update": "issue_estimate_changed",
    "label:add": "issue_label_added",
    "label:remove": "issue_label_removed",
    "project:add": "issue_added_to_project",
    "project:remove": "issue_removed_from_project",
    "cycle:add": "issue_added_to_cycle",
    "cycle:remove": "issue_removed_from_cycle",
    "parent:update": "issue_parent_changed",
    "subscriber:add": "issue_subscriber_added",
    "subscriber:remove": "issue_subscriber_removed",
    "dueDate:update": "issue_due_date_changed",
    "attachment:create": "issue_attachment_added",
    "attachment:remove": "issue_attachment_removed",
    "reaction:create": "issue_reaction_added",
    "reaction:remove": "issue_reaction_removed"
  },
  "Comment": {
    create: "comment_created",
    update: "comment_updated",
    remove: "comment_deleted",
    "reaction:create": "comment_reaction_added",
    "reaction:remove": "comment_reaction_removed"
  },
  "Project": {
    create: "project_created",
    update: "project_updated",
    remove: "project_deleted",
    "state:update": "project_state_changed",
    "lead:update": "project_lead_changed",
    "member:add": "project_member_added",
    "member:remove": "project_member_removed",
    "milestone:add": "project_milestone_added",
    "milestone:remove": "project_milestone_removed",
    "milestone:update": "project_milestone_updated"
  },
  "ProjectUpdate": {
    create: "project_update_created",
    update: "project_update_edited",
    remove: "project_update_deleted"
  },
  "Cycle": {
    create: "cycle_created",
    update: "cycle_updated",
    remove: "cycle_deleted",
    "state:update": "cycle_state_changed",
    "progress:update": "cycle_progress_updated"
  },
  "User": {
    create: "user_created",
    update: "user_updated",
    remove: "user_removed",
    "active:update": "user_activation_changed",
    "admin:update": "user_admin_status_changed"
  },
  "Team": {
    create: "team_created",
    update: "team_updated",
    remove: "team_deleted",
    "member:add": "team_member_added",
    "member:remove": "team_member_removed",
    "key:update": "team_key_changed",
    "settings:update": "team_settings_updated"
  },
  "Label": {
    create: "label_created",
    update: "label_updated",
    remove: "label_deleted",
    "parent:update": "label_parent_changed"
  },
  "Workflow": {
    create: "workflow_created",
    update: "workflow_updated",
    remove: "workflow_deleted",
    "state:add": "workflow_state_added",
    "state:remove": "workflow_state_removed",
    "state:update": "workflow_state_updated"
  },
  "WorkflowState": {
    create: "workflow_state_created",
    update: "workflow_state_updated",
    remove: "workflow_state_deleted",
    "position:update": "workflow_state_position_changed"
  },
  "Milestone": {
    create: "milestone_created",
    update: "milestone_updated",
    remove: "milestone_deleted"
  },
  "Objective": {
    create: "objective_created",
    update: "objective_updated",
    remove: "objective_deleted",
    "progress:update": "objective_progress_updated"
  },
  "KeyResult": {
    create: "key_result_created",
    update: "key_result_updated",
    remove: "key_result_deleted",
    "progress:update": "key_result_progress_updated"
  },
  "Roadmap": {
    create: "roadmap_created",
    update: "roadmap_updated",
    remove: "roadmap_deleted"
  },
  "RoadmapItem": {
    create: "roadmap_item_created",
    update: "roadmap_item_updated",
    remove: "roadmap_item_deleted"
  },
  "Integration": {
    create: "integration_created",
    update: "integration_updated",
    remove: "integration_deleted",
    "enable:update": "integration_status_changed"
  },
  "Webhook": {
    create: "webhook_created",
    update: "webhook_updated",
    remove: "webhook_deleted",
    "enable:update": "webhook_status_changed"
  },
  "Attachment": {
    create: "attachment_created",
    update: "attachment_updated",
    remove: "attachment_deleted"
  },
  "Reaction": {
    create: "reaction_added",
    remove: "reaction_removed"
  },
  "Notification": {
    create: "notification_created",
    update: "notification_updated",
    "read:update": "notification_read_status_changed",
    "archive:update": "notification_archive_status_changed"
  },
  "Document": {
    create: "document_created",
    update: "document_updated",
    remove: "document_deleted"
  },
  "DocumentContent": {
    update: "document_content_updated"
  },
  "Favorite": {
    create: "favorite_added",
    remove: "favorite_removed"
  },
  "CustomView": {
    create: "custom_view_created",
    update: "custom_view_updated",
    remove: "custom_view_deleted"
  },
  "ApiKey": {
    create: "api_key_created",
    remove: "api_key_deleted"
  },
  "Subscription": {
    create: "subscription_created",
    update: "subscription_updated",
    remove: "subscription_deleted"
  },
  "Template": {
    create: "template_created",
    update: "template_updated",
    remove: "template_deleted"
  }
};
async function handleLinearEvent(rawBody, payload, headers, config2) {
  const eventType = headers["x-linear-event"] || "unknown";
  const signature = headers["x-linear-signature"];
  const deliveryId = headers["x-linear-delivery"];
  const timestamp = headers["x-linear-timestamp"];
  if (config2.linearWebhookSecret && signature) {
    const isValid = await verifyLinearSignature(
      rawBody,
      signature,
      config2.linearWebhookSecret
    );
    if (!isValid) {
      return {
        isValid: false,
        error: "Invalid Linear signature"
      };
    }
  }
  const metadata = extractLinearMetadata(payload);
  let organization = null;
  let organizationId = null;
  let team = null;
  let teamId = null;
  let actor = null;
  let actorId = null;
  let actorEmail = null;
  let targetEntity = null;
  let targetEntityId = null;
  let targetEntityType = null;
  if (payload.organizationId) {
    organizationId = payload.organizationId;
  }
  if (payload.data?.team) {
    team = payload.data.team.name || payload.data.team.key;
    teamId = payload.data.team.id;
  } else if (payload.teamId) {
    teamId = payload.teamId;
  }
  if (payload.data?.user) {
    actor = payload.data.user.name || payload.data.user.email;
    actorId = payload.data.user.id;
    actorEmail = payload.data.user.email;
  } else if (payload.data?.createdBy) {
    actor = payload.data.createdBy.name || payload.data.createdBy.email;
    actorId = payload.data.createdBy.id;
    actorEmail = payload.data.createdBy.email;
  } else if (payload.data?.updatedBy) {
    actor = payload.data.updatedBy.name || payload.data.updatedBy.email;
    actorId = payload.data.updatedBy.id;
    actorEmail = payload.data.updatedBy.email;
  }
  if (payload.data) {
    targetEntityId = payload.data.id;
    targetEntityType = payload.type;
    if (payload.data.title) {
      targetEntity = payload.data.title;
    } else if (payload.data.name) {
      targetEntity = payload.data.name;
    } else if (payload.data.identifier) {
      targetEntity = payload.data.identifier;
    } else if (payload.data.key) {
      targetEntity = payload.data.key;
    }
  }
  let specificEventType = eventType;
  if (payload.type && LINEAR_EVENT_MAPPING[payload.type]) {
    if (payload.action && LINEAR_EVENT_MAPPING[payload.type][payload.action]) {
      specificEventType = LINEAR_EVENT_MAPPING[payload.type][payload.action];
    } else if (typeof LINEAR_EVENT_MAPPING[payload.type] === "string") {
      specificEventType = LINEAR_EVENT_MAPPING[payload.type];
    }
  } else if (payload.type && payload.action) {
    specificEventType = `${payload.type.toLowerCase()}_${payload.action}`;
  }
  let additionalContext = {};
  if (payload.type === "Issue" && payload.data) {
    additionalContext = {
      issue_identifier: payload.data.identifier,
      issue_title: payload.data.title,
      issue_description: payload.data.description,
      issue_priority: payload.data.priority,
      issue_priority_label: payload.data.priorityLabel,
      issue_state: payload.data.state?.name,
      issue_state_type: payload.data.state?.type,
      issue_assignee: payload.data.assignee?.name,
      issue_assignee_id: payload.data.assignee?.id,
      issue_creator: payload.data.creator?.name,
      issue_creator_id: payload.data.creator?.id,
      issue_labels: payload.data.labels?.map((l2) => l2.name) || [],
      issue_estimate: payload.data.estimate,
      issue_due_date: payload.data.dueDate,
      issue_completed_at: payload.data.completedAt,
      issue_canceled_at: payload.data.canceledAt,
      issue_started_at: payload.data.startedAt,
      issue_cycle: payload.data.cycle?.name,
      issue_cycle_id: payload.data.cycle?.id,
      issue_project: payload.data.project?.name,
      issue_project_id: payload.data.project?.id,
      issue_parent_id: payload.data.parent?.id,
      issue_parent_identifier: payload.data.parent?.identifier,
      issue_subscriber_count: payload.data.subscribers?.length || 0,
      issue_comment_count: payload.data.comments?.length || 0,
      issue_attachment_count: payload.data.attachments?.length || 0,
      issue_sub_issues_count: payload.data.children?.length || 0
    };
  } else if (payload.type === "Project" && payload.data) {
    additionalContext = {
      project_name: payload.data.name,
      project_description: payload.data.description,
      project_state: payload.data.state,
      project_lead: payload.data.lead?.name,
      project_lead_id: payload.data.lead?.id,
      project_start_date: payload.data.startDate,
      project_target_date: payload.data.targetDate,
      project_member_count: payload.data.members?.length || 0,
      project_milestone_count: payload.data.milestones?.length || 0,
      project_issue_count: payload.data.issues?.length || 0,
      project_progress: payload.data.progress,
      project_status: payload.data.status,
      project_health: payload.data.health
    };
  } else if (payload.type === "Cycle" && payload.data) {
    additionalContext = {
      cycle_name: payload.data.name,
      cycle_description: payload.data.description,
      cycle_number: payload.data.number,
      cycle_start_date: payload.data.startDate,
      cycle_end_date: payload.data.endDate,
      cycle_progress: payload.data.progress,
      cycle_issues_count: payload.data.issues?.length || 0,
      cycle_completed_issues_count: payload.data.completedIssuesCount,
      cycle_scope_change: payload.data.scopeChange,
      cycle_completion_rate: payload.data.completionRate
    };
  } else if (payload.type === "Comment" && payload.data) {
    additionalContext = {
      comment_body: payload.data.body,
      comment_author: payload.data.user?.name,
      comment_author_id: payload.data.user?.id,
      comment_issue_id: payload.data.issue?.id,
      comment_issue_identifier: payload.data.issue?.identifier,
      comment_parent_id: payload.data.parent?.id,
      comment_edited: payload.data.editedAt ? true : false,
      comment_reaction_count: payload.data.reactions?.length || 0
    };
  } else if (payload.type === "User" && payload.data) {
    additionalContext = {
      user_name: payload.data.name,
      user_email: payload.data.email,
      user_display_name: payload.data.displayName,
      user_avatar_url: payload.data.avatarUrl,
      user_active: payload.data.active,
      user_admin: payload.data.admin,
      user_created_at: payload.data.createdAt,
      user_last_seen: payload.data.lastSeen,
      user_timezone: payload.data.timezone
    };
  } else if (payload.type === "WorkflowState" && payload.data) {
    additionalContext = {
      state_name: payload.data.name,
      state_color: payload.data.color,
      state_position: payload.data.position,
      state_type: payload.data.type,
      state_description: payload.data.description,
      state_team_id: payload.data.team?.id
    };
  }
  const webhookMetadata = {
    url: payload.url,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt
  };
  return {
    isValid: true,
    eventType: specificEventType,
    repository: team,
    // Using team as repository equivalent
    repositoryId: teamId,
    organization,
    organizationId,
    actor,
    actorId,
    actorEmail,
    targetEntity,
    targetEntityId,
    targetEntityType,
    deliveryId,
    timestamp,
    metadata,
    additionalContext,
    webhookMetadata,
    rawEventType: eventType,
    action: payload.action,
    modelType: payload.type
  };
}
__name(handleLinearEvent, "handleLinearEvent");

// src/handlers/slack.js
var SLACK_EVENT_MAPPING = {
  // Message events
  "message": "message_sent",
  "message.channels": "channel_message",
  "message.groups": "private_channel_message",
  "message.im": "direct_message",
  "message.mpim": "group_direct_message",
  "app_mention": "app_mentioned",
  "message_changed": "message_edited",
  "message_deleted": "message_deleted",
  "message_replied": "thread_reply",
  // Channel events
  "channel_created": "channel_created",
  "channel_deleted": "channel_deleted",
  "channel_archive": "channel_archived",
  "channel_unarchive": "channel_unarchived",
  "channel_rename": "channel_renamed",
  "channel_joined": "channel_joined",
  "channel_left": "channel_left",
  "channel_history_changed": "channel_history_changed",
  "channel_topic": "channel_topic_changed",
  "channel_purpose": "channel_purpose_changed",
  // User and member events
  "member_joined_channel": "member_joined_channel",
  "member_left_channel": "member_left_channel",
  "user_change": "user_profile_changed",
  "user_typing": "user_typing",
  "presence_change": "presence_changed",
  "manual_presence_change": "manual_presence_changed",
  "user_huddle_changed": "huddle_status_changed",
  "user_profile_changed": "profile_updated",
  "user_status_changed": "status_updated",
  // Team events
  "team_join": "team_member_joined",
  "team_rename": "team_renamed",
  "team_pref_change": "team_preferences_changed",
  "team_domain_change": "team_domain_changed",
  "team_profile_change": "team_profile_changed",
  "team_profile_delete": "team_profile_deleted",
  "team_profile_reorder": "team_profile_reordered",
  // File events
  "file_created": "file_uploaded",
  "file_shared": "file_shared",
  "file_unshared": "file_unshared",
  "file_public": "file_made_public",
  "file_private": "file_made_private",
  "file_change": "file_changed",
  "file_deleted": "file_deleted",
  "file_comment_added": "file_comment_added",
  "file_comment_edited": "file_comment_edited",
  "file_comment_deleted": "file_comment_deleted",
  // Reaction events
  "reaction_added": "reaction_added",
  "reaction_removed": "reaction_removed",
  // Star events
  "star_added": "item_starred",
  "star_removed": "item_unstarred",
  // Pin events
  "pin_added": "item_pinned",
  "pin_removed": "item_unpinned",
  // App events
  "app_installed": "app_installed",
  "app_requested": "app_requested",
  "app_uninstalled": "app_uninstalled",
  "app_uninstalled_team": "app_uninstalled_from_team",
  "app_home_opened": "app_home_opened",
  "app_rate_limited": "app_rate_limited",
  // Workflow events
  "workflow_step_execute": "workflow_step_executed",
  "workflow_step_completed": "workflow_step_completed",
  "workflow_step_failed": "workflow_step_failed",
  "workflow_published": "workflow_published",
  "workflow_unpublished": "workflow_unpublished",
  "workflow_step_deleted": "workflow_step_deleted",
  // Call events
  "call_rejected": "call_rejected",
  "call_started": "call_started",
  "call_ended": "call_ended",
  "call_participant_joined": "call_participant_joined",
  "call_participant_left": "call_participant_left",
  "call_participant_shared_screen": "screen_share_started",
  "call_participant_stopped_screen_share": "screen_share_stopped",
  // Slash command and interactive events
  "slash_command": "slash_command_used",
  "interactive_message": "interactive_message_action",
  "block_actions": "block_action_triggered",
  "view_submission": "modal_submitted",
  "view_closed": "modal_closed",
  "shortcut": "shortcut_triggered",
  "message_action": "message_action_used",
  "global_shortcut": "global_shortcut_used",
  "options_request": "options_requested",
  // DND events
  "dnd_updated": "dnd_status_updated",
  "dnd_updated_user": "user_dnd_updated",
  // Emoji events
  "emoji_added": "custom_emoji_added",
  "emoji_removed": "custom_emoji_removed",
  "emoji_renamed": "custom_emoji_renamed",
  // Group events
  "group_open": "private_channel_opened",
  "group_close": "private_channel_closed",
  "group_archive": "private_channel_archived",
  "group_unarchive": "private_channel_unarchived",
  "group_rename": "private_channel_renamed",
  "group_joined": "private_channel_joined",
  "group_left": "private_channel_left",
  // IM events
  "im_open": "direct_message_opened",
  "im_close": "direct_message_closed",
  "im_created": "direct_message_created",
  "im_history_changed": "direct_message_history_changed",
  // Subteam events
  "subteam_created": "usergroup_created",
  "subteam_updated": "usergroup_updated",
  "subteam_members_changed": "usergroup_members_changed",
  "subteam_self_added": "added_to_usergroup",
  "subteam_self_removed": "removed_from_usergroup",
  // Token events
  "tokens_revoked": "tokens_revoked",
  "scope_granted": "oauth_scope_granted",
  "scope_denied": "oauth_scope_denied",
  // Link events
  "link_shared": "link_shared",
  // Grid migration events
  "grid_migration_finished": "grid_migration_completed",
  "grid_migration_started": "grid_migration_started",
  // Resources events
  "resources_added": "resources_added",
  "resources_removed": "resources_removed",
  // Bot events
  "bot_added": "bot_added",
  "bot_changed": "bot_changed",
  "bot_removed": "bot_removed",
  // Commands events
  "commands_changed": "slash_commands_changed",
  // Email events
  "email_domain_changed": "email_domain_changed",
  // Account events
  "account_changed": "account_changed",
  // Invite events
  "invite_requested": "invite_requested",
  // External org events
  "shared_channel_invite_accepted": "shared_channel_invite_accepted",
  "shared_channel_invite_approved": "shared_channel_invite_approved",
  "shared_channel_invite_declined": "shared_channel_invite_declined",
  "shared_channel_invite_received": "shared_channel_invite_received",
  "shared_channel_invite_removed": "shared_channel_invite_removed",
  // URL verification (special case)
  "url_verification": "url_verification"
};
async function handleSlackEvent(rawBody, payload, headers, config2) {
  const signature = headers["x-slack-signature"];
  const timestamp = headers["x-slack-request-timestamp"];
  const retryNum = headers["x-slack-retry-num"];
  const retryReason = headers["x-slack-retry-reason"];
  const requestTimestamp = headers["x-slack-request-timestamp"];
  if (config2.slackSigningSecret && signature && timestamp) {
    const isValid = await verifySlackSignature(
      rawBody,
      timestamp,
      signature,
      config2.slackSigningSecret
    );
    if (!isValid) {
      return {
        isValid: false,
        error: "Invalid Slack signature"
      };
    }
  }
  if (payload.type === "url_verification") {
    return {
      isValid: true,
      eventType: "url_verification",
      challenge: payload.challenge
    };
  }
  const metadata = extractSlackMetadata(payload);
  let workspace = null;
  let workspaceId = null;
  let workspaceDomain = null;
  let channel = null;
  let channelId = null;
  let channelType = null;
  let actor = null;
  let actorId = null;
  let actorName = null;
  let actorRealName = null;
  let actorIsBot = false;
  let actorIsApp = false;
  let appId = null;
  let botId = null;
  if (payload.team_id) {
    workspaceId = payload.team_id;
    workspace = payload.team?.name || payload.team_id;
    workspaceDomain = payload.team?.domain;
  } else if (payload.team) {
    workspaceId = payload.team.id;
    workspace = payload.team.name || payload.team.domain;
    workspaceDomain = payload.team.domain;
  }
  if (payload.event) {
    if (payload.event.channel) {
      channelId = payload.event.channel;
      channelType = payload.event.channel_type || determineChannelType2(payload.event.channel);
    } else if (payload.event.item?.channel) {
      channelId = payload.event.item.channel;
      channelType = determineChannelType2(payload.event.item.channel);
    }
    if (payload.event.user) {
      actorId = payload.event.user;
    } else if (payload.event.user_id) {
      actorId = payload.event.user_id;
    } else if (payload.event.bot_id) {
      botId = payload.event.bot_id;
      actorId = payload.event.bot_id;
      actorIsBot = true;
    }
  } else if (payload.channel_id || payload.channel) {
    channelId = payload.channel_id || payload.channel?.id;
    channel = payload.channel?.name;
    channelType = payload.channel?.type || determineChannelType2(channelId);
  }
  if (payload.user_id) {
    actorId = payload.user_id;
    actorName = payload.user_name;
  } else if (payload.user) {
    actorId = payload.user.id || payload.user.user_id;
    actorName = payload.user.name || payload.user.username;
    actorRealName = payload.user.real_name;
    if (payload.user.is_bot) {
      actorIsBot = true;
    }
  }
  if (payload.api_app_id) {
    appId = payload.api_app_id;
    actorIsApp = true;
  }
  let eventType = "unknown";
  let eventSubtype = null;
  let interactionType = null;
  if (payload.event && payload.event.type) {
    eventType = payload.event.type;
    eventSubtype = payload.event.subtype;
  } else if (payload.type === "event_callback" && payload.event) {
    eventType = payload.event.type;
    eventSubtype = payload.event.subtype;
  } else if (payload.type === "block_actions") {
    eventType = "block_actions";
    interactionType = "block_action";
  } else if (payload.type === "view_submission") {
    eventType = "view_submission";
    interactionType = "modal_submit";
  } else if (payload.type === "view_closed") {
    eventType = "view_closed";
    interactionType = "modal_close";
  } else if (payload.type === "shortcut") {
    eventType = "shortcut";
    interactionType = payload.callback_id;
  } else if (payload.type === "message_action") {
    eventType = "message_action";
    interactionType = payload.callback_id;
  } else if (payload.type === "slash_command") {
    eventType = "slash_command";
    interactionType = payload.command;
  } else if (payload.type === "interactive_message") {
    eventType = "interactive_message";
    interactionType = payload.callback_id;
  } else if (payload.type) {
    eventType = payload.type;
  }
  let specificEventType = eventType;
  if (eventSubtype) {
    const combinedType = `${eventType}.${eventSubtype}`;
    if (SLACK_EVENT_MAPPING[combinedType]) {
      specificEventType = SLACK_EVENT_MAPPING[combinedType];
    } else if (SLACK_EVENT_MAPPING[eventType]) {
      specificEventType = SLACK_EVENT_MAPPING[eventType];
    }
  } else if (SLACK_EVENT_MAPPING[eventType]) {
    specificEventType = SLACK_EVENT_MAPPING[eventType];
  }
  let additionalContext = {};
  if (eventType === "message" || eventType.startsWith("message")) {
    const msg = payload.event || payload;
    additionalContext = {
      message_text: msg.text,
      message_ts: msg.ts,
      message_thread_ts: msg.thread_ts,
      message_is_thread_reply: !!msg.thread_ts,
      message_subtype: msg.subtype,
      message_edited: msg.edited ? true : false,
      message_hidden: msg.hidden,
      message_deleted: msg.deleted,
      message_pinned: msg.pinned,
      message_reactions: msg.reactions?.map((r) => ({ name: r.name, count: r.count })) || [],
      message_files: msg.files?.map((f) => ({ id: f.id, name: f.name, mimetype: f.mimetype })) || [],
      message_attachments_count: msg.attachments?.length || 0,
      message_blocks_count: msg.blocks?.length || 0,
      message_bot_id: msg.bot_id,
      message_app_id: msg.app_id,
      message_mentions: extractMentions(msg.text || ""),
      message_links: extractLinks(msg.text || "")
    };
  } else if (eventType === "reaction_added" || eventType === "reaction_removed") {
    additionalContext = {
      reaction_name: payload.event.reaction,
      reaction_item_type: payload.event.item?.type,
      reaction_item_channel: payload.event.item?.channel,
      reaction_item_ts: payload.event.item?.ts,
      reaction_item_file: payload.event.item?.file,
      reaction_item_file_comment: payload.event.item?.file_comment
    };
  } else if (eventType === "file_created" || eventType === "file_shared" || eventType === "file_change") {
    const file = payload.event.file || payload.event;
    additionalContext = {
      file_id: file.id,
      file_name: file.name,
      file_title: file.title,
      file_mimetype: file.mimetype,
      file_size: file.size,
      file_is_public: file.is_public,
      file_is_external: file.is_external,
      file_channels: file.channels || [],
      file_groups: file.groups || [],
      file_ims: file.ims || [],
      file_comments_count: file.comments_count || 0,
      file_initial_comment: file.initial_comment?.comment,
      file_shares: file.shares ? Object.keys(file.shares).length : 0
    };
  } else if (eventType === "channel_created" || eventType === "channel_rename") {
    const chan = payload.event.channel || payload.event;
    additionalContext = {
      channel_id: chan.id,
      channel_name: chan.name,
      channel_name_previous: chan.name_previous,
      channel_created: chan.created,
      channel_creator: chan.creator,
      channel_is_private: chan.is_private,
      channel_is_shared: chan.is_shared,
      channel_is_org_shared: chan.is_org_shared,
      channel_is_archived: chan.is_archived
    };
  } else if (eventType === "team_join" || eventType === "user_change") {
    const user = payload.event.user || payload.event;
    additionalContext = {
      user_id: user.id,
      user_name: user.name,
      user_real_name: user.real_name,
      user_display_name: user.profile?.display_name,
      user_email: user.profile?.email,
      user_title: user.profile?.title,
      user_status_text: user.profile?.status_text,
      user_status_emoji: user.profile?.status_emoji,
      user_is_admin: user.is_admin,
      user_is_owner: user.is_owner,
      user_is_primary_owner: user.is_primary_owner,
      user_is_restricted: user.is_restricted,
      user_is_ultra_restricted: user.is_ultra_restricted,
      user_is_bot: user.is_bot,
      user_is_app_user: user.is_app_user,
      user_has_2fa: user.has_2fa,
      user_timezone: user.tz,
      user_locale: user.locale
    };
  } else if (eventType === "app_mention") {
    additionalContext = {
      mention_text: payload.event.text,
      mention_ts: payload.event.ts,
      mention_thread_ts: payload.event.thread_ts,
      mention_is_thread_reply: !!payload.event.thread_ts,
      mention_channel: payload.event.channel,
      mention_team: payload.event.team
    };
  } else if (eventType === "block_actions" && payload.actions) {
    additionalContext = {
      action_count: payload.actions.length,
      actions: payload.actions.map((action) => ({
        action_id: action.action_id,
        block_id: action.block_id,
        type: action.type,
        value: action.value || action.selected_option?.value || action.selected_date || action.selected_time,
        action_ts: action.action_ts
      })),
      response_url: payload.response_url,
      trigger_id: payload.trigger_id,
      container_type: payload.container?.type,
      container_message_ts: payload.container?.message_ts,
      view_id: payload.view?.id,
      view_callback_id: payload.view?.callback_id
    };
  } else if (eventType === "view_submission" && payload.view) {
    additionalContext = {
      view_id: payload.view.id,
      view_callback_id: payload.view.callback_id,
      view_type: payload.view.type,
      view_private_metadata: payload.view.private_metadata,
      view_state_values: Object.keys(payload.view.state?.values || {}),
      response_urls: payload.response_urls?.length || 0,
      trigger_id: payload.trigger_id
    };
  } else if (eventType === "slash_command") {
    additionalContext = {
      command: payload.command,
      command_text: payload.text,
      response_url: payload.response_url,
      trigger_id: payload.trigger_id
    };
  }
  if (retryNum) {
    additionalContext.retry_number = parseInt(retryNum);
    additionalContext.retry_reason = retryReason;
  }
  let enterpriseId = null;
  let enterpriseName = null;
  if (payload.enterprise || payload.enterprise_id) {
    enterpriseId = payload.enterprise_id || payload.enterprise?.id;
    enterpriseName = payload.enterprise?.name;
  }
  return {
    isValid: true,
    eventType: specificEventType,
    repository: workspace,
    // Using workspace as repository equivalent
    repositoryId: workspaceId,
    channel,
    channelId,
    channelType,
    actor: actorName || actorId,
    actorId,
    actorName,
    actorRealName,
    actorIsBot,
    actorIsApp,
    appId,
    botId,
    enterpriseId,
    enterpriseName,
    workspaceDomain,
    timestamp: requestTimestamp,
    metadata,
    additionalContext,
    rawEventType: eventType,
    eventSubtype,
    interactionType,
    eventId: payload.event_id,
    eventTime: payload.event_time
  };
}
__name(handleSlackEvent, "handleSlackEvent");
function determineChannelType2(channelId) {
  if (!channelId) return null;
  if (channelId.startsWith("C")) return "public_channel";
  if (channelId.startsWith("G")) return "private_channel";
  if (channelId.startsWith("D")) return "im";
  if (channelId.startsWith("M")) return "mpim";
  return "unknown";
}
__name(determineChannelType2, "determineChannelType");
function extractMentions(text) {
  const mentions = [];
  const userMentionRegex = /<@([UW][A-Z0-9]+)(\|([^>]+))?>/g;
  const channelMentionRegex = /<#([CG][A-Z0-9]+)(\|([^>]+))?>/g;
  const specialMentionRegex = /<!([^>]+)(\|([^>]+))?>/g;
  let match;
  while ((match = userMentionRegex.exec(text)) !== null) {
    mentions.push({
      type: "user",
      id: match[1],
      name: match[3] || null
    });
  }
  while ((match = channelMentionRegex.exec(text)) !== null) {
    mentions.push({
      type: "channel",
      id: match[1],
      name: match[3] || null
    });
  }
  while ((match = specialMentionRegex.exec(text)) !== null) {
    mentions.push({
      type: "special",
      name: match[1],
      label: match[3] || null
    });
  }
  return mentions;
}
__name(extractMentions, "extractMentions");
function extractLinks(text) {
  const links = [];
  const linkRegex = /<(https?:\/\/[^|>]+)(\|([^>]+))?>/g;
  let match;
  while ((match = linkRegex.exec(text)) !== null) {
    links.push({
      url: match[1],
      label: match[3] || null
    });
  }
  return links;
}
__name(extractLinks, "extractLinks");

// src/worker.js
var router = e();
var eventQueue = [];
var batchTimer = null;
var config;
var isInitialized = false;
async function initialize(env) {
  if (!isInitialized) {
    config = getConfig(env);
    validateConfig(config);
    initSupabase(config);
    isInitialized = true;
  }
  return config;
}
__name(initialize, "initialize");
function debugLog(level, message, data = null) {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (data) {
    console.log(logEntry, JSON.stringify(data, null, 2));
  } else {
    console.log(logEntry);
  }
}
__name(debugLog, "debugLog");
router.get("/health", async (request, env) => {
  try {
    await initialize(env);
    return new Response(JSON.stringify({
      status: "healthy",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      version: "2.0",
      worker: config.workerId,
      environment: config.workerEnvironment
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: "unhealthy",
      error: error.message,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }
});
router.get("/metrics", async (request, env) => {
  try {
    await initialize(env);
    const metrics = {
      queue_size: eventQueue.length,
      processed_total: 0,
      // Would need to track this
      failed_total: 0,
      // Would need to track this
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    return new Response(JSON.stringify({ metrics }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
router.post("/webhook/github", async (request, env) => {
  try {
    await initialize(env);
    debugLog("info", "GitHub webhook received");
    const clonedRequest = request.clone();
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);
    const headers = Object.fromEntries(clonedRequest.headers);
    debugLog("debug", "GitHub payload received", {
      event: headers["x-github-event"],
      action: payload.action,
      repository: payload.repository?.full_name
    });
    const result = await handleGitHubEvent(rawBody, payload, headers, config);
    if (!result.isValid) {
      debugLog("warn", "GitHub signature validation failed", result.error);
      return new Response(JSON.stringify({ error: result.error }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    debugLog("info", "GitHub event processed", {
      eventType: result.eventType,
      repository: result.repository,
      actor: result.actor
    });
    await processEvent("github", result, env);
    return new Response(JSON.stringify({
      success: true,
      event: result.eventType
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    debugLog("error", "GitHub webhook error", error.message);
    console.error("GitHub webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
router.post("/webhook/linear", async (request, env) => {
  try {
    await initialize(env);
    debugLog("info", "Linear webhook received");
    const clonedRequest = request.clone();
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);
    const headers = Object.fromEntries(clonedRequest.headers);
    debugLog("debug", "Linear payload received", {
      type: payload.type,
      action: payload.action,
      organizationId: payload.organizationId,
      webhookId: payload.webhookId,
      dataId: payload.data?.id,
      dataTitle: payload.data?.title,
      dataIdentifier: payload.data?.identifier
    });
    const result = await handleLinearEvent(rawBody, payload, headers, config);
    if (!result.isValid) {
      debugLog("warn", "Linear signature validation failed", result.error);
      return new Response(JSON.stringify({ error: result.error }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    debugLog("info", "Linear event processed", {
      eventType: result.eventType,
      targetEntity: result.targetEntity,
      organization: result.organization,
      actor: result.actor
    });
    await processEvent("linear", result, env);
    debugLog("info", "Linear event stored successfully");
    return new Response(JSON.stringify({
      success: true,
      event: result.eventType
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    debugLog("error", "Linear webhook error", error.message);
    console.error("Linear webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
router.post("/webhook/slack", async (request, env) => {
  try {
    await initialize(env);
    debugLog("info", "Slack webhook received");
    const clonedRequest = request.clone();
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);
    const headers = Object.fromEntries(clonedRequest.headers);
    debugLog("debug", "Slack payload received", {
      type: payload.type,
      event: payload.event?.type,
      team: payload.team_id,
      user: payload.event?.user || payload.user_id
    });
    const result = await handleSlackEvent(rawBody, payload, headers, config);
    if (!result.isValid) {
      debugLog("warn", "Slack signature validation failed", result.error);
      return new Response(JSON.stringify({ error: result.error }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (result.eventType === "url_verification") {
      debugLog("info", "Slack URL verification challenge received");
      return new Response(result.challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" }
      });
    }
    debugLog("info", "Slack event processed", {
      eventType: result.eventType,
      workspace: result.repository,
      actor: result.actor
    });
    await processEvent("slack", result, env);
    return new Response(JSON.stringify({
      success: true,
      event: result.eventType
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    debugLog("error", "Slack webhook error", error.message);
    console.error("Slack webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
async function processEvent(source, eventData, env) {
  try {
    debugLog("info", `Processing ${source} event`, {
      eventType: eventData.eventType,
      batchingEnabled: config.enableBatching
    });
    const event = {
      source,
      event_type: eventData.eventType,
      payload: eventData,
      repository: eventData.repository,
      repository_id: eventData.repositoryId,
      organization: eventData.organization,
      organization_id: eventData.organizationId,
      actor: eventData.actor,
      actor_id: eventData.actorId,
      actor_type: eventData.actorType,
      actor_email: eventData.actorEmail,
      channel: eventData.channel,
      channel_id: eventData.channelId,
      channel_type: eventData.channelType,
      target_entity: eventData.targetEntity,
      target_entity_id: eventData.targetEntityId,
      target_entity_type: eventData.targetEntityType,
      headers: eventData.headers,
      metadata: eventData.metadata,
      additional_context: eventData.additionalContext,
      raw_event_type: eventData.rawEventType,
      action: eventData.action,
      delivery_id: eventData.deliveryId,
      webhook_id: eventData.webhookId,
      timestamp: eventData.timestamp,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (config.enableBatching) {
      eventQueue.push(event);
      debugLog("info", `Event added to batch queue (${eventQueue.length}/${config.batchSize})`);
      if (eventQueue.length >= config.batchSize) {
        debugLog("info", "Batch queue full, processing batch");
        await processBatch(env);
      } else {
        if (!batchTimer) {
          debugLog("info", `Setting batch timer for ${config.batchInterval}ms`);
          batchTimer = setTimeout(async () => {
            await processBatch(env);
          }, config.batchInterval);
        }
      }
    } else {
      debugLog("info", "Processing event immediately (batching disabled)");
      const result = await storeEvent(event, config);
      debugLog("info", "Event stored", { success: result.success, duplicate: result.duplicate });
    }
  } catch (error) {
    debugLog("error", "Error processing event", error.message);
    throw error;
  }
}
__name(processEvent, "processEvent");
async function processBatch(env) {
  if (eventQueue.length === 0) return;
  debugLog("info", `Processing batch of ${eventQueue.length} events`);
  const events = [...eventQueue];
  eventQueue.length = 0;
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }
  try {
    const result = await storeBatchEvents(events, config);
    debugLog("info", "Batch processed", {
      stored: result.stored?.length || 0,
      duplicates: result.duplicates?.length || 0,
      failed: result.failed?.length || 0
    });
  } catch (error) {
    debugLog("error", "Batch processing error", error.message);
    console.error("Batch processing error:", error);
    eventQueue.unshift(...events);
  }
}
__name(processBatch, "processBatch");
router.all("*", () => new Response("Not Found", { status: 404 }));
var worker_default = {
  async fetch(request, env, ctx) {
    try {
      return await router.handle(request, env, ctx);
    } catch (error) {
      debugLog("error", "Worker error", error.message);
      console.error("Worker error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
  async scheduled(event, env, ctx) {
    await initialize(env);
    if (eventQueue.length > 0) {
      ctx.waitUntil(processBatch(env));
    }
    console.log("Scheduled event triggered:", event.cron);
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e2) {
      console.error("Failed to drain the unused request body.", e2);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e2) {
  return {
    name: e2?.name,
    message: e2?.message ?? String(e2),
    stack: e2?.stack,
    cause: e2?.cause === void 0 ? void 0 : reduceError(e2.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e2) {
    const error = reduceError(e2);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-z1ww6Z/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-z1ww6Z/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
