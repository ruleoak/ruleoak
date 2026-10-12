# Integration recipes

Choose the integration that gives RuleOak ownership of the **actual consequential execution path**. Authorization performed in one path does not protect a different unguarded path.

## Existing process / supported stdio traffic

```bash
ruleoak protect -- node agent.js
```

Use when the process/tool traffic can be launched through the RuleOak wrapper. Confirm with `ruleoak protect check` rather than assuming the wrapper is active.

## Tool collection you own

```js
const ruleoak = await createRuleOak({ workspace: '.ruleoak', approvalProvider })
const guardedTools = ruleoak.guardTools(tools)
```

Use when your application owns the tool registry. Remove/avoid unguarded references for consequential actions.

## Guard one function

```js
const guardedWrite = ruleoak.guardFunction({
  name: 'filesystem.write',
  category: 'file',
  operation: 'write',
  resource: ([path]) => path,
  execute: async (path, bytes) => writeFile(path, bytes),
})
```

A wrapper is meaningful only if callers execute through it.

## OpenAI-style tool call normalization

```js
const result = await ruleoak.authorizeOpenAIToolCall(toolCall)
```

This normalizes/authorizes the call; it is not an OpenAI network client and does not automatically prove the external effect.

## MCP stdio

```bash
ruleoak mcp wrap -- node server.js
```

Use when the client can be configured to launch the server through the wrapper. Side channels or separately configured direct servers remain outside the boundary.

## MCP Streamable HTTP

```bash
ruleoak mcp http --upstream http://127.0.0.1:8000
```

Use only with the documented transport assumptions. Review authentication/TLS if extending beyond loopback.

## Python, Rust or another local runtime

Start the local REST service and call `POST /v1/authorize`. Keep it bound to loopback unless transport security and authentication are deliberately configured.

The remote/local application remains responsible for consuming/obeying the decision and for executing through the intended controlled path.

## HTTP or webhook executor

Normalize with `ruleoak.adapters.http(request)`, authorize, consume the one-use authority and only then send the request. Do not include signing secrets in action arguments or evidence.

If a response is lost, do not treat the HTTP status as the only truth. Use an explicit domain postcondition/external identifier where possible.

## Deployment/infrastructure operation

For a deployment action, define a profile around the actual intended outcome (for example, a target revision becoming active and healthy) rather than “the deploy command exited 0”.

If no reliable external postcondition exists, keep the route policy-only and use manual verification after ambiguity.

## AI-produced source candidate

```bash
ruleoak dev ./candidate-source.zip --intent "<bounded intended change>"
```

Use when the candidate source was produced outside RuleOak and you want a baseline-owned review/qualification path. The model or human that produced the archive is not automatically the evidence authority.

## Before declaring an integration ready

1. prove the consequential action actually crosses RuleOak;
2. prove deny/approval-required prevents execution;
3. prove one-use authority rejects replay;
4. define effect semantics only where externally observable;
5. test timeout/response-loss behavior;
6. document bypass paths and deployment assumptions.
