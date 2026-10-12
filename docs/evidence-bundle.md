# RuleOak Evidence Bundle v3

`ruleoak audit bundle` creates a **derived local evidence artifact**. It never replaces or mutates the Flight Recorder.

```bash
ruleoak audit bundle --out ./ruleoak-evidence.zip
```

The default privacy profile is `minimal`.

## Privacy profiles

### `minimal` — default

```bash
ruleoak audit bundle --out ./ruleoak-evidence.zip --profile minimal
```

Includes only:

- `evidence/minimal.jsonl` — strict privacy-minimized timeline;
- `graphs/summary.json` — graph IDs/counts and adapter identities, not full graph nodes;
- `metadata.json` — Evidence Bundle Manifest v3.

It does **not** include the raw recorder chain, policy, workspace state, approval/session state, or full Authority/Evidence Graphs. Therefore an offline verifier can verify the bundle's component digests and manifest consistency, but cannot independently reconstruct the omitted source chain or full graphs. The manifest states `verified_at_export_only` for those omitted components.

### `operational` — explicit higher detail

```bash
ruleoak audit bundle --out ./ruleoak-evidence.zip --profile operational
```

Adds:

- `.ruleoak/evidence.jsonl` — the complete raw recorder chain;
- `graphs/authority-graph.json`;
- `graphs/evidence-graph.json`.

This permits independent offline re-verification of the recorder hash chain and graph semantic digests. Raw evidence can contain action/resource/effect metadata, so choose this profile deliberately.

### `forensic_local` — explicit local forensic detail

```bash
ruleoak audit bundle --out ./ruleoak-evidence.zip --profile forensic_local
```

Adds selected RuleOak-local policy, workspace, approval, session, authority, checkpoint, learning, and supporting state when present. It does not crawl arbitrary project source files and does not include RuleOak-managed secret material.

Use this only when the additional local control-state detail is genuinely required.

## Determinism

Bundle entries and manifest file declarations are canonically ordered. `bundle_id` is a SHA-256 semantic identity over the v3 manifest content other than the ID/signature itself. The default `created_at` is source-derived (last recorder event, or the epoch for an empty recorder), so an unchanged source/profile produces reproducible bundle bytes. Supplying a different explicit creation time intentionally changes bundle identity.

## Verification

```bash
ruleoak audit verify-bundle --file ./ruleoak-evidence.zip
```

Verification checks:

- Evidence Bundle Manifest v3 structure;
- semantic `bundle_id`;
- every declared file size and SHA-256 digest;
- undeclared/unsafe archive entries;
- privacy-profile content rules;
- graph summary or full graph semantics as appropriate;
- raw recorder hash chain when the profile includes it;
- source event count/final hash/time range;
- adapter identity consistency;
- optional HMAC signature.

Historical Evidence Bundle v2 files remain verifiable.

## Signing

```bash
ruleoak audit bundle --out ./ruleoak-evidence.zip --profile minimal --sign
ruleoak audit verify-bundle --file ./ruleoak-evidence.zip --require-signature
```

Signing authenticates the v3 manifest with the local RuleOak checkpoint signing secret. Unsigned verification establishes bundle self-consistency, not external authorship.
