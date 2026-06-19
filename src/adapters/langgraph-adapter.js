import { ToolGuard } from "../guard/tool-guard.js";
import { createAdapterGuard, runGovernedAdapterTool } from "./adapter-conformance.js";

export function createLangGraphToolGuard({ guard, manifest, policy, actor = "langgraph-agent", runId } = {}) {
  return guard instanceof ToolGuard ? guard : createAdapterGuard({ guard, manifest, policy, actor, runId });
}

export function wrapLangGraphTool({ name, tool, guard, manifest, policy, subject = "langgraph-tool", actor = "langgraph-agent", metadata = {}, mode = "return_decision" } = {}) {
  if (!name) throw new Error("wrapLangGraphTool requires name");
  if (typeof tool !== "function") throw new Error("wrapLangGraphTool requires a tool function");
  const activeGuard = createLangGraphToolGuard({ guard, manifest, policy, actor });
  return async function governedLangGraphTool(input = {}, context = {}) {
    return runGovernedAdapterTool({
      adapter: "langgraph",
      framework: "LangGraph",
      toolId: name,
      tool,
      guard: activeGuard,
      subject,
      actor,
      input,
      context,
      metadata,
      mode
    });
  };
}

export function createLangGraphGovernedNode({ name, node, guard, manifest, policy, subject = "langgraph-node", actor = "langgraph-agent", metadata = {}, mode = "return_decision" } = {}) {
  if (!name) throw new Error("createLangGraphGovernedNode requires name");
  if (typeof node !== "function") throw new Error("createLangGraphGovernedNode requires node function");
  return wrapLangGraphTool({ name, tool: node, guard, manifest, policy, subject, actor, metadata: { node: true, ...metadata }, mode });
}

export function createLangGraphToolSpec({ name, description = "RuleOak-governed LangGraph tool", tool, guard, manifest, policy, subject, actor, metadata = {}, mode = "return_decision" } = {}) {
  const invoke = wrapLangGraphTool({ name, tool, guard, manifest, policy, subject, actor, metadata, mode });
  return {
    name,
    description,
    schema: "ruleoak.langgraph_tool_spec.v1",
    ruleoak: {
      adapter: "langgraph",
      boundary: "RuleOak evaluates tool call before LangGraph node/tool execution",
      mode
    },
    invoke
  };
}
