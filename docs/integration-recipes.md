# Integration recipes

## Existing process

```bash
ruleoak protect -- node agent.js
```

## Tool collection

```js
const ruleoak = await createRuleOak({ workspace: '.ruleoak', approvalProvider })
const guardedTools = ruleoak.guardTools(tools)
```

## OpenAI-style call

```js
const result = await ruleoak.authorizeOpenAIToolCall(toolCall)
```

## MCP stdio

```bash
ruleoak mcp wrap -- node server.js
```

## MCP Streamable HTTP

```bash
ruleoak mcp http --upstream http://127.0.0.1:8000
```

## Python, Rust or another local runtime

Start the local REST service and call `POST /v1/authorize`. Keep it bound to loopback unless transport security and authentication are deliberately configured.

## HTTP or webhook executor

Normalize with `ruleoak.adapters.http(request)`, authorize, consume the receipt and only then send the request. Do not include the signing secret in action arguments or evidence.
