# Evidence Bundle v3 verification

RuleOak v0.50.0 creates Evidence Bundle Manifest v3 and verifies the supported evidence-bundle formats shipped in this release.

The verifier never extracts archive entries to the filesystem. It parses the stored ZIP, rejects unsafe paths, caps archive size/entry count, verifies declared component digests, and rejects undeclared files.

For `minimal`, the raw recorder and full graphs are intentionally absent. Verification therefore reports source-chain and graph verification as `verified_at_export_only`; this is a truthful limitation of the privacy profile, not a verification failure.

For `operational` and `forensic_local`, verification re-parses `.ruleoak/evidence.jsonl`, verifies the complete append-only hash chain, verifies Authority Graph and Evidence Graph semantic digests, and checks their IDs against the manifest.

Use:

```bash
ruleoak audit verify-bundle --file ./ruleoak-evidence.zip --json
```

For a signed bundle:

```bash
ruleoak audit verify-bundle \
  --file ./ruleoak-evidence.zip \
  --require-signature
```
