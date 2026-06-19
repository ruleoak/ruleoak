# Evidence Bundles and Replay Verification

Evidence bundles are the portable proof package for RuleOak Governance Protocol v1.

They are useful when a developer needs to send an auditor, reviewer, or future verifier one file containing the governance records and enough hashes to prove the package was not silently changed.

## Bundle shape

A bundle contains:

- `protocol`: always `ruleoak.governance.v1`
- `bundleType`: `RuleOakEvidenceBundle`
- `bundleId`
- `runId`
- `generatedAt`
- `records`
- `recordHashes`
- optional `redactionManifest`
- `metadata`
- `bundleHash`

## Redaction manifest

A redaction manifest records what was removed or transformed before evidence leaves a local boundary. It is not a privacy guarantee by itself. It is an audit record explaining what was redacted and why.

## Replay command

```bash
npm run protocol:replay examples/protocol-v1-hardening/evidence-bundle.json
```

A valid replay result returns `valid: true`. A tampered record, hash, or bundle hash returns `valid: false` with an error list.
