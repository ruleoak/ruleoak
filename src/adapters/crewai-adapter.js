import { ToolGuard } from "../guard/tool-guard.js";

export function createCrewAiToolGuard({ guard, manifest, policy, actor = "crewai-agent" } = {}) {
  return guard instanceof ToolGuard ? guard : new ToolGuard({ manifest, policy, actor });
}

export function createCrewAiGovernedTool({ name, description = "Governed CrewAI-style tool", func, guard, subject = "crewai-tool", metadata = {} } = {}) {
  if (!name) throw new Error("createCrewAiGovernedTool requires name");
  if (typeof func !== "function") throw new Error("createCrewAiGovernedTool requires func");
  const activeGuard = createCrewAiToolGuard({ guard });
  return {
    name,
    description,
    async run(input = {}, context = {}) {
      const decision = activeGuard.evaluateToolCall({ toolId: name, subject, actor: context.actor || "crewai-agent", inputPreview: Object.keys(input).slice(0, 12), metadata: { adapter: "crewai", ...metadata } });
      if (decision.blocked || decision.approvalRequired) {
        return { ruleoak: decision, skipped: true, result: null };
      }
      const result = await func(input, context);
      activeGuard.auditLog.record("adapter.crewai.tool_completed", { toolId: name, requestId: decision.requestId });
      return { ruleoak: decision, skipped: false, result };
    }
  };
}
