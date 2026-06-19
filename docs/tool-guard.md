# RuleOak Tool Guard

RuleOak Core adds **Tool Guard**: a small governance layer for AI tool calls.

The purpose is simple:

```text
Before an agent calls a tool, RuleOak decides whether the call is allowed, denied, or approval-required.
```

Tool Guard records the same RuleOak pattern used elsewhere in the runtime:

- **Policy** — allowed, blocked, and approval-required tool actions are declared outside the prompt.
- **Evidence** — every tool decision records the tool request and decision context.
- **Approval** — risky tool calls can be paused for human review.
- **Audit** — every request, policy decision, evidence record, and approval request is recorded.

## Quick demo

```bash
npm run guard:demo
```

Expected decisions:

```text
search_docs: allowed
send_external_message: approval_required
delete_workspace_file: blocked
```

Reports are written to:

```text
examples/tool-guard-demo/out/tool-guard-report.json
examples/tool-guard-demo/out/mcp-guard-report.json
```

## When to use Tool Guard

Use Tool Guard when an AI workflow can call tools such as:

- file readers or writers
- search tools
- ticketing tools
- messaging tools
- local scripts
- MCP tools
- internal automation commands

## Boundary

Tool Guard governs whether a tool call should proceed. It does not execute tools, replace operating-system sandboxing, certify compliance, or provide an externally security-reviewed sandbox.
