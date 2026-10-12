# Signed evidence checkpoints

A checkpoint binds the current evidence log and policy file to compact digests

Create an unsigned checkpoint:

```bash
ruleoak audit checkpoint --dir ./workspace
```

Create a signed checkpoint:

```bash
export RULEOAK_CHECKPOINT_SECRET='replace-with-a-local-secret'
ruleoak audit checkpoint --dir ./workspace --sign
```

Verify against the current local workspace:

```bash
ruleoak audit verify-checkpoint \
  --file ./workspace/.ruleoak/checkpoints/<checkpoint-id>.json \
  --dir ./workspace
```

Require a valid signature:

```bash
ruleoak audit verify-checkpoint \
  --file checkpoint.json \
  --dir ./workspace \
  --require-signature
```

A checkpoint records:

- evidence-file SHA-256 digest
- event count
- last event ID and hash
- evidence-chain verification result
- policy-file SHA-256 digest
- optional HMAC-SHA256 signature

The secret is never stored in the checkpoint
