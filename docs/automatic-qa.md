# Automatic QA Authority

RuleOak's canonical qualification includes repository-wide automatic QA before feature-specific test gates.

## Commands

```bash
npm run qa:auto
npm run qa:auto:full
```

`qa:auto` validates release structure without relying on manually maintained test filename lists. `qa:auto:full` runs that structural authority and then every recursively discovered workspace `*.test.js`, including nested test directories.

The automatic QA authority verifies:

- every workspace package version and internal `@ruleoak/*` range matches the root release version;
- every workspace uses automatic recursive test discovery;
- the structural QA inventory is byte-for-byte/order equivalent to the inventory reported by the actual package test runner;
- every shipped JSON and JSON Schema parses;
- shipped JavaScript, scripts, examples, extension code and tests pass Node syntax checking;
- release-critical test/schema/document anchors remain present;
- required public TypeScript declaration symbols remain exported;
- shipped Core/Protocol/CLI modules are reachable from public/CLI entry points unless explicitly allowlisted;
- changelog releases are strictly descending;
- every formal CrashLab failure class has an executable reliability-coverage row and test anchor;
- Scenario v2.1 schema/runtime versions, phases, failure classes, retry strategies, idempotency modes, authority expectations and invariants agree;
- each CrashLab failure class has the same allowed failure phases in runtime and JSON Schema;
- **Concurrency & Staleness** retains its exact introduced failure-class set, Scenario v2.1 authority, one-use/staleness/eventual-consistency invariants, cross-process lease race anchor, and stateful runner anchors;
- **Reliability Scorecard & CI** retains its six dimensions, scorecard version, deterministic CI exit-code contract, four output formats, closed/no-opaque-score schema, and required behavioral tests;
- every formal CrashLab invariant has an explicit Reliability Scorecard dimension mapping, so a new invariant cannot silently fall through to an accidental default dimension;
- Reliability Scorecard v1 runtime dimensions agree with the public protocol constants and JSON Schema, and the scorecard schema cannot accept an opaque top-level `score`.

The failure-class authority is stored in `qa/reliability-coverage-matrix.json`. Reliability contract authority is stored in `qa/reliability-release-contracts.json` and is itself covered by negative regression tests.

A nested discovery sentinel under `packages/core/tests/automatic/` ensures the real package runner continues to execute recursively discovered tests rather than merely counting them.

Automatic QA is not a substitute for behavioral tests, fresh-extraction qualification, packed-package consumer installation, leakage audits, or independent security review. It prevents structural, coverage, and release-contract drift from silently escaping those later gates.
