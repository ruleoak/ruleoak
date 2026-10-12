# Node.js SDK integration guide

Use the Node.js SDK when you own the execution registry and can require consequential functions to cross a guarded boundary.

## Minimal pattern

```js
import { createRuleOak } from '@ruleoak/core'

const ruleoak = await createRuleOak({
  workspace: '.ruleoak',
  policy: { policyVersion: 2, defaultAction: 'deny', rules: [] }
})

const guarded = ruleoak.guardFunction({
  name: 'filesystem.read',
  category: 'file',
  operation: 'read',
  resource: ([path]) => path,
  execute: async (path) => {
    // your implementation
    return path
  }
})
```

The important property is not the wrapper syntax; it is that all consequential calls actually use the wrapper.

## Integration responsibilities

Your application still owns:

- business-domain validation;
- executor correctness;
- credentials/secrets;
- transport security to remote systems;
- definition of trustworthy postconditions for custom operations;
- ensuring bypass calls are removed or explicitly documented.

RuleOak owns the public authority/evidence semantics it implements at the boundary.

## Resource identity

The `resource` function should map arguments to a stable, reviewable identity. Avoid values that are so broad that policy/approval no longer describes the exact action.

## Deny and approval behavior

Test the negative path first. A denied or approval-required decision must prevent the executor from running. Approval should bind to the reviewed action rather than granting reusable ambient permission.

## Replay and retries

Execution authority is one-use. If a call becomes ambiguous after dispatch, do not call the guarded function again merely because the response was lost. Reconcile the effect and obtain fresh authority only if retry is supported by evidence.

## Testing checklist

- allow path runs once;
- deny path runs zero times;
- approval-required path runs zero times until approved;
- replayed lease is rejected;
- policy/revocation changes invalidate stale assumptions;
- timeout/response loss creates correct unresolved/effect state;
- custom effect profile verifies only its bounded intended postcondition.
