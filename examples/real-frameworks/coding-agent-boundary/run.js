#!/usr/bin/env node
import { ToolGuard } from "../../../src/guard/tool-guard.js";

const manifest = {
  tools: [
    { id: "read_file", name: "read_file", kind: "filesystem", risk: "low" },
    { id: "run_tests", name: "run_tests", kind: "shell", risk: "medium" },
    { id: "write_repository_file", name: "write_repository_file", kind: "filesystem", risk: "medium" },
    { id: "push_to_main", name: "push_to_main", kind: "git", risk: "high" },
    { id: "shell_rm_rf", name: "shell_rm_rf", kind: "shell", risk: "critical" },
    { id: "read_env_secret", name: "read_env_secret", kind: "secret", risk: "critical" }
  ]
};

const policy = {
  boundary: "local_only",
  allowedTools: ["read_file", "run_tests"],
  approvalRequired: ["write_repository_file", "push_to_main"],
  blockedTools: ["shell_rm_rf", "read_env_secret"]
};

const guard = new ToolGuard({ manifest, policy, actor: "coding-agent", runId: "roak-v2.1.0-coding-agent-boundary" });
const toolCalls = [
  { toolId: "read_file", subject: "src/index.js" },
  { toolId: "run_tests", subject: "npm test" },
  { toolId: "write_repository_file", subject: "src/generated-change.js" },
  { toolId: "push_to_main", subject: "origin/main" },
  { toolId: "shell_rm_rf", subject: "workspace" },
  { toolId: "read_env_secret", subject: ".env" }
];

const decisions = toolCalls.map((call) => guard.evaluateToolCall({ ...call, metadata: { example: "real-framework-coding-agent-boundary", ruleoakCoreRelease: "2.1.0" } }));
const executed = decisions.filter((d) => d.allowedNow).map((d) => d.toolId);
const paused = decisions.filter((d) => d.approvalRequired).map((d) => d.toolId);
const blocked = decisions.filter((d) => d.blocked).map((d) => d.toolId);

console.log(JSON.stringify({
  ok: true,
  adapter: "coding-agent-boundary",
  ruleoakCoreRelease: "2.1.0",
  executed,
  paused,
  blocked,
  report: guard.report({ title: "RuleOak v2.1.0 coding agent boundary" }),
  boundary: "RuleOak evaluates coding-agent file, shell, and git actions before execution."
}, null, 2));
