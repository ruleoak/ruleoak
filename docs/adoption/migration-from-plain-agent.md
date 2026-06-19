# Migrate from a plain agent to a governed agent

RuleOak should be added at the tool boundary, not inside the model prompt.

## Before

```js
const result = await sendExternalMessage({ to, body });
```

The model or agent decides to call a tool, and the app executes it.

## After

```js
const decision = guard.evaluateToolCall({
  toolId: "send_external_message",
  subject: to,
  inputPreview: body.slice(0, 160)
});

if (decision.blocked) throw new Error("Blocked by policy");
if (decision.approvalRequired) return { status: "waiting_for_approval", decision };

const result = await sendExternalMessage({ to, body });
```

## Migration steps

1. List the tools your agent can call.
2. Classify each tool as allowed, approval-required, or blocked.
3. Add RuleOak evaluation before execution.
4. Persist the generated evidence and audit records.
5. Add a report or approval inbox only after the basic boundary works.

This approach avoids redesigning the application. The app keeps its tools and framework; RuleOak governs whether a tool call should proceed.
