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


## Licensing model

- `@ruleoak/protocol`: MIT
- `@ruleoak/core`: Apache-2.0
- `@ruleoak/cli`: Apache-2.0
- Repository docs, tests, site source, and maintenance scripts: Apache-2.0 unless a file says otherwise

## Compliance files added or strengthened

- `LICENSE.md` repository license map
- `LICENSES/Apache-2.0.txt` and `LICENSES/MIT.txt`
- package-local `LICENSE` files in every npm package directory
- `AUTHORS.md` using `The RuleOak Authors` pattern
- `REUSE.toml`
- file-level SPDX headers
- `.github/workflows/ci.yml` with REUSE lint
- `TRADEMARK.md`
- `DCO.md`
- strengthened `CONTRIBUTING.md`

## npm publication metadata

Each package now has:

- clean version `0.1.0`;
- correct `license` field;
- `repository` field pointing to the monorepo and package subdirectory;
- package-local `LICENSE` included in `files`;
- no `file:../...` dependency specifiers.

Internal package dependencies now use semver ranges:

- `@ruleoak/core` depends on `@ruleoak/protocol: ^0.1.0`;
- `@ruleoak/cli` depends on `@ruleoak/core: ^0.1.0` and `@ruleoak/protocol: ^0.1.0`.

## Trademark clarification

The RuleOak name and branding are not licensed by MIT or Apache-2.0. Forks and modified distributions must be clearly renamed and must not imply official RuleOak status.

## Contribution clarification

RuleOak currently uses DCO sign-off, not a CLA. DCO is lightweight and adoption-friendly, but it does not automatically give the RuleOak project maintainer or a future RuleOak legal entity proprietary relicensing rights over contributor-owned code.

## Validation

- `npm test` passed.
- `python3 scripts/check_ruleoak_licensing.py` passed.
- `python3 scripts/check_npm_publish_metadata.py` passed.
- `npm run check:phase1-4` passed.
- `npm run check:phase5` passed.
- `npm run check:pack` passed.
