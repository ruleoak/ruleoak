# RuleOak Intent IR v0.1 — experimental foundation

RuleOak Intent IR is an experimental, implementation-independent representation of durable software intent. Intent IR introduces the representation and validation boundary only; it does **not** introduce autonomous implementation, intent-driven mutation, or a second execution-authorization kernel.

## Core rule

Intent describes what software is expected to maintain. Source layout and implementation language are deliberately outside the durable core representation.

The v0.1 manifest can represent:

- Product
- Capability
- Goal
- Scenario
- Invariant
- Constraint
- Budget
- Authority
- Dependency
- Risk
- FailureMode
- Fallback
- EvidenceRequirement
- Claim
- Decision
- Incident

`Authority` in Intent IR means a declared design/state/decision source of truth. It does not grant an agent permission to execute an effect. RuleOak's existing Authority Grant / Envelope / ExecutionLease / Effect Boundary remains the execution authority model.

## Identity and references

Every manifest, product, and entity has a stable ID. Entity IDs are globally unique within one manifest. References are explicit IDs and are validated both for existence and expected target kind. Unknown or mistyped references fail validation.

The stable-ID syntax is intentionally simple:

```text
^[A-Za-z][A-Za-z0-9_.:-]{0,127}$
```

IDs describe semantic identity rather than filenames.

## Canonical representation

`canonicalIntentJson()`:

1. materializes absent entity collections as empty arrays;
2. orders entity collections by entity ID;
3. orders set-like reference arrays lexically;
4. preserves scenario step order;
5. recursively orders object keys;
6. emits whitespace-free JSON.

This gives deterministic bytes for semantically equivalent ordering variations without assigning implementation meaning to source paths.

## Evolution rules

v0.1 is experimental and intentionally fail-closed:

- the core schema rejects undeclared fields;
- unsupported `intent_manifest_version` values are rejected rather than guessed;
- extensions must live under `extensions` with namespaced keys such as `org.example.feature`;
- a future schema version must be explicit and have migration documentation;
- v0.1 validators never silently reinterpret a later version.

This provides safe forward evolution without allowing unknown fields to acquire accidental authority.

## Implementation independence

The core manifest has no source-path field. `examples/intent-ir/` contains one radio-playback intent manifest plus two separate implementation-binding examples—one Kotlin and one TypeScript—that reference the same capability IDs. The bindings are deliberately not part of Intent IR v0.1.

That separation establishes the Intent IR graduation property: one durable intent can describe behavior realized by structurally different implementations.

## CLI

```bash
ruleoak intent validate examples/intent-ir/radio-playback.intent.json
ruleoak intent validate examples/intent-ir/radio-playback.intent.json --json
ruleoak intent show examples/intent-ir/radio-playback.intent.json
ruleoak intent show examples/intent-ir/radio-playback.intent.json --json
ruleoak intent show examples/intent-ir/radio-playback.intent.json --canonical
```

`intent validate` checks structure, stable IDs, duplicate IDs, references, bounded enums and extension namespacing. `intent show` refuses to mask invalidity: it renders the manifest but exits non-zero when validation fails.

## Explicit Intent IR non-goals

Intent IR does not:

- infer intent from arbitrary repositories;
- connect source files to capabilities;
- generate implementation plans;
- modify code from intent;
- claim evidence has been observed merely because an EvidenceRequirement exists;
- allow Intent IR `Authority` records to authorize execution;
- add a network or model-provider dependency.

Those belong to future work outside this contract.

## Brownfield Understanding brownfield overlay

Brownfield Understanding preserves the implementation-independent Intent IR and adds a separate repository-understanding graph plus implementation bindings. Source paths therefore remain outside the durable core manifest. See `brownfield-understanding-v0.1.md`.

The Intent IR non-goal “infer intent from arbitrary repositories” remains substantially true: Brownfield Understanding observes repository structure and overlays declared intent, but it does not claim to reconstruct complete product intent automatically.
