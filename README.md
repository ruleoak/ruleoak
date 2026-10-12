# RuleOak

Published by **RuleOak Pte. Ltd. (UEN 202639787M), Singapore**.

**Authorize exactly. Execute once. Verify the effect. Retry from evidence.**

RuleOak is an Apache-2.0, local-first **Effect Boundary** for supported AI-agent and MCP tool actions. It gives developers a concrete execution boundary where an action can be normalized, authorized, approved when necessary, bound to one-use execution authority, observed, independently checked when trusted postcondition semantics are available, and recorded as verifiable local evidence.

RuleOak v0.50.0 is the starting public release and a **developer preview**. It governs only **supported actions** that actually cross a RuleOak-controlled or cooperating boundary.

## Why RuleOak exists

AI agents can fail in ways that ordinary allow/deny gateways do not resolve. A request may time out after the external side effect already happened. A process can crash after dispatch but before returning a result. A client can retry a tool call even though the first attempt succeeded. A policy can change between evaluation and execution. Two actors can race. A transport response can say “success” without proving the intended external-world postcondition.

**Never blindly retry a consequential action when the effect is still ambiguous.**

RuleOak separates two questions that are often collapsed:

1. **May this exact action execute?** — policy, authority, approval, revocation and one-use execution control.
2. **What actually happened?** — effect receipt, observation quality, trusted postcondition verification and evidence-bound retry disposition.

```text
proposed action
    ↓
normalize exact operation/resource
    ↓
authority + policy + approval
    ↓
one-use ExecutionLease
    ↓
execute once through a cooperating boundary
    ↓
EffectReceipt + observation
    ↓
trusted postcondition verification when available
    ↓
do_not_retry | safe_to_retry_with_new_authority | verify_before_retry
    ↓
local evidence / audit / reconciliation
```

RuleOak does **not** manufacture certainty when effect semantics are unknown.

## 60-second source proof

From a clean source checkout:

```bash
npm run check:bootstrap
node packages/cli/bin/ruleoak.js demo effect-boundary
```

The demo deliberately performs a filesystem write and then loses the execution response. RuleOak checks the expected file digest from external state and reports:

```text
Effect verification: confirmed_success
Retry decision: do_not_retry
Duplicate retry prevented: YES
```

No second write is issued.

After the exact v0.50.0 packages are actually published to npm, the equivalent command is:

```bash
npx @ruleoak/cli@0.50.0 demo effect-boundary
```

See [`DEMO.md`](./DEMO.md) and [`docs/articles/your-ai-agent-timed-out.md`](./docs/articles/your-ai-agent-timed-out.md).

## When RuleOak is a good fit

RuleOak is useful when a software agent or automated workflow can perform actions that are consequential enough that **authorization, replay protection, evidence, or retry correctness matters**. Examples include:

- filesystem writes or destructive changes;
- deployment, infrastructure or environment mutations;
- outbound API/webhook actions;
- issue/ticket creation or updates;
- MCP tool calls that can change external state;
- code-generation workflows where candidate changes must be checked against declared intent and existing qualification evidence.

RuleOak is especially relevant when the caller may retry after timeouts, disconnects or ambiguous responses.

## Choose your path

| You are trying to... | Start here |
|---|---|
| Decide whether RuleOak fits the problem | [`docs/decision-guide.md`](./docs/decision-guide.md) |
| Guard a function/tool you own | [`docs/sdk-integration-guide.md`](./docs/sdk-integration-guide.md) |
| Interpose on an MCP route | [`docs/mcp-integration-guide.md`](./docs/mcp-integration-guide.md) |
| Choose where RuleOak should run | [`docs/deployment-patterns.md`](./docs/deployment-patterns.md) |
| Understand what evidence means | [`docs/evidence-model.md`](./docs/evidence-model.md) |
| Design timeout/retry behavior | [`docs/safe-retry-playbook.md`](./docs/safe-retry-playbook.md) |
| Configure policy/effect/approval boundaries | [`docs/configuration-guide.md`](./docs/configuration-guide.md) |
| Verify CI/release evidence | [`docs/ci-release-verification.md`](./docs/ci-release-verification.md) |
| Interpret benchmark results | [`docs/benchmark-methodology.md`](./docs/benchmark-methodology.md) |
| Decode RuleOak terminology | [`docs/glossary.md`](./docs/glossary.md) |

## When RuleOak is not enough

RuleOak is an **application-layer cooperating boundary**, not universal containment. RuleOak is **not an operating-system sandbox**. It is not a replacement for:

- operating-system sandboxing or endpoint protection;
- identity-provider authentication and enterprise federation;
- network segmentation, TLS termination or secrets management;
- complete prompt-injection prevention;
- malware detection or universal DLP;
- business-domain validation that only the application can know;
- effect verification for a tool whose external semantics are unknown and unreviewed.

If an action bypasses the guarded SDK, CLI, proxy or service, RuleOak does not control it.

## Core concepts

| Concept | Purpose |
|---|---|
| **Authority Envelope** | Bounds who/what may act, where, under which constraints and delegation limits. |
| **Policy decision** | Evaluates the normalized action and returns allow, deny or approval-required. |
| **Approval** | Adds explicit human/provider authorization without changing the underlying policy/effect semantics. |
| **ExecutionLease** | Short-lived, one-use authority bound to the reviewed action. Replay is rejected. |
| **EffectReceipt** | Records what RuleOak observed about execution and the claimed/observed effect. |
| **Effect Profile** | Trusted, reviewable postcondition semantics for a supported operation/resource shape. |
| **Retry disposition** | Separates confirmed success, confirmed no-effect retry eligibility and unresolved/manual verification. |
| **Flight Recorder** | Redacted, hash-chained local evidence for decisions, execution and effect state. |
| **CrashLab** | Reproducible failure scenarios for response loss, duplicate retry, revocation, races and stale state. |

See [`docs/concepts-map.md`](./docs/concepts-map.md) and [`docs/architecture/OVERVIEW.md`](./docs/architecture/OVERVIEW.md).

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

- `READY_EFFECT_BOUNDARY` — route interception is healthy and trusted postcondition semantics are available;
- `READY_POLICY_ONLY` — policy/interception is healthy but the external effect cannot be independently established for at least one route;
- `ATTENTION` — configuration, route proof, evidence or unresolved effect state requires operator action.

Generic tool names such as `write_file` never grant filesystem effect semantics by themselves.

## Recover an uncertain effect

```bash
node packages/cli/bin/ruleoak.js effect pending
node packages/cli/bin/ruleoak.js effect reconcile --limit 20
node packages/cli/bin/ruleoak.js effect show --id <effect-id>
node packages/cli/bin/ruleoak.js effect retry-plan --id <effect-id>
```

Reconciliation reruns bounded observation/postcondition checks. It does **not** replay the original action. A retry requires fresh one-use authority.

## Integration choices

Choose the narrowest boundary you control:

| Integration | Use when | Important boundary |
|---|---|---|
| Node.js SDK | You own the tool/function registry | Calls must go through the guarded wrapper. |
| MCP stdio | You launch a supported local MCP server | Only traffic through the managed wrapper is governed. |
| MCP Streamable HTTP | You proxy a supported MCP HTTP endpoint | Transport behavior and auth assumptions must match the documented contract. |
| Loopback REST authorization | Another local runtime needs decisions | Non-loopback deployment needs explicit transport security/authentication. |
| CLI workflows | You want setup, inspection, reconciliation, evidence and release diagnostics | CLI cannot control actions outside the configured boundary. |

See [`docs/integration-recipes.md`](./docs/integration-recipes.md) and [`docs/use-cases.md`](./docs/use-cases.md).

## Packages

The monorepo contains three first-party packages:

- `@ruleoak/protocol` — public contracts, schemas, conformance vectors and stability metadata;
- `@ruleoak/core` — authority, policy, effect verification, evidence, Inspector, Flight Recorder and CrashLab runtime;
- `@ruleoak/cli` — operator workflows, MCP boundary tooling, approvals, reconciliation, evidence and release diagnostics.

All current first-party source is Apache-2.0.

When the packages are publicly available on npm:

```bash
npm install @ruleoak/core @ruleoak/protocol
npm install --global @ruleoak/cli
```

## Architecture at a glance

```text
Agent / workflow / MCP client
          ↓
     action adapter
          ↓
  normalized action identity
          ↓
 authority → policy → approval/revocation
          ↓
   one-use ExecutionLease
          ↓
 cooperating executor / MCP route
          ↓
      EffectReceipt
          ↓
 Effect Profile / observation
          ↓
 retry disposition + Flight Recorder
```

The enforcement direction is explicit: RuleOak can make strong claims only about actions that cross a RuleOak-controlled or cooperating boundary and about effect semantics for which a trusted postcondition exists.

See [`docs/architecture/OVERVIEW.md`](./docs/architecture/OVERVIEW.md) and [`docs/threat-model.md`](./docs/threat-model.md).

## Evidence and observability

RuleOak keeps decision and effect evidence local by default. Useful checks include:

```bash
node packages/cli/bin/ruleoak.js record verify
node packages/cli/bin/ruleoak.js evidence graph --out evidence-graph.json
node packages/cli/bin/ruleoak.js evidence timeline --limit 100
node packages/cli/bin/ruleoak.js replay --verify --html .ruleoak/report.html
```

Local evidence is designed to preserve uncertainty rather than erase it. Hash chaining is tamper-evident for the event sequence; it is not proof against a privileged local actor who can replace the complete evidence store.

## AI-produced code review is a secondary capability

**AI writes. RuleOak verifies.**

RuleOak also includes an **Intent-Verified Development** stack for reviewing AI- or human-produced source candidates without giving the producing model evidence authority.

```bash
node packages/cli/bin/ruleoak.js dev demo
node packages/cli/bin/ruleoak.js dev ./candidate-source.zip \
  --intent "Fix station switching without regressing Android Auto"
```

The external/chat path can derive intended scope, compare the candidate semantically, run baseline-owned qualification and preserve missing evidence/unknowns without requiring a second RuleOak coding-model call. This stack is experimental unless an individual public contract says otherwise.

See [`docs/one-intent-development.md`](./docs/one-intent-development.md), [`docs/multi-frontend-development.md`](./docs/multi-frontend-development.md), and [`docs/candidate-acceptance-review.md`](./docs/candidate-acceptance-review.md).

## Compatibility and limits

The public preview targets modern Node.js and documented MCP/SDK boundaries. Automated tests distinguish implemented behavior from universal compatibility claims.

See:

- [`docs/compatibility-matrix.md`](./docs/compatibility-matrix.md)
- [`docs/performance-and-limits.md`](./docs/performance-and-limits.md)
- [`docs/security-boundary.md`](./docs/security-boundary.md)
- [`docs/troubleshooting.md`](./docs/troubleshooting.md)

## Verify the source and release

Run the release-blocking source gate:

```bash
npm run qualify
```

Useful focused gates include:

```bash
npm run check:source-manifest
npm test
npm run qa:auto
npm run check:workflow-security
npm run check:standards
npm run check:release-reproducibility
npm run check:pack
npm run check:install-smoke
```

Source PASS is not native/device/store/external PASS. Unavailable external evidence remains explicitly unverified.

For released artifacts, verify checksums, release manifests, SBOM/provenance and hosted attestations as described in [`docs/release-verification.md`](./docs/release-verification.md).

## Repository map

```text
packages/protocol/   public schemas, validators and conformance material
packages/core/       authority/effect/evidence runtime
packages/cli/        CLI, MCP/operator/release workflows
docs/                architecture, security, concepts and integration guidance
examples/            copyable supported integration examples
qa/                  machine-readable qualification contracts
standards/           public standards/crosswalk evidence
scripts/             qualification, packaging and benchmark tooling
.github/             CI, security and release workflows
```

See [`docs/repository-map.md`](./docs/repository-map.md).

## Operational adoption checklist

Before broadening RuleOak beyond a first route, prove that:

1. the consequential action cannot bypass the chosen RuleOak boundary without being visible/documented;
2. deny and approval-required states prevent executor invocation;
3. one-use execution authority rejects replay;
4. timeout/response-loss preserves unresolved effect state instead of issuing a blind retry;
5. reconciliation checks postconditions without replaying the action;
6. routes without trusted effect semantics remain policy-only;
7. local evidence can be verified and contains no secrets you did not intend to retain;
8. CI/package/release claims correspond to the exact artifact you intend to publish.

## Documentation map

Start here:

- [Why RuleOak](./docs/why-ruleoak.md)
- [Getting started](./docs/getting-started.md)
- [Architecture overview](./docs/architecture/OVERVIEW.md)
- [Concepts map](./docs/concepts-map.md)
- [Use cases](./docs/use-cases.md)
- [Integration recipes](./docs/integration-recipes.md)
- [Security boundary](./docs/security-boundary.md)
- [Threat model](./docs/threat-model.md)
- [FAQ](./docs/faq.md)
- [Troubleshooting](./docs/troubleshooting.md)
- [Release verification](./docs/release-verification.md)

## Standards and interoperability

RuleOak includes machine-checkable project evidence and conservative crosswalks. Crosswalks are not certification. Current public material covers documented MCP compatibility, OpenSSF repository-readiness controls, SLSA/GitHub attestation preparation, REUSE licensing hygiene, NIST SSDF mapping and OWASP agent-security references.

```bash
npm run check:standards
npm run benchmark:standards
npm run check:launch
```

See [`docs/standards-and-benchmarks.md`](./docs/standards-and-benchmarks.md).

## Open-source project

RuleOak v0.50.0 is a **single free/open-source project**. The public repository contains the authority/evidence mechanism, tests, schemas, conformance material, examples and qualification tooling needed to inspect and reproduce source-level claims. Future scope is driven by demonstrated technical need rather than artificial feature gating.

## Contributing

Effect Profile contributions are especially useful because they turn tool-specific external semantics into explicit, reviewable postconditions instead of hidden assumptions.

See [`CONTRIBUTING.md`](./CONTRIBUTING.md), [`docs/effect-profiles.md`](./docs/effect-profiles.md), and [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).

## Project status

RuleOak v0.50.0 is a **developer preview**, not 1.0. It is suitable for technical evaluation, controlled pilots and integration testing. External adoption, independent security assurance, universal tool coverage and large-scale production fitness are not implied.

- Website: <https://ruleoak.com>
- Issues: <https://github.com/ruleoak/ruleoak/issues>
- Security: use GitHub private vulnerability reporting; do not disclose unpatched vulnerabilities publicly.
