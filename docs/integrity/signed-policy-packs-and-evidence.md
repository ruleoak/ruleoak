# Signed Policy Packs and Evidence Integrity

RuleOak Core v2.1.0 includes an offline integrity layer for policy packs, evidence bundles, and append-only audit chains.

This is **RuleOak Core v2.1.0**. Public RuleOak Core documentation should still treat **v2.1.0** as the latest released Core and **v1.0.1** as the earlier public baseline until a future future major release is intentionally published.

## What this protects

The integrity layer helps a reviewer answer four questions:

1. Which policy pack was evaluated?
2. Has the policy pack manifest changed since it was signed?
3. Has the evidence bundle changed since it was signed?
4. Has the audit-event chain changed since it was signed?

It does not replace runtime sandboxing, SSO, HSM-backed key management, or legal compliance certification.

## Integrity objects

RuleOak uses:

- `ruleoak.integrity.v1` trust roots;
- Ed25519 signatures;
- SHA-256 canonical payload hashes;
- sidecar `pack.signature.json` files for policy packs;
- embedded `integrity` envelopes for signed evidence bundles;
- sidecar audit-chain signature envelopes.

## Verify policy pack signatures

```bash
npm run integrity:verify
```

For JSON output:

```bash
npm run integrity:verify:json
```

The verification is local and read-only. It validates the trust root and verifies each `policy-packs/*/pack.signature.json` sidecar against `configs/trust/ruleoak-local-trust-root.json`.

## Run the signed-evidence demo

```bash
npm run integrity:demo
```

The demo writes local artifacts to:

```text
examples/signed-integrity/out/
```

Generated artifacts include:

- `trust-root.json`
- `signed-evidence-bundle.json`
- `audit-events.json`
- `audit-chain.signature.json`
- `verification-report.json`

## Signing policy packs

Maintainers can sign pack manifests with:

```bash
node scripts/integrity-check.js sign-policy-packs \
  --private-key /path/to/private-key.pem \
  --key-id your-key-id
```

Do not commit real production private keys. The checked-in trust root contains a public verification key only. Replace it for real deployments.

## Trust root

The local trust root is stored at:

```text
configs/trust/ruleoak-local-trust-root.json
```

Production users should replace this with their own trust root and key lifecycle policy.

## Release gate

The signed-integrity layer adds:

```bash
npm run test:integrity-signing
```

The full test path now includes signed policy-pack verification and tamper-detection checks for evidence bundles and audit chains.
