# RuleOak

Published by **RuleOak Pte. Ltd. (UEN 202639787M), Singapore**.

**Never blindly retry a consequential AI-agent action.**

RuleOak is an Apache-2.0, local-first **Effect Boundary** for supported AI-agent and MCP actions. It separates authorization from outcome: authorize an exact action, issue one-use execution authority, execute once, verify the external effect when trusted postcondition semantics are available, and make the retry decision from evidence rather than assumption.

RuleOak v0.50.0 is the starting public release and a **developer preview**.

## 60-second source proof

From a clean source checkout:

```bash
npm run check:bootstrap
node packages/cli/bin/ruleoak.js demo effect-boundary
```

The demo deliberately performs a filesystem write and then loses the execution response. RuleOak independently checks the expected file digest and reports:

```text
Effect verification: confirmed_success
Retry decision: do_not_retry
Duplicate retry prevented: YES
```

No second write is issued.

After `@ruleoak/*` v0.50.0 is actually published to npm, the equivalent exact-version command is:

```bash
npx @ruleoak/cli@0.50.0 demo effect-boundary
```

See [`DEMO.md`](./DEMO.md) and [`docs/articles/your-ai-agent-timed-out.md`](./docs/articles/your-ai-agent-timed-out.md).

## Effect Boundary

```text
agent/tool intent
      ↓
exact policy + approval
      ↓
one-use ExecutionLease
      ↓
execute once
      ↓
EffectReceipt
      ↓
independent postcondition verification
      ↓
DO_NOT_RETRY | SAFE_TO_RETRY_WITH_NEW_AUTHORITY | VERIFY_BEFORE_RETRY
      ↓
tamper-evident local evidence
```

RuleOak does **not** turn unknown semantics into certainty. A healthy proxy route is not automatically a full Effect Boundary. Unsupported or custom tool semantics remain explicit `UNKNOWN` / manual-review work.

## Protect a supported MCP route

Analyze configuration without changing it:

```bash
node packages/cli/bin/ruleoak.js protect --setup --dry-run
```

Apply a supported stdio MCP wrapper and verify the boundary:

```bash
node packages/cli/bin/ruleoak.js protect --setup --apply
node packages/cli/bin/ruleoak.js protect check
node packages/cli/bin/ruleoak.js protect status
```

For Codex, add a new MCP server through RuleOak:

```bash
node packages/cli/bin/ruleoak.js protect codex add --name protected-server -- <server-command> [args...]
node packages/cli/bin/ruleoak.js protect check --require-effect-boundary
```

`protect check` distinguishes:

- `READY_EFFECT_BOUNDARY` — the route is healthy and trusted postcondition semantics are available;
- `READY_POLICY_ONLY` — interception/policy is healthy but RuleOak cannot prove the external effect for that route;
- `ATTENTION` — configuration, evidence, route proof, or unresolved-effect state requires operator action.

Generic tool names such as `write_file` never grant filesystem effect semantics by themselves.

## Recover an uncertain effect

```bash
node packages/cli/bin/ruleoak.js effect pending
node packages/cli/bin/ruleoak.js effect reconcile --limit 20
node packages/cli/bin/ruleoak.js effect show --id <effect-id>
node packages/cli/bin/ruleoak.js effect retry-plan --id <effect-id>
```

Reconciliation never replays the original action. A retry requires fresh one-use authority.

## RuleOak Dev — AI writes. RuleOak verifies.

RuleOak can review a candidate produced by ChatGPT, Codex, Claude, Cursor, another agent, or a human without giving the coding model evidence authority.

Run the deterministic demo:

```bash
node packages/cli/bin/ruleoak.js dev demo
```

Review an external candidate:

```bash
node packages/cli/bin/ruleoak.js dev ./candidate-source.zip \
  --intent "Fix station switching without regressing Android Auto"
```

The default external/chat path makes **zero RuleOak planner/implementer model calls**. It derives the allowed scope, compares the candidate semantically, runs available baseline-owned qualification, preserves missing evidence and unknowns, and can optionally hand the exact candidate ZIP to a configured external qualification inbox.

See [`docs/dev-quickstart.md`](./docs/dev-quickstart.md), [`docs/multi-frontend-development.md`](./docs/multi-frontend-development.md), and [`docs/candidate-acceptance-review.md`](./docs/candidate-acceptance-review.md).

## Intent-Verified Development

The public repository includes a semantic development stack organized by capability rather than development chronology:

- **Intent IR** — implementation-independent product intent and invariants;
- **Brownfield Understanding** — observed repository structure plus declared Intent bindings;
- **Semantic Impact** — deterministic affected-capability and protected-intent analysis;
- **Intent Evidence Authority** — typed evidence adjudication that rejects model self-certification;
- **Semantic Diff** — declared/observed/inferred/unknown change analysis;
- **Intent-Driven Change** — plan-bound mutation scope and stale-source protection;
- **Context Compiler** — bounded task-relevant context rather than repository-wide context stuffing;
- **Engineering Memory** — explicit historical regression knowledge that may strengthen planning but never proves current code;
- **Model-Independent Execution** — replaceable non-authoritative model providers;
- **RuleOak Verify** — observe / verify / govern change-assurance modes;
- **OakSpec 1.0** — preview interoperability format for candidate semantics;
- **Validation Hardening** — adversarial, hostile-repository, attestation, scale, and external-validation harnesses;
- **One-Intent Development** — one front door for governed planning, implementation, qualification, and bounded repair;
- **Development Learning** — reviewable learning candidates with explicit promotion only;
- **Multi-Frontend Development** — shared authority semantics across CLI, API, chat, and external-agent candidates;
- **Candidate Acceptance Review** — one operator-facing summary of changed behavior, failed protected checks, missing evidence, unknowns, and next actions;
- **Review Continuity** — reusable review inputs and identity-bound receipts without reusing stale evidence.

These capabilities are experimental unless their individual public contracts say otherwise.

## Local evidence and adoption signals

Useful local evidence can be inspected without upload:

```bash
node packages/cli/bin/ruleoak.js protect value
node packages/cli/bin/ruleoak.js feedback snapshot --out ruleoak-adoption-snapshot.json
node packages/cli/bin/ruleoak.js record verify
```

The generated adoption snapshot contains aggregate local activation and safety signals only. It excludes project paths, prompts, credentials, raw evidence, source code, and source hashes. Local source/tests do not establish external adoption, retention, willingness to pay, or independent security assurance.

## Packages

The monorepo contains three first-party packages:

- `@ruleoak/protocol` — public contracts, schemas, conformance vectors, and stability metadata;
- `@ruleoak/core` — authority, effect-verification, evidence, Inspector, Flight Recorder, and CrashLab kernel;
- `@ruleoak/cli` — operator workflows, MCP execution-boundary tooling, development review, and release diagnostics.

All current first-party source is Apache-2.0.

When the packages are publicly available on npm:

```bash
npm install @ruleoak/core @ruleoak/protocol
npm install --global @ruleoak/cli
```

## Security boundary

RuleOak controls only supported actions that cross a RuleOak-controlled or cooperating boundary. It is **not** an operating-system sandbox, kernel reference monitor, EDR, anti-malware product, universal prompt-injection detector, or guarantee that every custom MCP tool has automatic effect semantics.

See [`SECURITY.md`](./SECURITY.md) and [`docs/security/BOUNDARY.md`](./docs/security/BOUNDARY.md).

## Standards and interoperability

RuleOak ships machine-checkable project evidence and conservative crosswalks. A crosswalk is not certification.

```bash
npm run check:standards
npm run benchmark:standards
npm run check:launch
```

The release includes current MCP compatibility work, OpenSSF repository-readiness checks, SLSA/GitHub attestation configuration, REUSE licensing hygiene, NIST SSDF crosswalk material, and OWASP agent-security references. Exact claims and limitations are documented in [`docs/standards-and-benchmarks.md`](./docs/standards-and-benchmarks.md).

## Release qualification

Run the complete release-blocking source gate:

```bash
npm run qualify
```

The qualification pipeline covers source integrity, semantic development contracts, package tests, MCP compatibility, public/private boundaries, documentation/product truth, API stability, authority/evidence/CrashLab checks, workflow security, standards checks, reproducible packaging, npm-pack contents, and clean packed-install smoke tests.

Source PASS is not native/device/store/external PASS. Unavailable external evidence remains explicitly unverified.

Local performance checks are reproducible but are not represented as independent benchmarks:

```bash
npm run benchmark
npm run benchmark:release
```

## Open-source project

RuleOak v0.50.0 is a **single free/open-source project**. The public repository contains the authority/evidence mechanism, tests, schemas, conformance material, examples, and qualification tooling needed to inspect and reproduce its claims. Future scope is driven by demonstrated technical need rather than artificial feature gating.

## Contributing

Effect Profile contributions are particularly useful because they turn tool-specific external semantics into explicit, reviewable postconditions without hiding the mechanism behind a proprietary service.

See [`CONTRIBUTING.md`](./CONTRIBUTING.md), [`docs/effect-profiles.md`](./docs/effect-profiles.md), and [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).

## Project status

RuleOak v0.50.0 is a **developer preview**, not 1.0. The Effect Boundary and supporting development/evidence tooling are available for public technical evaluation, but external adoption, independent security assurance, universal tool coverage, and large-scale production fitness are not implied.

- Website: <https://ruleoak.com>
- Issues: <https://github.com/ruleoak/ruleoak/issues>
- Security: use GitHub private vulnerability reporting; do not disclose unpatched vulnerabilities publicly.
