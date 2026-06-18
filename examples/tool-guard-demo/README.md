# Tool Guard Demo

This demo shows RuleOak Core v1.3 governing AI tool calls before execution.

It evaluates three generic tool calls:

- `search_docs` → allowed
- `send_external_message` → approval required
- `delete_workspace_file` → denied

It also includes a small MCP Guard prototype that converts MCP-style tool definitions into RuleOak-governed tool decisions.

Run:

```bash
npm run guard:demo
```

Reports are written to:

```text
examples/tool-guard-demo/out/tool-guard-report.json
examples/tool-guard-demo/out/mcp-guard-report.json
```
