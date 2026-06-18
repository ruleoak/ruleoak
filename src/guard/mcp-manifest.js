import { readFileSync } from "node:fs";
import { ToolManifest } from "./tool-manifest.js";

export function normalizeMcpTool(tool = {}) {
  const name = tool.name || tool.id;
  if (!name) throw new Error("MCP tool must include name or id");
  return {
    name,
    description: tool.description || "",
    inputSchema: tool.inputSchema || tool.input_schema || tool.schema || null,
    annotations: tool.annotations || {},
    metadata: tool.metadata || {}
  };
}

export class McpServerManifest {
  constructor({ name = "mcp-server", version = "unknown", tools = [], resources = [], prompts = [], metadata = {} } = {}) {
    this.name = name;
    this.version = version;
    this.tools = tools.map(normalizeMcpTool);
    this.resources = Array.isArray(resources) ? resources : [];
    this.prompts = Array.isArray(prompts) ? prompts : [];
    this.metadata = metadata;
  }

  static fromObject(value = {}) {
    const serverInfo = value.serverInfo || value.server_info || {};
    return new McpServerManifest({
      name: value.name || value.id || serverInfo.name || "mcp-server",
      version: value.version || serverInfo.version || "unknown",
      tools: Array.isArray(value.tools) ? value.tools : [],
      resources: Array.isArray(value.resources) ? value.resources : [],
      prompts: Array.isArray(value.prompts) ? value.prompts : [],
      metadata: value.metadata || {}
    });
  }

  static fromFile(path) {
    return McpServerManifest.fromObject(JSON.parse(readFileSync(path, "utf8")));
  }

  toToolManifest() {
    return new ToolManifest({
      tools: this.tools.map((tool) => ({
        id: tool.name,
        name: tool.name,
        description: tool.description,
        kind: "mcp_tool",
        inputSchema: tool.inputSchema,
        metadata: { ...tool.metadata, mcp: true, server: this.name, serverVersion: this.version, annotations: tool.annotations }
      })),
      metadata: { source: "mcp", server: this.name, serverVersion: this.version, ...this.metadata }
    });
  }

  inspect() {
    return {
      name: this.name,
      version: this.version,
      toolCount: this.tools.length,
      resourceCount: this.resources.length,
      promptCount: this.prompts.length,
      tools: this.tools.map((tool) => tool.name)
    };
  }
}
