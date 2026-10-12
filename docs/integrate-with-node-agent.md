# Integrate with a Node.js agent

Use `@ruleoak/core` when the agent exposes a tool registry or function map.

## Tool collection

```js
import { createRuleOak } from '@ruleoak/core'

const ruleoak = await createRuleOak({
  workspace: '.ruleoak',
  approvalProvider,
  receiptMode: 'automatic'
})

const tools = {
  search: {
    description: 'Search the local index',
    schema: { type: 'object', properties: { query: { type: 'string' } } },
    execute: async ({ query }) => localSearch(query)
  }
}

const guardedTools = ruleoak.guardTools(tools)
```

Tool names, schemas and non-executor fields are preserved. The executor is wrapped once and invoked once only after authorization.

## One function

```js
const guardedDelete = ruleoak.guardFunction({
  name: 'filesystem.delete',
  category: 'file',
  operation: 'delete',
  resource: ([path]) => path,
  mapArguments: ([path]) => ({ path }),
  execute: deleteFile
})
```

## Errors

Denied actions throw `RuleOakAuthorizationError` with code `RULEOAK_DENIED`. Pending approvals throw `RuleOakApprovalRequiredError` with code `RULEOAK_APPROVAL_REQUIRED` and an approval ID when available.

## Execution metadata

Object results carry non-enumerable RuleOak metadata:

```js
import { getRuleOakMetadata } from '@ruleoak/core'

const result = await guardedTools.search({ query: 'oak' })
console.log(getRuleOakMetadata(result))
```

For primitive results or explicit API boundaries, use `resultMode: 'envelope'`.

## Safety requirements

- do not retain an unguarded reference and call it elsewhere
- do not execute on `needs_approval`
- keep the workspace protected by local filesystem permissions
- use a signing secret when the authorizer and executor are separate trust domains
