# RuleOak Incident Report Format

`ruleoak replay --verify` prints a deterministic Markdown report from `.ruleoak/evidence.jsonl`.

Sections:

1. title and generation time
2. hash-chain verification result
3. action summary counts
4. event table
5. decision reasons
6. limitations

Each evidence line includes:

```json
{
  "index": 1,
  "timestamp": "2026-07-01T00:00:00.000Z",
  "action": { "type": "filesystem.delete", "target": "/tmp/example" },
  "decision": { "action": "deny", "reason": "blockedActions always wins" },
  "previousHash": "GENESIS",
  "hash": "...sha256..."
}
```

The hash is computed over `previousHash + JSON.stringify(contentWithoutHash)`. Any deleted, modified, or reordered line breaks verification.
