import assert from "node:assert/strict";
import { ToolManifest } from "../src/guard/tool-manifest.js";
import { ToolGuard } from "../src/guard/tool-guard.js";
import { wrapLangGraphTool, createCrewAiGovernedTool } from "../src/adapters/index.js";

const manifest = ToolManifest.fromObject({ tools: [{ id: "safe_read", risk: "low" }, { id: "risky_send", risk: "high" }, { id: "danger_delete", risk: "critical" }] });
const policy = { allow: ["safe_read"], approvalRequired: ["risky_send"], block: ["danger_delete"] };
const guard = new ToolGuard({ manifest, policy, actor: "adapter-test" });
let executed = 0;
const langTool = wrapLangGraphTool({ name: "safe_read", guard, tool: async () => { executed++; return { ok: true }; } });
const langResult = await langTool({ query: "x" });
assert.equal(langResult.skipped, false);
assert.equal(executed, 1);
const crewTool = createCrewAiGovernedTool({ name: "danger_delete", guard, func: async () => { executed++; return { deleted: true }; } });
const crewResult = await crewTool.run({ path: "x" });
assert.equal(crewResult.skipped, true);
assert.equal(crewResult.ruleoak.blocked, true);
assert.equal(executed, 1, "blocked adapter tool should not execute");
console.log("agent adapter tests passed");
