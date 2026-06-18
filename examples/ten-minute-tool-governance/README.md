# Govern an AI tool call in 10 minutes

This example is the shortest integration path for RuleOak Core.

It shows how to wrap three proposed agent tool calls with RuleOak policy, evidence, approval, and audit records before execution:

- `search_docs` → allowed
- `send_external_message` → approval required
- `delete_workspace_file` → blocked

Run:

```bash
npm run integrate:10min
npm run report:html
```

Output:

```text
examples/ten-minute-tool-governance/out/ten-minute-governance-report.json
```

Boundary: this example does not execute tools. It only demonstrates the governance decision path that should happen before an agent acts.
