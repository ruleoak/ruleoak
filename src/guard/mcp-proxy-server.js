import http from "node:http";
import { McpGuardProxy } from "./mcp-proxy.js";

function readJsonBody(request, { maxBytes = 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > maxBytes) {
        reject(Object.assign(new Error("Request body too large"), { statusCode: 413 }));
        request.destroy();
      }
    });
    request.on("end", () => {
      if (!body.trim()) return resolve({});
      try { resolve(JSON.parse(body)); }
      catch (error) { reject(Object.assign(new Error(`Invalid JSON: ${error.message}`), { statusCode: 400 })); }
    });
    request.on("error", reject);
  });
}

function sendJson(response, statusCode, payload) {
  const text = JSON.stringify(payload, null, 2);
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(text);
}

export class McpGuardProxyServer {
  constructor({ proxy, manifest, policy, serverHandler, host = "127.0.0.1", port = 0, actor = "mcp-proxy-server", maxBytes = 1024 * 1024 } = {}) {
    this.proxy = proxy instanceof McpGuardProxy ? proxy : new McpGuardProxy({ manifest, policy, serverHandler, actor });
    this.host = host;
    this.port = port;
    this.maxBytes = maxBytes;
    this.server = null;
  }

  async start() {
    if (this.server) return this.address();
    this.server = http.createServer(async (request, response) => {
      try {
        if (request.method === "GET" && request.url === "/health") {
          return sendJson(response, 200, { ok: true, service: "ruleoak-mcp-guard-proxy", boundary: "local-only" });
        }
        if (request.method !== "POST" || request.url !== "/rpc") {
          return sendJson(response, 404, { error: "not_found", message: "Use POST /rpc for JSON-RPC MCP tool calls." });
        }
        const payload = await readJsonBody(request, { maxBytes: this.maxBytes });
        const result = Array.isArray(payload) ? await this.proxy.handleBatch(payload) : await this.proxy.handleJsonRpc(payload);
        return sendJson(response, 200, result);
      } catch (error) {
        return sendJson(response, error.statusCode || 500, { error: "ruleoak_proxy_error", message: error.message });
      }
    });
    await new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(this.port, this.host, () => resolve());
    });
    return this.address();
  }

  address() {
    if (!this.server) return null;
    const address = this.server.address();
    return { host: address.address, port: address.port, url: `http://${address.address}:${address.port}` };
  }

  async stop() {
    if (!this.server) return;
    const server = this.server;
    this.server = null;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }

  report(options = {}) {
    return { ...this.proxy.report(options), runtimeStage: "mcp-guard-proxy-server", serverBoundary: { host: this.host, port: this.port, network: "local loopback only", endpoint: "POST /rpc", writes: "not performed by proxy" } };
  }
}
