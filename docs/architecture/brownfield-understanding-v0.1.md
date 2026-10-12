# RuleOak Brownfield Understanding v0.1

Brownfield Understanding overlays the experimental Intent IR onto an existing repository without making generated semantic guesses authoritative. It adds local repository analysis and graph navigation while preserving RuleOak's existing execution-authority/effect/evidence kernel.

## Commands

```bash
ruleoak understand [--dir <repo>] [--intent <manifest.json>] [--binding <binding.json> ...] [--out understanding.json] [--json]
ruleoak explain <intent-id|node-id|relative-path> [--graph understanding.json | --dir <repo>] [--json]
ruleoak trace <intent-id|node-id|relative-path> [--graph understanding.json | --dir <repo>] [--depth 0..12] [--direction in|out|both] [--json]
```

`understand` is read-only unless `--out` is supplied. Core repository analysis performs no network access and uses no LLM by default.

## Provenance is part of the contract

Every node and relationship carries one of three provenance classes:

- `OBSERVED` — directly derived from repository bytes or package metadata, such as a file, package export, or conservative static import.
- `DECLARED` — supplied by a validated Intent manifest or explicit implementation binding.
- `INFERRED` — derived from observed/declared facts but not independently proven. Brownfield Understanding uses this only for conservative candidate-test relationships.

`OBSERVED` and `DECLARED` records have confidence `1`. `INFERRED` records must have confidence below `1` and state the derivation method.

A candidate test is **not evidence that a capability is verified**. For example, a test importing an explicitly bound implementation module creates a conservative `candidate_test` relationship, not a PASS claim.

## UNKNOWN is a first-class result

Brownfield Understanding never turns missing semantic knowledge into certainty. Missing intent manifests, missing bindings, unresolved declared modules, skipped symlinks, or semantics outside conservative analysis are represented as `UNKNOWN` records.

The default semantic-inference adapter is explicitly `none`. Brownfield Understanding therefore records that model-assisted semantic inference was not run. A future model adapter must sit behind the versioned inference boundary and may emit only `INFERRED` records; it cannot manufacture `OBSERVED` or `DECLARED` facts.

## Brownfield graph

The versioned `repository-understanding-v0.1.schema.json` graph includes:

- repository/package/file/interface nodes from the existing source tree;
- Intent entities from a validated Intent IR manifest;
- explicit implementation bindings kept outside durable Intent IR;
- conservative static import relationships;
- candidate test relationships;
- explicit unknowns;
- provenance and confidence on every graph fact.

No absolute repository root is serialized. File references are repository-relative.

## RuleOak self-qualification

This source tree carries a small `.ruleoak/intent/` overlay for three already-existing public capabilities:

- Effect Boundary authorization/execution;
- evidence recording/verification;
- MCP protected execution boundary.

Their source mappings are explicit bindings, not inferred intent. Candidate tests are derived separately from observed imports and remain `INFERRED`.

## Brownfield Understanding non-goals

Brownfield Understanding does not:

- infer a complete product specification from source;
- claim test imports prove behavioral correctness;
- use an LLM by default;
- modify source based on intent;
- implement semantic impact analysis (Semantic Impact);
- implement Evidence Authority for Intent claims (Intent Evidence Authority);
- allow Intent IR authority records to authorize effects;
- replace Git, CI, IDEs, coding agents, or RuleOak's existing authority/effect model.
