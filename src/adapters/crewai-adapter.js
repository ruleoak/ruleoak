import { ToolGuard } from "../guard/tool-guard.js";
import { createAdapterGuard, runGovernedAdapterTool } from "./adapter-conformance.js";

export function createCrewAiToolGuard({ guard, manifest, policy, actor = "crewai-agent", runId } = {}) {
  return guard instanceof ToolGuard ? guard : createAdapterGuard({ guard, manifest, policy, actor, runId });
}

export function createCrewAiGovernedTool({ name, description = "Governed CrewAI-style tool", func, guard, manifest, policy, subject = "crewai-tool", actor = "crewai-agent", metadata = {}, mode = "return_decision" } = {}) {
  if (!name) throw new Error("createCrewAiGovernedTool requires name");
  if (typeof func !== "function") throw new Error("createCrewAiGovernedTool requires func");
  const activeGuard = createCrewAiToolGuard({ guard, manifest, policy, actor });
  return {
    name,
    description,
    schema: "ruleoak.crewai_tool_spec.v1",
    ruleoak: {
      adapter: "crewai",
      boundary: "RuleOak evaluates tool call before CrewAI-style tool execution",
      mode
    },
    async run(input = {}, context = {}) {
      return runGovernedAdapterTool({
        adapter: "crewai",
        framework: "CrewAI",
        toolId: name,
        tool: func,
        guard: activeGuard,
        subject,
        actor,
        input,
        context,
        metadata,
        mode
      });
    }
  };
}

export function createCrewAiToolSpec(args = {}) {
  return createCrewAiGovernedTool(args);
}
