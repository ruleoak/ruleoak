# SDK tool adapters

`@ruleoak/core` includes deterministic adapters that reduce manual normalized-action construction

## Authorization API

```js
import { authorize } from '@ruleoak/core'

const result = authorize({
  actor: { type: 'agent', name: 'research-agent', session_id: 'session-1' },
  action: { name: 'filesystem.read', category: 'file', operation: 'read' },
  resource: { resource: './public/report.txt', scope: 'local', sensitivity: 'public' },
  arguments: { path: './public/report.txt' },
  context: { app: 'research-workbench' }
}, { policy })
```

## Guard a function

```js
import { guardFunction } from '@ruleoak/core'

const guardedRead = guardFunction(readFile, {
  name: 'filesystem.read',
  category: 'file',
  operation: 'read',
  sensitivity: 'private',
  mapArguments: ([path]) => ({ path })
}, {
  policy,
  onApproval: async result => approvalProvider.request(result)
})
```

The wrapper executes the function only after an allow decision or an explicit approval callback result

## Guard a tool collection

```js
import { guardTools } from '@ruleoak/core'

const guardedTools = guardTools(tools, {
  policy,
  actor: { type: 'agent', name: 'coding-agent', session_id: 'session-1' }
})
```

The adapter supports object maps and arrays with `execute`, `invoke`, or `handler` functions

## Payload adapters

```js
import {
  adaptOpenAIToolCall,
  adaptMcpToolCall,
  adaptShellCommand,
  adaptFilesystemAction,
  adaptHttpAction
} from '@ruleoak/core'
```

Supported input families:

- OpenAI-style function tool calls
- MCP `tools/call`
- shell commands
- filesystem operations
- HTTP and webhook requests
- generic `{ actor, action, resource, arguments, context }` authorization requests

Unknown top-level fields are retained under namespaced adapter metadata. Secret-like values are redacted by the permission gateway before evidence persistence

Adapters normalize and authorize; they do not execute a tool unless the developer explicitly uses `guardFunction` or `guardTools`
