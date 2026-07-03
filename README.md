# RuleOak

## Agent Firewall + Flight Recorder for AI Agents

RuleOak is a developer-first policy, approval, evidence, and replay layer for AI agents and tool-calling systems.

Modern agents can delete files, run shell commands, call MCP tools, and trigger internal automation. Most teams only discover what happened after the action has already executed. RuleOak is designed to evaluate risky actions before they are forwarded, block or require approval when policy says so, and write hash-chained evidence for later replay and review.

RuleOak v0.1.0 is the first public monorepo release.

## What RuleOak gives developers

- A policy gate before tool execution
- A CLI wrapper for controlled agent/tool runs
- Hash-chained evidence records
- Markdown incident reports
- Single-file HTML replay timelines
- Package-local licenses for npm adoption
- REUSE/SPDX licensing hygiene for enterprise scanners
- A small protocol package that other tools can safely build against

## Quick demo from source

Before npm publication, use the source-tree demo:

```bash
npm install --ignore-scripts
npm run demo:agent-delete
```

Expected result:

```text
RuleOak demo: agent-delete
scripted client will send a JSON-RPC tools/call attempting unsafe delete into child stdin

🛑 [RuleOak Blocked Before Forward]: mcp.filesystem.delete was denied before it reached the child process.

Hash chain: intact
HTML report: .ruleoak-demo-output/mock-project/.ruleoak/report.html
Demo status: blocked before child execution
```

## Quickstart after npm publication

After `@ruleoak/cli` is published to npm:

```bash
npx @ruleoak/cli init
npx @ruleoak/cli demo agent-delete
```

To run an agent or tool process through RuleOak:

```bash
npx @ruleoak/cli run -- node your-agent-loop.js
```

## Local source-tree commands

Use these commands when working from the GitHub source tree:

```bash
npm install --ignore-scripts
npm test
npm run check:publish
npm run demo:agent-delete
npm run replay:demo
npm run replay:demo:html
```

The full publish-readiness check runs:

```bash
npm run check:publish
```

This validates:

- licensing metadata
- npm package metadata
- repository structure
- runtime boundary structure
- test suite
- npm pack contents

## Stdio and JSON-RPC stream interceptor

RuleOak v0.1.0 includes a cross-platform stdio / JSON-RPC line interceptor.

```bash
node packages/cli/bin/ruleoak.js run -- node your-agent-loop.js
```

It watches JSON-RPC `tools/call` requests on the parent/client to child/server path, evaluates the proposed action before forwarding, writes hash-chained evidence, and emits a JSON-RPC error response when a denied action is blocked.

Child stdout is passed through untouched.

The parser handles:

- single-line JSON-RPC messages
- pretty-printed JSON
- JSON-RPC batch arrays
- non-JSON noise on the same stream
- malformed policy fail-closed behavior

## Scope and security boundary

RuleOak is not kernel-level syscall interception.

It does not observe arbitrary in-process function calls that never cross filesystem, network, subprocess, CLI, or JSON-RPC stream boundaries. It is a developer-controlled governance layer for RuleOak-wrapped flows.

See:

- [`docs/security-boundary.md`](./docs/security-boundary.md)

## Incident reports and replay

RuleOak writes hash-chained evidence JSONL and can print a Markdown incident report:

```bash
node packages/cli/bin/ruleoak.js replay --verify --dir .ruleoak-demo-output/mock-project
```

It can also generate a single-file visual HTML timeline:

```bash
node packages/cli/bin/ruleoak.js replay \
  --html .ruleoak-demo-output/mock-project/.ruleoak/report.html \
  --dir .ruleoak-demo-output/mock-project
```

See:

- [`docs/incident-report-format.md`](./docs/incident-report-format.md)
- [`docs/html-timeline-report.md`](./docs/html-timeline-report.md)

## Monorepo packages

| Package | Version | License | Role |
|---|---:|---|---|
| `@ruleoak/protocol` | `0.1.0` | MIT | schemas, fixtures, validators, evidence and action model |
| `@ruleoak/core` | `0.1.0` | Apache-2.0 | policy evaluator and hash-chained recorder |
| `@ruleoak/cli` | `0.1.0` | Apache-2.0 | `init`, `run`, `replay`, and `demo agent-delete` |

Each package has its own package-local `LICENSE` file for npm publishing and scanner compatibility.

## Package metadata and npm readiness

The public RuleOak packages use clean version `0.1.0`. Internal sprint labels are intentionally not used in npm package versions.

Before publishing to npm, run:

```bash
npm install --ignore-scripts
npm run check:publish
npm pack --dry-run --workspace @ruleoak/protocol
npm pack --dry-run --workspace @ruleoak/core
npm pack --dry-run --workspace @ruleoak/cli
```

Internal package dependencies use semver ranges:

| Package | Internal dependency specifiers |
|---|---|
| `@ruleoak/protocol` | none |
| `@ruleoak/core` | `@ruleoak/protocol: ^0.1.0` |
| `@ruleoak/cli` | `@ruleoak/core: ^0.1.0`, `@ruleoak/protocol: ^0.1.0` |

## Licensing

This repository is intentionally not licensed under one blanket root license.

| Area | License |
|---|---|
| `packages/protocol/` | MIT |
| `packages/core/` | Apache-2.0 |
| `packages/cli/` | Apache-2.0 |
| `docs/`, `tests/`, `.github/`, `scripts/` | Apache-2.0 unless a file says otherwise |

See:

- [`LICENSE.md`](./LICENSE.md)
- [`LICENSES/`](./LICENSES/)
- [`packages/protocol/LICENSE`](./packages/protocol/LICENSE)
- [`packages/core/LICENSE`](./packages/core/LICENSE)
- [`packages/cli/LICENSE`](./packages/cli/LICENSE)

## Trademark

The RuleOak name, logo, and related branding are not licensed under the code licenses.

Forks and modified distributions must be clearly renamed and must not imply official RuleOak status.

See [`TRADEMARK.md`](./TRADEMARK.md).

## Contributions

Contributions require DCO sign-off.

```bash
git commit -s -m "Your commit message"
```

DCO is lightweight, but it does not automatically give the RuleOak project maintainer or a future RuleOak legal entity future proprietary relicensing rights for contributor-owned code.

See:

- [`DCO.md`](./DCO.md)
- [`CONTRIBUTING.md`](./CONTRIBUTING.md)
