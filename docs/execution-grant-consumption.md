# Execution grant consumption

RuleOak decision receipts bind an authorization decision to an exact action and policy snapshot. Version 1.1 receipts also carry a nonce, audience, issuer, activation time, and one-time intent

Verification alone does not prevent replay. RuleOak uses atomic grant consumption so an executor can reject a receipt that was already used.

## Issue a signed allow receipt

```bash
export RULEOAK_RECEIPT_SECRET='replace-with-a-local-secret'

ruleoak check \
  --call examples/calls/read-public.json \
  --dir ./workspace \
  --sign-receipt \
  --receipt-out ./receipt.json
```

## Consume before execution

```bash
ruleoak receipt consume \
  --file ./receipt.json \
  --call examples/calls/read-public.json \
  --dir ./workspace
```

The command verifies:

- receipt structure and expiry
- activation time
- action digest
- policy digest
- HMAC signature
- allow decision
- expected audience
- prior consumption state

A successful consumption writes an exclusive marker under `.ruleoak/consumed-receipts/`. Exclusive file creation makes concurrent local replay attempts deterministic: only one consumer can create the marker

## Consume and execute

```bash
ruleoak exec \
  --receipt ./receipt.json \
  --call examples/calls/read-public.json \
  --dir ./workspace \
  -- node approved-executor.js
```

RuleOak consumes the grant before starting the child process and exposes these environment variables:

- `RULEOAK_DECISION_ID`
- `RULEOAK_ACTION_DIGEST`
- `RULEOAK_POLICY_DIGEST`
- `RULEOAK_CONSUMPTION_RECORD`

## Security boundary

The local marker store protects against replay through cooperating RuleOak executors using the same workspace. It does not protect against a privileged local attacker deleting or replacing the marker store. Use OS permissions, separate service identities, or an external atomic store when the threat model includes local administrative compromise

Unsigned consumption is available only through the explicit `--allow-unsigned` development option and should not be used for a sensitive workflow
