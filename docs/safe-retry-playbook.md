# Safe retry playbook

A timeout is not a retry instruction. After dispatch, the correct next action depends on evidence of the external effect.

## The unsafe pattern

```text
dispatch
  ↓
timeout
  ↓
retry immediately
```

If the first attempt already changed external state, the retry can duplicate or corrupt the intended effect.

## The RuleOak pattern

```text
dispatch under one-use authority
  ↓
response/connection failure
  ↓
mark effect unresolved
  ↓
reconcile bounded postcondition evidence
  ↓
confirmed success → do not retry
confirmed no effect → new authorization + new lease
ambiguous → manual/independent verification
```

## Step 1: consume the original authority

The original `ExecutionLease` is not silently reusable after a timeout. A retry is a new action attempt and therefore needs fresh authority.

## Step 2: preserve unresolved state

Do not translate timeout into failure or success. Preserve the effect as unresolved until evidence changes that state.

## Step 3: reconcile without replay

Reconciliation reruns bounded observation/postcondition checks. It does not execute the original operation.

```bash
node packages/cli/bin/ruleoak.js effect pending
node packages/cli/bin/ruleoak.js effect reconcile --limit 20
node packages/cli/bin/ruleoak.js effect show --id <effect-id>
```

## Step 4: obtain a retry plan

```bash
node packages/cli/bin/ruleoak.js effect retry-plan --id <effect-id>
```

The plan should reflect the evidence, not convenience.

## Step 5: require fresh authority

When no-effect has actually been established and the operation is retry-safe, create a new authorization/execution cycle. Revocation, expiry, policy changes and updated resource identity must be re-evaluated.

## Design guidance for effect profiles

A useful postcondition should be:

- tied to the actual operation/resource semantics;
- bounded so verification cannot become an uncontrolled scan;
- independent enough not to trust only the same response that was lost;
- explicit about false-positive/false-negative limitations;
- safe to run repeatedly during reconciliation.

## Operations that need extra caution

- payments and financial transfers;
- deployment or infrastructure mutations;
- destructive filesystem/database operations;
- message/email/webhook delivery;
- issue/ticket creation;
- APIs with weak idempotency semantics.

RuleOak does not replace application-native idempotency keys or provider-side transaction identifiers. Use those mechanisms when available; RuleOak's effect evidence and one-use authority complement them.
