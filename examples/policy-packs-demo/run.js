import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { ToolGuard, ToolManifest } from "../../src/guard/index.js";
import { PolicyPackRegistry } from "../../src/policy-packs/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");
const registry = PolicyPackRegistry.fromDirectory(join(root, "policy-packs"));
const selected = registry.combine(["filesystem-safe", "external-communication", "ticketing-write-approval", "cloud-llm-approval"]);
const manifest = ToolManifest.fromFile(join(__dirname, "tool-manifest.json"));
const guard = new ToolGuard({ manifest, policy: selected.policy, actor: "policy-pack-demo" });
const calls = [
  { toolId: "search_docs", subject: "docs" },
  { toolId: "write_workspace_file", subject: "local draft" },
  { toolId: "delete_workspace_file", subject: "workspace/data.json" },
  { toolId: "send_external_message", subject: "customer update" },
  { toolId: "read_ticket", subject: "TICKET-123" },
  { toolId: "comment_ticket", subject: "TICKET-123" },
  { toolId: "cloud_llm_generate", subject: "redacted prompt" },
  { toolId: "upload_raw_data_to_cloud", subject: "raw dataset" }
];
for (const call of calls) {
  const decision = guard.evaluateToolCall(call);
  console.log(`${decision.toolId}: ${decision.decision} — ${decision.reason}`);
}
const report = {
  ...guard.report({ title: "RuleOak Policy Packs Demo Report", summary: "Reusable policy packs were combined and applied to governed tool calls." }),
  runtimeVersion: "2.0.0",
  runtimeStage: "policy-packs",
  selectedPolicyPacks: selected.packIds,
  combinedPolicy: selected.policy
};
const outDir = join(__dirname, "out");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "policy-packs-report.json"), JSON.stringify(report, null, 2));
console.log(`Report: ${join(outDir, "policy-packs-report.json")}`);
