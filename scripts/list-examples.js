#!/usr/bin/env node
console.log("RuleOak examples");
console.log("----------------");
console.log("");
const rows = [
  ["technical-consultant-demo", "npm run example:consultant", "case analysis, evidence, recommended action, approval boundary, audit-style report"],
  ["research-brief-demo", "npm run example:research", "non-IT evidence review, sourced claims, confidence, publication approval boundary"],
  ["tool-guard-demo", "npm run guard:demo", "governed AI tool calls: allow, approval-required, blocked, plus MCP Guard prototype"],
  ["sre-monitoring-change-governance", "npm run sre:monitoring-change", "SRE threshold change governance with evidence bundle and replay verification"],
  ["ai-coding-agent-governance", "npm run coding:agent-governance", "coding-agent file/git/shell governance with source-edit approval and destructive-command blocking"],
  ["enterprise-rag-answer-governance", "npm run rag:answer-governance", "evidence-backed RAG with restricted-document approval and unsupported-answer blocking"],
  ["personal-local-first-assistant-governance", "npm run personal:local-assistant-governance", "local-first assistant governance with external-send approval and private-upload blocking"]
];
for (const [name, command, shows] of rows) {
  console.log(`${name}`);
  console.log(`   Command: ${command}`);
  console.log(`   Shows: ${shows}`);
  console.log("");
}
console.log("Optional local LLM paths:");
console.log("   npm run llm:doctor");
console.log("   npm run example:consultant:llm");
console.log("   npm run example:research:llm");
