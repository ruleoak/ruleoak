# Adapter hardening

> Release status: RuleOak Core v2.1.0 release. Public RuleOak Core release remains v2.1.0 until a future release is cut.

RuleOak adapter hardening helps developers add governance around existing agent frameworks without redesigning the application.

## What adapter hardening adds

- a shared adapter conformance result: `ruleoak.adapter_conformance.v1`
- LangGraph-style governed node and tool wrappers
- CrewAI-style governed tool wrapper
- local MCP JSON-RPC client/config helper for the RuleOak MCP Guard Proxy
- adapter conformance report generation
- a runnable adapter hardening example

## Developer value

RuleOak should sit at the tool-call boundary:

```text
agent/framework wants to call a tool
→ RuleOak evaluates tool, subject, actor, risk, and policy
→ allow / approval_required / deny
→ allowed calls execute
→ approval-required and denied calls do not execute
→ evidence and audit records are generated
```

This lets a developer add governance without replacing LangGraph, CrewAI, MCP tooling, or a custom agent loop.

## Run the adapter hardening demo

```bash
npm run adapter:hardening
```

The demo covers:

- `search_docs` through a LangGraph-style node: allowed and executed
- `write_file` through a LangGraph-style tool spec: approval required and not executed
- `send_external_message` through a CrewAI-style tool: approval required and not executed
- `delete_workspace_file` through MCP: blocked and not executed

The generated report is written to:

```text
examples/adapter-hardening/out/adapter-conformance-report.json
```

## LangGraph-style integration

```js
import { ToolGuard } from "@ruleoak/core/guard";
import { createLangGraphGovernedNode } from "@ruleoak/core/adapters";

const guard = new ToolGuard({ manifest, policy, actor: "langgraph-agent" });
const searchNode = createLangGraphGovernedNode({
  name: "search_docs",
  guard,
  node: async (input) => ({ documents: await search(input.query) })
});

const result = await searchNode({ query: "policy" });
```

## CrewAI-style integration

```js
import { createCrewAiGovernedTool } from "@ruleoak/core/adapters";

const sendTool = createCrewAiGovernedTool({
  name: "send_external_message",
  guard,
  func: async (input) => sendEmail(input)
});

const result = await sendTool.run({ to: "customer@example.com" });
```

## MCP local proxy helper

```js
import { withRuleOakMcpProxy } from "@ruleoak/core/adapters";

await withRuleOakMcpProxy({ manifest, policy, serverHandler }, async ({ client, config }) => {
  console.log(config.endpoint);
  const result = await client.callTool("search_docs", { query: "adapter" });
});
```

## Boundary statement

The adapter hardening layer governs whether a framework tool call may proceed. It does not replace operating-system sandboxing, identity and access management, data-loss-prevention controls, or legal/compliance review.
