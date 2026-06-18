import { McpGuard } from "./mcp-guard.js";

export class McpGuardProxy {
  constructor({ guard, serverHandler, server = {}, manifest = null, policy = {}, actor = "mcp-proxy" } = {}) {
    this.guard = guard instanceof McpGuard ? guard : new McpGuard({ server, manifest, policy, actor });
    this.serverHandler = serverHandler || (async () => ({ ok: true, dryRun: true }));
    this.records = [];
  }

  async handleJsonRpc(request = {}) {
    if (request.jsonrpc !== "2.0") throw new Error("McpGuardProxy expects JSON-RPC 2.0 request objects");
    if (request.method !== "tools/call") {
      return { jsonrpc: "2.0", id: request.id ?? null, error: { code: -32601, message: `Unsupported method: ${request.method}` } };
    }
    const decision = this.guard.evaluateMcpRequest(request);
    const base = { requestId: decision.requestId, method: request.method, tool: request.params?.name || request.params?.tool || null, decision: decision.decision, reason: decision.reason };
    if (decision.blocked) {
      const response = { jsonrpc: "2.0", id: request.id ?? null, error: { code: -32003, message: "RuleOak blocked MCP tool call", data: base } };
      this.records.push({ ...base, responseType: "blocked" });
      return response;
    }
    if (decision.approvalRequired) {
      const response = { jsonrpc: "2.0", id: request.id ?? null, error: { code: -32001, message: "RuleOak approval required before MCP tool call", data: base } };
      this.records.push({ ...base, responseType: "approval_required" });
      return response;
    }
    const result = await this.serverHandler(request, decision);
    this.guard.guard.auditLog.record("mcp_proxy.forwarded", { requestId: decision.requestId, tool: base.tool, decision: decision.decision });
    this.records.push({ ...base, responseType: "forwarded" });
    return { jsonrpc: "2.0", id: request.id ?? null, result: { ruleoak: base, server: result } };
  }

  async handleBatch(requests = []) {
    if (!Array.isArray(requests)) throw new Error("handleBatch expects an array");
    return Promise.all(requests.map((request) => this.handleJsonRpc(request)));
  }

  report(options = {}) {
    const report = this.guard.report({ title: "RuleOak MCP Guard Proxy Report", summary: "JSON-RPC MCP tool-call requests governed before forwarding.", ...options });
    return { ...report, runtimeStage: "mcp-guard-proxy", mcpProxy: { records: [...this.records], forwarded: this.records.filter((r) => r.responseType === "forwarded").length, approvalRequired: this.records.filter((r) => r.responseType === "approval_required").length, blocked: this.records.filter((r) => r.responseType === "blocked").length }, boundaryNote: "MCP Guard Proxy is a local in-process prototype. It does not open a network listener or execute untrusted external tools." };
  }
}
