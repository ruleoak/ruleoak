#!/usr/bin/env node
import { RunManager } from "../runtime/index.js";
import { SandboxManager } from "../sandbox/index.js";

const args = process.argv.slice(2);

function help() {
  console.log(`RuleOak Core CLI

Commands:
  inspect             Print the public package boundary
  runtime-inspect     Print runtime modules and lifecycle
  sandbox-inspect     Print sandbox foundation controls
  help                Show this help

Examples:
  npm run inspect
  npm run runtime:inspect
  npm run examples:list
  npm run example:consultant
  npm run example:research`);
}

if (args.length === 0 || args.includes('--help') || args.includes('-h') || args[0] === 'help') {
  help();
  process.exit(0);
}

if (args[0] === 'inspect') {
  console.log(JSON.stringify({
    name: 'RuleOak Core',
    version: '2.1.0',
    stage: 'v2.1.0: public developer release for AI tool-call governance',
    boundary: 'AGPL open core for local-first AI tool-call governance',
    includes: ['runtime modules', 'sandbox foundation', 'contracts', 'schemas', 'copyable examples', 'local LLM readiness', 'tests', 'CI', 'launch UX', 'Tool Guard', 'MCP Guard Proxy', 'connectors', 'policy packs', 'local approval inbox', 'report viewer', 'telemetry export', 'Governance Protocol v1 stable contract', 'release readiness command', 'protocol status command', 'protocol docs lint', '10-minute integration guide', 'adapter samples', 'real local MCP proxy server mode', 'real read-only GitHub evidence connector', 'real read-only Jira evidence connector', 'release validation', 'compatibility matrix', 'security boundary test corpus', 'connector safety test corpus', 'real adapter pack', 'optional LangGraph example', 'optional CrewAI example', 'real MCP local client example', 'Policy Test Lab', 'policy test/explain/diff commands'],
    excludes: ['security-reviewed sandbox', 'certified compliance product', 'hosted cloud service']
  }, null, 2));
  process.exit(0);
}


if (args[0] === 'sandbox-inspect') {
  const sandbox = new SandboxManager({ workspaceRoot: process.cwd() });
  const sample = {
    inspect: sandbox.inspect(),
    decisions: {
      allowedRead: sandbox.canRead('examples/research-brief-demo/README.md'),
      deniedSecret: sandbox.canRead('.env'),
      deniedExternalNetwork: sandbox.canConnect('https://example.com'),
      approvalTool: sandbox.canUseTool('service.restart')
    }
  };
  console.log(JSON.stringify(sample, null, 2));
  process.exit(0);
}

if (args[0] === 'runtime-inspect') {
  const runtime = new RunManager({ app: 'RuleOak Runtime Inspect', policy: { boundary: 'local_only', allowedTools: ['inspect.runtime'], approvalRequired: [], blockedTools: [] } }).start();
  runtime.addEvidence({ id: 'E1', source: 'runtime', claim: 'RunManager can create a run and record audit events.', value: 'ok' });
  const { decision } = runtime.evaluateAction('inspect.runtime');
  const report = runtime.complete({ summary: { decision: decision.decision }, output: { modules: ['RunManager', 'PolicyEngine', 'EvidenceStore', 'ApprovalGate', 'AuditLog', 'ReportExporter'] } });
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

console.error(`Unknown command: ${args[0]}`);
help();
process.exit(1);
