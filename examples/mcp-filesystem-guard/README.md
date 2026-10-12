# MCP filesystem guard

This example applies the same RuleOak authorization path to MCP-style stdio and Streamable HTTP traffic.

```bash
npm run demo:mcp-filesystem
```

It demonstrates:

- public file reads allowed
- private file reads requiring approval
- protected deletion denied before the simulated server
- stdio and Streamable HTTP handling
- deterministic JSON-RPC deny/approval responses
- automatic receipt consumption for forwarded actions
- local approval lifecycle and evidence report

Architecture: [`architecture.mmd`](architecture.mmd). Policy: [`policy.json`](policy.json). Expected summary: [`expected-output.txt`](expected-output.txt).

```bash
node examples/mcp-filesystem-guard/test.mjs
node examples/mcp-filesystem-guard/cleanup.mjs
```

The upstream filesystem server is simulated. No real file is read, modified or deleted.
