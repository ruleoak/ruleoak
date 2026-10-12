# Semantic Impact v0.1

RuleOak Semantic Impact adds a deterministic, local-first impact-analysis layer above Intent IR v0.1 and Repository Understanding v0.1.

```text
proposed behavioral change
        |
        v
normalized deterministic vocabulary
        |
        v
candidate direct capabilities (INFERRED)
        |
        +---- reverse declared dependency traversal ----> transitive dependents
        |
        v
protected intent + implementation bindings + candidate tests
        |
        v
conflicts + evidence gaps + UNKNOWN + risk
        |
        v
Impact Graph / human report
```

## Command

```text
ruleoak impact "<proposed behavioral change>" [--dir <path>] [--graph <understanding.json>] [--out <impact.json>] [--json]
```

Semantic Impact does **not** modify source code. It is pre-implementation analysis.

## Authority and provenance

A direct impact classification is `INFERRED`, even though its vocabulary originates in declared Intent. A transitive impact is also `INFERRED`; its dependency basis identifies the declared Repository Understanding edge that caused propagation. Semantic Impact never upgrades an inferred impact into observed behavior or verification evidence.

The deterministic matcher is `deterministic-lexical-v0.1`. Model-assisted semantic classification is intentionally absent in Semantic Impact. An unresolved request remains `UNKNOWN`.

## Protected intent

For every affected capability Semantic Impact collects the relevant declared goals, scenarios, invariants, constraints, budgets, authorities, risks, evidence requirements, and historical incidents. It also returns explicitly bound implementation surfaces and conservative Brownfield Understanding candidate tests.

Candidate tests are navigation hints only. They do not satisfy an evidence requirement until a later evidence authority actually executes/binds qualifying evidence.

## Conflict checks

Semantic Impact performs bounded deterministic checks for:

- potentially weakening/bypassing invariant, constraint, or authority wording;
- numeric conflicts against declared `max`, `min`, or `exact` budgets;
- unresolved and ambiguous capability classification.

Strengthening requests such as “prevent blind retry” must not be classified as a weakening merely because they contain the prohibited phrase.

## Benchmark

`qa/semantic-impact-benchmark.json` is a manually labeled corpus of at least 60 change requests. It includes Effect Boundary, evidence, MCP, repository-understanding, semantic-impact, multi-capability, explicit weakening, budget-conflict, and unrelated/UNKNOWN cases.

Run:

```text
npm run benchmark:impact
npm run check:intent-semantic-impact
```

The Semantic Impact release gate requires precision >= 0.95, recall >= 0.95, and exact-set accuracy >= 0.90. The benchmark is a bounded regression benchmark for the declared RuleOak vocabulary; it is not a claim of general natural-language understanding.

## Non-goals

Semantic Impact does not provide:

- model-assisted semantic interpretation;
- whole-repository semantic completeness;
- proof that candidate tests verify behavior;
- intent-driven code mutation;
- independent evidence execution/adjudication;
- Intent Compilation.
