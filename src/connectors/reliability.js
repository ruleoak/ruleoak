const SECRET_KEYS = /(^|_|-)(token|authorization|api[_-]?token|password|secret|cookie|set-cookie|x-api-key)($|_|-)/i;
const READ_ONLY_METHODS = new Set(["GET", "HEAD"]);

export class ConnectorReliabilityError extends Error {
  constructor(message, { status = null, statusText = "", url = null, method = "GET", rateLimited = false, retryAfter = null, cause = null } = {}) {
    super(message);
    this.name = "ConnectorReliabilityError";
    this.status = status;
    this.statusText = statusText;
    this.url = url;
    this.method = method;
    this.rateLimited = rateLimited;
    this.retryAfter = retryAfter;
    if (cause) this.cause = cause;
  }
}

export function redactSecret(value) {
  if (value == null) return value;
  if (typeof value === "string") {
    return value
      .replace(/Bearer\s+[A-Za-z0-9._~+\-/]+=*/gi, "Bearer [REDACTED]")
      .replace(/Basic\s+[A-Za-z0-9+/]+=*/gi, "Basic [REDACTED]")
      .replace(/([?&](?:token|api_token|apiToken|password|secret|key)=)[^&\s]+/gi, "$1[REDACTED]")
      .replace(/([A-Za-z0-9._%+-]+):([^@\s]+)@/g, "$1:[REDACTED]@");
  }
  if (Array.isArray(value)) return value.map(redactSecret);
  if (typeof value === "object") {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      out[key] = SECRET_KEYS.test(key) ? "[REDACTED]" : redactSecret(child);
    }
    return out;
  }
  return value;
}

export function enforceReadOnlyRequest({ method = "GET" } = {}) {
  const normalized = String(method || "GET").toUpperCase();
  if (!READ_ONLY_METHODS.has(normalized)) {
    throw new ConnectorReliabilityError(`Connector request blocked because ${normalized} is not read-only`, { method: normalized });
  }
  return normalized;
}

export function parseRetryAfter(value) {
  if (!value) return null;
  const asNumber = Number(value);
  if (Number.isFinite(asNumber)) return Math.max(0, asNumber);
  const asDate = Date.parse(value);
  if (Number.isFinite(asDate)) return Math.max(0, Math.ceil((asDate - Date.now()) / 1000));
  return null;
}

export function parseGitHubRateLimit(headers = {}) {
  const get = typeof headers.get === "function" ? (name) => headers.get(name) : (name) => headers[name] ?? headers[name.toLowerCase()];
  const limit = Number(get("x-ratelimit-limit"));
  const remaining = Number(get("x-ratelimit-remaining"));
  const reset = Number(get("x-ratelimit-reset"));
  const resource = get("x-ratelimit-resource") || null;
  return {
    limit: Number.isFinite(limit) ? limit : null,
    remaining: Number.isFinite(remaining) ? remaining : null,
    resetEpochSeconds: Number.isFinite(reset) ? reset : null,
    resource,
    nearLimit: Number.isFinite(remaining) ? remaining <= 1 : false
  };
}

export function connectorReliabilityPolicy({ timeoutMs = 10000, maxAttempts = 2, pageSize = 50, maxPages = 5, maxRecords = 100 } = {}) {
  return {
    schema: "ruleoak.connector_reliability_policy.v1",
    readOnlyMethods: ["GET", "HEAD"],
    timeoutMs,
    maxAttempts,
    pageSize,
    maxPages,
    maxRecords,
    tokenRedaction: true,
    writesAllowed: false
  };
}

export function buildPagePlan({ limit = 10, pageSize = 50, maxPages = 5, maxRecords = 100 } = {}) {
  const boundedLimit = Math.max(0, Math.min(Number(limit || 0), Number(maxRecords || 100)));
  if (boundedLimit === 0) return [];
  const perPage = Math.max(1, Math.min(Number(pageSize || 50), boundedLimit));
  const pageCount = Math.min(Math.ceil(boundedLimit / perPage), Number(maxPages || 1));
  return Array.from({ length: pageCount }, (_, index) => ({ page: index + 1, perPage, remainingLimit: Math.max(0, boundedLimit - index * perPage) }));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(fetchImpl, url, options, timeoutMs) {
  if (!timeoutMs || timeoutMs <= 0 || typeof AbortController === "undefined") {
    return fetchImpl(url, options);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new ConnectorReliabilityError(`Connector request timed out after ${timeoutMs}ms`, { url: redactSecret(url), method: options?.method || "GET", cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchJsonReadOnly({ fetchImpl = globalThis.fetch, url, headers = {}, timeoutMs = 10000, maxAttempts = 2, retryDelayMs = 100, method = "GET" } = {}) {
  const normalizedMethod = enforceReadOnlyRequest({ method });
  if (typeof fetchImpl !== "function") throw new ConnectorReliabilityError("Connector requires fetch support or a fetchImpl", { method: normalizedMethod });
  const safeUrl = redactSecret(String(url));
  let lastError = null;
  for (let attempt = 1; attempt <= Math.max(1, maxAttempts); attempt += 1) {
    try {
      const response = await fetchWithTimeout(fetchImpl, url, { method: normalizedMethod, headers }, timeoutMs);
      const retryAfter = parseRetryAfter(typeof response.headers?.get === "function" ? response.headers.get("retry-after") : response.headers?.["retry-after"]);
      const rateLimited = response.status === 429 || (response.status === 403 && retryAfter != null);
      if (!response.ok) {
        const message = `Read-only connector request failed: ${response.status}`;
        throw new ConnectorReliabilityError(message, {
          status: response.status,
          statusText: redactSecret(response.statusText || ""),
          url: safeUrl,
          method: normalizedMethod,
          rateLimited,
          retryAfter
        });
      }
      const data = await response.json();
      return { data, response, attempts: attempt, rateLimit: parseGitHubRateLimit(response.headers || {}) };
    } catch (error) {
      lastError = error instanceof ConnectorReliabilityError ? error : new ConnectorReliabilityError(redactSecret(error?.message || String(error)), { url: safeUrl, method: normalizedMethod, cause: error });
      if (attempt >= maxAttempts) break;
      if (lastError.status && ![408, 429, 500, 502, 503, 504].includes(lastError.status)) break;
      await sleep(retryDelayMs * attempt);
    }
  }
  throw lastError;
}

export function connectorDiagnosticRecord({ connector, mode = "read_only", requestCount = 0, pageCount = 0, recordCount = 0, errors = [], rateLimit = null, timeoutMs = null, maxAttempts = null } = {}) {
  return {
    schema: "ruleoak.connector_diagnostic.v1",
    connector,
    mode,
    writes: false,
    requestCount,
    pageCount,
    recordCount,
    errorCount: errors.length,
    errors: redactSecret(errors),
    rateLimit: redactSecret(rateLimit),
    timeoutMs,
    maxAttempts,
    generatedAt: new Date().toISOString()
  };
}
