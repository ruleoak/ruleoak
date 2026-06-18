import { ToolManifest } from "./tool-manifest.js";
import { ToolGuard } from "./tool-guard.js";
import { McpServerManifest } from "./mcp-manifest.js";

export class McpGuard {
  constructor({ server = {}, manifest = null, policy = {}, runId, actor = "mcp-client" } = {}) {
    this.serverManifest = manifest instanceof McpServerManifest ? manifest : McpServerManifest.fromObject(server);
    this.server = { name: this.serverManifest.name, version: this.serverManifest.version, ...server };
    this.manifest = this.serverManifest.toToolManifest ? this.serverManifest.toToolManifest() : ToolManifest.fromMcpServer(server);
    this.guard = new ToolGuard({ manifest: this.manifest, policy, runId, actor });
    this.requestDecisions = [];
  }

  static fromServerFile(path, options = {}) {
    const manifest = McpServerManifest.fromFile(path);
    return new McpGuard({ ...options, manifest });
  }

  evaluateMcpToolCall({ name, arguments: args = {}, subject, actor, metadata = {} } = {}) {
    if (!name) throw new Error("MCP tool call must include name");
    const decision = this.guard.evaluateToolCall({
      toolId: name,
      subject: subject || metadata.subject || null,
      actor,
      inputPreview: Object.keys(args).slice(0, 12),
      metadata: { ...metadata, mcp: true, method: "tools/call", argumentKeys: Object.keys(args).slice(0, 12) }
    });
    this.requestDecisions.push({ method: "tools/call", tool: name, decision: decision.decision, requestId: decision.requestId });
    return decision;
  }

  evaluateMcpRequest(request = {}) {
    const method = request.method || request.type;
    const params = request.params || {};
    if (method === "tools/call") {
      return this.evaluateMcpToolCall({
        name: params.name || request.name,
        arguments: params.arguments || request.arguments || {},
        subject: params.subject || request.subject,
        actor: request.actor,
        metadata: { requestId: request.id || null, jsonrpc: request.jsonrpc || null, originalMethod: method }
      });
    }
    const toolId = `mcp.${method || "unknown"}`;
    const decision = this.guard.evaluateToolCall({
      toolId,
      subject: params.subject || null,
      actor: request.actor,
      inputPreview: Object.keys(params).slice(0, 12),
      metadata: { mcp: true, method: method || "unknown", requestId: request.id || null }
    });
    this.requestDecisions.push({ method: method || "unknown", tool: toolId, decision: decision.decision, requestId: decision.requestId });
    return decision;
  }

  evaluateBatch(requests = []) {
    if (!Array.isArray(requests)) throw new Error("evaluateBatch expects an array");
    return requests.map((request) => request.method || request.params ? this.evaluateMcpRequest(request) : this.evaluateMcpToolCall(request));
  }

  inspect() {
    return { stage: "mcp-guard-pack", server: this.serverManifest.inspect(), policyBoundary: this.guard.policyEngine.boundary() };
  }

  report(options = {}) {
    const report = this.guard.report({ title: "RuleOak MCP Guard Report", summary: "MCP-style tool calls evaluated before execution.", ...options });
    return {
      ...report,
      runtimeStage: "mcp-guard-pack",
      mcp: {
        server: this.serverManifest.inspect(),
        requestDecisionCount: this.requestDecisions.length,
        requestDecisions: [...this.requestDecisions]
      },
      boundaryNote: "MCP Guard evaluates MCP-style tool requests before execution. It does not run an MCP server or execute remote tools."
    };
  }
}
