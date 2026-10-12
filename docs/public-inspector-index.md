# Public Inspector capability index

RuleOak can turn **explicitly approved public** Inspector snapshots plus optional CapabilityObservation history into static capability profiles, stable version/history pages, a JSON Feed, sitemap entries and a Capability Watch handoff contract.

This pipeline is intended for public integration metadata, such as public MCP servers. Do not publish snapshots or history for private/internal tools.

```bash
ruleoak inspect build-index \
  --manifest-dir ./public-snapshots \
  --history ./public-capability-history.jsonl \
  --out ./public-index \
  --base-url https://ruleoak.com/inspector-index \
  --confirm-public
```

`--history` is optional. When present, the JSONL file is loaded through the bounded capability-history validator before publication. The command refuses to write without `--confirm-public`.

## Stable canonical URLs

Canonical integration URLs are derived from the stable `integration_id`, not the display name. Renaming an integration therefore does not silently move its canonical public page.

Each integration can publish:

- current profile: `integrations/<stable-id>/`
- normalized history: `integrations/<stable-id>/history/`
- version/surface snapshots: `integrations/<stable-id>/versions/<version-and-fingerprint>/`
- Capability Watch handoff: `integrations/<stable-id>/watch.json`

## Evidence labels

Public pages label evidence explicitly:

- **Registry metadata** — discovery metadata only; not inspected capability evidence
- **Declared** — capability information supplied by a manifest/declaration
- **Inspected** — runtime or local-package inspection evidence
- **Inferred** — RuleOak-derived classification rather than a declared claim
- **Operator annotation** — explicit operator-added context
- **Historical** — normalized historical observation

An entry backed only by Registry metadata is displayed as **Registry metadata only**, never as Inspected.

## Publication safety

The published representation deliberately omits:

- tool descriptions
- raw input schemas
- annotations
- credentials and tokens
- URL usernames/passwords/query strings/fragments
- local filesystem source paths
- source code and prompts

It retains normalized tool names, state/consequence classification, schema digests, publication-safe evidence provenance, stable IDs, fingerprints and historical drift.

## Drift and feed semantics

Initial `first_seen` observations belong in history but do not become drift alerts. The feed focuses on subsequent lifecycle/drift events such as removal, reintroduction, schema change, authority expansion, consequence escalation and other supported drift categories.

## Capability Watch handoff

`watch.json` is a public identity/baseline handoff. It contains the integration ID, current public fingerprint, canonical path and evidence status. It **does not grant runtime authority**, carry repository credentials or expose a private service implementation.

Generated output is static HTML/JSON plus `feed.json`, `sitemap.xml` and `robots.txt`. No hosted RuleOak service is required.
