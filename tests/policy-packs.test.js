import assert from "node:assert/strict";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { PolicyPackRegistry, mergePolicies } from "../src/policy-packs/index.js";
import { ToolGuard, ToolManifest } from "../src/guard/index.js";

const root = process.cwd();

const registry = PolicyPackRegistry.fromDirectory(join(root, "policy-packs"));
assert.ok(registry.get("filesystem-safe"));
assert.ok(registry.get("cloud-llm-approval"));
assert.ok(registry.get("sre-monitoring-change"));
assert.ok(registry.list().length >= 5);

const combined = registry.combine(["filesystem-safe", "external-communication"]);
assert.ok(combined.policy.allowedTools.includes("search_docs"));
assert.ok(combined.policy.approvalRequired.includes("send_external_message"));
assert.ok(combined.policy.blockedTools.includes("delete_workspace_file"));

const priority = mergePolicies([
  { allowedTools: ["dangerous_action"] },
  { approvalRequired: ["dangerous_action"] },
  { blockedTools: ["dangerous_action"] }
]);
assert.ok(priority.blockedTools.includes("dangerous_action"));
assert.ok(!priority.allowedTools.includes("dangerous_action"));
assert.ok(!priority.approvalRequired.includes("dangerous_action"));

const manifest = ToolManifest.fromObject({ tools: [{ id: "delete_workspace_file", risk: "critical" }, { id: "search_docs", risk: "low" }] });
const guard = new ToolGuard({ manifest, policy: combined.policy });
assert.equal(guard.evaluateToolCall({ toolId: "search_docs" }).decision, "allowed");
assert.equal(guard.evaluateToolCall({ toolId: "delete_workspace_file" }).decision, "blocked");

const srePack = registry.combine(["sre-monitoring-change"]);
assert.ok(srePack.policy.allowedTools.includes("read.metric_baseline"));
assert.ok(srePack.policy.approvalRequired.includes("write.monitoring_threshold"));
assert.ok(srePack.policy.blockedTools.includes("disable.production_alert"));

execFileSync(process.execPath, [join(root, "examples", "policy-packs-demo", "run.js")], { stdio: "pipe" });
console.log("policy-packs tests passed");
