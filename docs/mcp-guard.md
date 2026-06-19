# MCP Guard Pack + read-only evidence connectors

RuleOak Core adds a practical MCP Guard Pack + read-only evidence connectors for MCP-style tool requests.

MCP Guard is not an MCP server. It is a local governance layer that can evaluate MCP-style `tools/call` requests before execution.

## What it does

- loads a local MCP-style server manifest
- normalizes tools into a RuleOak Tool Manifest
- evaluates `tools/call` requests through Tool Guard
- records policy decision, evidence, approval request, and audit events
- generates an audit-style JSON report

## What it does not do

- it does not call the network
- it does not execute tools
- it does not run or replace an MCP server
- it does not certify safety or compliance

## Run the demo

```bash
npm run mcp:demo
npm run mcp:report
npm run report:html
```

The demo uses `examples/mcp-guard-demo/server-manifest.json` and shows three decisions:

- `search_docs` → allowed
- `send_external_message` → approval required
- `delete_workspace_file` → blocked

## Why this matters

Tool protocols make it easier for AI systems to reach external capabilities. RuleOak adds a governance boundary before those capabilities are used.


## MCP Guard Proxy Prototype

RuleOak Core v2.1.0 includes a local in-process MCP Guard Proxy prototype for JSON-RPC `tools/call` requests.

```bash
npm run mcp:proxy:demo
npm run test:mcp-proxy
```

The proxy demonstrates how RuleOak can sit between an AI client and MCP-style tool execution.
