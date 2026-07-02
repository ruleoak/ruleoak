# RuleOak

## Agent Firewall + Flight Recorder for AI Agents

Your AI agent can delete files, run shell commands, and call tools now. Most people have no idea what it actually did until it is too late. RuleOak blocks dangerous actions before they happen and gives you a black-box recording of every action.

```text
$ npx @ruleoak/cli demo agent-delete

RuleOak demo: agent-delete
scripted client sends a JSON-RPC tools/call into child stdin

🛑 [RuleOak Blocked Before Forward]: mcp.filesystem.delete was denied before it reached the child process.
Hash chain: intact
HTML report: .ruleoak/report.html
```

## Quickstart

```bash
npx @ruleoak/cli init
```

For this source tree before npm publication:

```bash
npm install --ignore-scripts
npm run demo:agent-delete
npm test
```

## Stdio / JSON-RPC stream interceptor

Phase 5 removes the old launch-path dependency on process hooks. `ruleoak run -- <command>` now uses a cross-platform stdio/JSON-RPC line interceptor:

```bash
ruleoak run -- node your-agent-loop.js
```

It watches JSON-RPC `tools/call` requests on the inbound parent/client → child/server path, evaluates the proposed action before forwarding, writes hash-chained evidence, and emits a JSON-RPC error response when a denied action is blocked. Child stdout is passed through untouched.

The parser handles pretty-printed JSON, JSON-RPC batch arrays, and non-JSON noise on the same stream. Malformed policy fails closed before the child starts.

Scope honesty: this is not kernel-level syscall interception. It does not observe arbitrary in-process function calls that never cross filesystem, network, subprocess, or JSON-RPC stream boundaries. MCP server gateway interception is a roadmap item, not a Phase 5 claim.

## Incident-report format

RuleOak writes hash-chained evidence JSONL and can print a Markdown incident report:

```bash
node packages/cli/bin/ruleoak.js replay --verify --dir .ruleoak-demo-output/mock-project
```

It can also generate a single-file visual HTML timeline:

```bash
node packages/cli/bin/ruleoak.js replay --html .ruleoak-demo-output/mock-project/.ruleoak/report.html --dir .ruleoak-demo-output/mock-project
```

See:

- [`docs/incident-report-format.md`](./docs/incident-report-format.md)
- [`docs/html-timeline-report.md`](./docs/html-timeline-report.md)
- [`docs/security-boundary.md`](./docs/security-boundary.md)
- [`docs/telemetry.md`](./docs/telemetry.md)

## Monorepo packages

| Package | License | Role |
|---|---|---|
| `@ruleoak/protocol` | MIT | schemas, fixtures, validators, evidence/action model |
| `@ruleoak/core` | Apache-2.0 | policy evaluator and hash-chained recorder |
| `@ruleoak/cli` | Apache-2.0 | `init`, `run`, `replay`, `demo agent-delete` |


Adapters, Python bridge, OpenClaw-style adapter, Agentic Skills, SafeDesk, and proof apps are not part of the supported public launch surface for this sprint. See `ARCHIVED_REPOS.md` before publishing or archiving any old adapter repository.


## Package metadata and first public npm version

The public RuleOak packages use clean version `0.1.0`. Internal sprint labels are intentionally not used in npm package versions.

Before publishing to npm, run:

```bash
npm install --ignore-scripts
npm run check:publish
npm pack --dry-run --workspace @ruleoak/protocol
npm pack --dry-run --workspace @ruleoak/core
npm pack --dry-run --workspace @ruleoak/cli
```

Each package has its own `LICENSE` file and npm metadata:

| Package | Version | License | Internal dependency specifiers |
|---|---:|---|---|
| `@ruleoak/protocol` | `0.1.0` | MIT | none |
| `@ruleoak/core` | `0.1.0` | Apache-2.0 | `@ruleoak/protocol: ^0.1.0` |
| `@ruleoak/cli` | `0.1.0` | Apache-2.0 | `@ruleoak/core: ^0.1.0`, `@ruleoak/protocol: ^0.1.0` |

## Licensing, trademark, and contributions

This repository is intentionally not licensed under one blanket root license.

| Area | License |
|---|---:|
| `packages/protocol/` | MIT |
| `packages/core/` | Apache-2.0 |
| `packages/cli/` | Apache-2.0 |
| `docs/`, `site/`, `tests/`, `.github/`, `scripts/` | Apache-2.0 unless a file says otherwise |

See `LICENSE.md` for the repository license map, `LICENSES/` for full license texts, and each package-local `LICENSE` file for the package license.

The RuleOak name, logo, and related branding are not licensed under the code licenses. Forks and modified distributions must be clearly renamed and must not imply official status. See `TRADEMARK.md`.

Contributions require DCO sign-off. DCO is lightweight but does not automatically give the RuleOak project maintainer, or a future RuleOak legal entity, future proprietary relicensing rights for contributor-owned code. See `DCO.md` and `CONTRIBUTING.md`.
