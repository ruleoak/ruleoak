import { ToolGuard } from "../guard/tool-guard.js";

export function createLangGraphToolGuard({ guard, manifest, policy, actor = "langgraph-agent" } = {}) {
  return guard instanceof ToolGuard ? guard : new ToolGuard({ manifest, policy, actor });
}

export function wrapLangGraphTool({ name, tool, guard, subject = "langgraph-tool", metadata = {} } = {}) {
  if (!name) throw new Error("wrapLangGraphTool requires name");
  if (typeof tool !== "function") throw new Error("wrapLangGraphTool requires a tool function");
  const activeGuard = createLangGraphToolGuard({ guard });
  return async function governedLangGraphTool(input = {}, context = {}) {
    const decision = activeGuard.evaluateToolCall({ toolId: name, subject, actor: context.actor || "langgraph-agent", inputPreview: Object.keys(input).slice(0, 12), metadata: { adapter: "langgraph", ...metadata } });
    if (decision.blocked || decision.approvalRequired) {
      return { ruleoak: decision, skipped: true, result: null };
    }
    const result = await tool(input, context);
    activeGuard.auditLog.record("adapter.langgraph.tool_completed", { toolId: name, requestId: decision.requestId });
    return { ruleoak: decision, skipped: false, result };
  };
}
