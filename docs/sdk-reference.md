# SDK reference

## `createRuleOak(options)`

Creates an asynchronous runtime bound to one workspace and policy.

Key options:

| Option | Meaning |
|---|---|
| `workspace` | Project root or `.ruleoak` directory |
| `policy` | In-memory Policy v2 override |
| `approvalProvider` | Versioned approval provider |
| `receiptMode` | `automatic`, `manual`, or `off` |
| `receiptSecret` | Optional HMAC signing secret |
| `receiptAudience` | Expected execution audience |
| `resultMode` | `preserve` or `envelope` |
| `onExecution` | Post-execution metadata callback |

## `ruleoak.authorize(input)`

Normalizes the input, classifies risk, evaluates policy, optionally submits an approval request, issues a receipt and appends evidence. It does not call a tool.

## `ruleoak.guardTools(tools)`

Wraps object maps and array-based tool definitions. Supported executor fields are `execute`, `invoke`, and `handler`.

## `ruleoak.guardFunction(descriptor)`

Creates a guarded asynchronous function. The descriptor defines the action identity, resource mapping and executor.

## `ruleoak.consume(result, input)`

Consumes an allow receipt once. Normal SDK execution performs this internally when `receiptMode` is `automatic`.

## Adapter helpers

```js
ruleoak.adapters.authorization(request)
ruleoak.adapters.openai(toolCall)
ruleoak.adapters.mcp(jsonRpcCall)
ruleoak.adapters.shell(command, args)
ruleoak.adapters.filesystem(operation, path, arguments)
ruleoak.adapters.http(request)
```

Convenience authorization methods:

```js
await ruleoak.authorizeOpenAIToolCall(call)
await ruleoak.authorizeMcpToolCall(call)
```

All helpers normalize into the same protocol and authorization path.


## Exact Approval Contract

For Provider API v1.1, use ApprovalRequest/ApprovalResult v1. An approved result is applied with `applyApprovalResult`; execution code that needs an approval-bound lease should use `issueExecutionLease` with an approval-use store rather than constructing reusable approval authority.
