# Reliability Scorecard & CI

RuleOak The current release includes a deterministic, decomposable report over one or more CrashLab results. It does not produce an opaque safety score and does not replace raw scenario checks.

## Dimensions

The public scorecard contract has six explicit dimensions:

- `duplicate_effect_resistance`
- `revocation_compliance`
- `ambiguity_handling`
- `retry_boundedness`
- `evidence_completeness`
- `recovery_correctness`

Each dimension is `PASS`, `FAIL`, or `NOT_APPLICABLE`, with its applicable checks, pass/fail counts, and the original expected/actual values. The report also preserves per-scenario status and a separate list of failing named invariants.

There is no scalar safety score. The aggregate is only an overall `PASS`/`FAIL` plus scenario and dimension counts.

## CLI

Run multiple explicit scenarios:

```bash
ruleoak crashlab scorecard \
  --scenario scenarios/reliability/pre-effect-timeout.json \
  --scenario scenarios/reliability/idempotent-create-timeout.json
```

Or recursively load JSON scenario files from a directory:

```bash
ruleoak crashlab scorecard --scenario-dir scenarios/reliability
```

Output formats:

```bash
ruleoak crashlab scorecard --scenario-dir scenarios/reliability --format human
ruleoak crashlab scorecard --scenario-dir scenarios/reliability --format json
ruleoak crashlab scorecard --scenario-dir scenarios/reliability --format junit --out reliability.xml
ruleoak crashlab scorecard --scenario-dir scenarios/reliability --format sarif --out reliability.sarif
```

`--json` is a shorthand for `--format json` when `--format` is not supplied.

## CI exit code

- `0` — every scenario and every applicable scorecard dimension passes.
- `2` — at least one scenario or applicable dimension fails.

Invalid input/usage remains a normal CLI error rather than being converted into a reliability result.

## Determinism

Scorecard scenarios and checks are canonicalized by stable identifiers. JSON, JUnit, SARIF, and human output contain no timestamps or random identifiers. Reordering the same scenario inputs does not change report bytes.

The JSON report is versioned as `scorecard_version: "1.0"` and carries the executing RuleOak package version. Its public JSON Schema is `@ruleoak/protocol/schemas/reliability-scorecard.schema.json`.

## JUnit

JUnit represents the six dimensions as test cases. A non-applicable dimension is skipped; a failing dimension contains the failing scenario/check identities and expected/actual values. No source file or line is invented.

## SARIF

SARIF is emitted only for failed reliability checks. Reliability findings are scenario-level operational findings, not source-code diagnostics, so the report deliberately emits no fabricated `locations` or `physicalLocation` entries. The finding properties retain scenario identity, failure class, check identity, expected value, and actual value.

## Compatibility

CrashLab Scenario v1.0/v1.1/v2.0/v2.1 execution semantics are unchanged by the scorecard. The scorecard reads the result checks already produced by those runners and groups them for CI reporting. Authority, revocation, ExecutionLease, EffectReceipt, and evidence semantics are not widened.
