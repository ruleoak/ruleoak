import { readFileSync } from "node:fs";

export function normalizeTool(tool = {}) {
  const id = tool.id || tool.name || tool.toolId;
  if (!id) throw new Error("tool must include id or name");
  return {
    id,
    name: tool.name || id,
    description: tool.description || "",
    kind: tool.kind || tool.type || "tool",
    risk: tool.risk || "auto",
    capabilities: Array.isArray(tool.capabilities) ? tool.capabilities : [],
    inputSchema: tool.inputSchema || tool.input_schema || tool.schema || null,
    metadata: tool.metadata || {}
  };
}

export class ToolManifest {
  constructor({ tools = [], metadata = {} } = {}) {
    this.tools = tools.map(normalizeTool);
    this.metadata = metadata;
  }

  static fromObject(value = {}) {
    const tools = Array.isArray(value.tools) ? value.tools : [];
    return new ToolManifest({ tools, metadata: value.metadata || {} });
  }

  static fromFile(path) {
    return ToolManifest.fromObject(JSON.parse(readFileSync(path, "utf8")));
  }

  static fromMcpServer(server = {}) {
    const tools = Array.isArray(server.tools) ? server.tools.map((tool) => ({
      id: tool.name || tool.id,
      name: tool.name || tool.id,
      description: tool.description || "",
      kind: "mcp_tool",
      inputSchema: tool.inputSchema || tool.input_schema || null,
      metadata: { mcp: true, server: server.name || server.id || "mcp-server" }
    })) : [];
    return new ToolManifest({ tools, metadata: { source: "mcp", server: server.name || server.id || "mcp-server" } });
  }

  get(toolId) {
    return this.tools.find((tool) => tool.id === toolId || tool.name === toolId) || null;
  }

  list() {
    return [...this.tools];
  }
}
