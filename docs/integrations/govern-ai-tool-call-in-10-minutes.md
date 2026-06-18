# Govern an AI tool call in 10 minutes

This is the shortest path to understand RuleOak Core.

RuleOak wraps a proposed AI tool call before execution:

```text
proposed tool call -> policy decision -> evidence record -> approval gate -> audit report
```

## 1. Declare tools

```json
{
  "tools": [
    { "id": "search_docs", "risk": "low", "kind": "read" },
    { "id": "send_external_message", "risk": "high", "kind": "external_write" },
    { "id": "delete_workspace_file", "risk": "critical", "kind": "destructive_write" }
  ]
}
```

## 2. Declare policy

```json
{
  "allowedTools": ["search_docs"],
  "approvalRequired": ["send_external_message"],
  "blockedTools": ["delete_workspace_file"]
}
```

## 3. Evaluate before execution

```js
const decision = guard.evaluateToolCall({
  toolId: "send_external_message",
  subject: "external recipient",
  inputPreview: "draft message"
});
```

The agent should act only when the decision allows it. Approval-required and blocked decisions must not proceed automatically.

## 4. Run the demo

```bash
npm install
npm run integrate:10min
npm run report:html
```

The report is written to:

```text
examples/ten-minute-tool-governance/out/ten-minute-governance-report.json
```

## Boundary

This example does not execute real tools. It demonstrates the governance control point that should sit in front of tool execution.
