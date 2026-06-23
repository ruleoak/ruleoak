# RuleOak Core v2.2.0

## Agent Firewall + Flight Recorder for AI agents

RuleOak is an **Agent Firewall** and **Flight Recorder** for AI agents. Before an agent sends, deletes, spends, deploys, or changes production, RuleOak can **block, approve, record, and replay** the action.

![RuleOak Agentic Stack](docs/assets/agentic-diagrams/agentic-stack.svg)

## Why RuleOak exists

Modern agents can call tools, touch files, send messages, run commands, and use MCP-style tool servers. That creates a new operational question:

> What did the agent try to do, who approved it, what policy applied, what evidence was recorded, and can we replay the timeline?

RuleOak answers this with a local-first developer runtime:

- **Agent Firewall** — evaluate tool actions before execution.
- **Flight Recorder** — write append-only Evidence JSONL for actions and decisions.
- **Approval gates** — pause risky actions before they execute.
- **Dry-run mode** — preview dangerous actions without side effects.
- **MCP Permission Gateway** — inventory and govern MCP-style tools.
- **Action Replay** — reconstruct what happened from evidence.
- **Safety CI** — fail unsafe agent/tool configurations.
- **Trust score and badges** — communicate integration maturity without claiming certification.

## 10-minute quickstart

```bash
npm install
npm run agentic:quickstart
npm run agentic:public-demo
npm run agentic:conformance
```

Minimal API example:

```js
import { AgentFirewall, FlightRecorder } from "@ruleoak/core/agentic";

const recorder = new FlightRecorder({ runId: "demo-run" });
const firewall = new AgentFirewall({ recorder });

await firewall.guardAction(
  { toolName: "filesystem", operation: "delete", target: "/important/file" },
  async () => ({ deleted: true })
);
```

By default, dangerous unknown actions fail closed or require approval depending on policy.

## Stable developer surfaces in v2.2.0

- Evidence JSONL v1: `ruleoak.agentic.evidence.v1`
- `.ruleoak.yml` v1: `ruleoak.manifest.v1`
- Agentic public API: `@ruleoak/core/agentic`
- RuleOak Python bridge v1.0.0 package source under `packages/ruleoak-py/`
- RuleOak Agentic Skills v1.0.0 package source under `packages/ruleoak-agentic-skills/`

## Diagrams

- [Agentic stack](docs/assets/agentic-diagrams/agentic-stack.svg)
- [Flight recorder lifecycle](docs/assets/agentic-diagrams/flight-recorder-lifecycle.svg)
- [MCP permission gateway](docs/assets/agentic-diagrams/mcp-permission-gateway.svg)
- [Approval and dry-run flow](docs/assets/agentic-diagrams/approval-dry-run-flow.svg)
- [Manifest and Safety CI flow](docs/assets/agentic-diagrams/manifest-safety-ci-flow.svg)
- [Agentic skill integration](docs/assets/agentic-diagrams/agentic-skill-integration.svg)
- [License boundary](docs/assets/agentic-diagrams/license-boundary.svg)
- [Developer adoption loop](docs/assets/agentic-diagrams/developer-adoption-loop.svg)

## Developer docs

Start here:

- [Developer Guide](docs/DEVELOPER-GUIDE.md)
- [Agentic Guide](docs/agentic/README.md)
- [API Reference](docs/agentic/api-reference.md)
- [Evidence JSONL v1](docs/agentic/evidence-jsonl-v1.md)
- [`.ruleoak.yml` v1](docs/agentic/ruleoak-yml-v1.md)
- [Security and privacy](docs/agentic/security-privacy.md)
- [Conformance kit](docs/agentic/conformance-kit.md)
- [Release notes v2.2.0](docs/agentic/release-notes-v2.2.0.md)


### High-risk agent action demos

RuleOak Core v2.2.0 includes public, local, deterministic demos for seven common risky agent actions: protected-folder delete, shell command, database mutation, dangerous MCP tool, external email-like action, poisoned retrieved context, and risky skill/plugin install.

```bash
npm run agentic:high-risk-demos
npm run test:high-risk-demos
```

See `examples/high-risk-agent-actions/` and `docs/use-cases/high-risk-agent-action-demos.md`.

## License

RuleOak Core is open-source under **AGPL-3.0-or-later** for open-source projects, learning, evaluation, and compatible deployments. For enterprise production use, proprietary vertical application building, closed-source embedding, hosted service use, or compliance without copyleft restrictions, commercial licenses are available. Contact: **hello@ruleoak.com**.

Protocol schemas, fixtures, badge specifications, and conformance samples may be provided under MIT where marked so external projects can emit RuleOak-compatible evidence without adopting the full runtime.

## What RuleOak is not

RuleOak is not a legal/compliance certification, not an LLM provider, not a hosted monitoring system by default, and not a replacement for security review. It is a developer-first local governance and evidence layer for agent actions.

## Release status

Latest public release: **v2.2.0**.

## Public core, private SafeDesk product boundary

RuleOak Core is the public AGPL/commercial runtime for Agent Firewall, Flight Recorder, evidence, approval, replay, and adapters. Public examples include SafeDesk and consumer vertical demos with synthetic data.

The full RuleOak SafeDesk consumer application, polished UI, installers, premium report templates, paid features, customer/license logic, and full vertical workflows are private/commercial product assets.

This lets developers inspect and adopt the trust layer while keeping the packaged consumer product commercially sustainable.

## Public repositories

The public RuleOak ecosystem is split so developers can adopt the protocol and adapters without taking a dependency on the full AGPL runtime unless they need enforcement.

| Repository | Version | License | Use when you need |
|---|---:|---|---|
| [`ruleoak-core`](https://github.com/ruleoak/ruleoak-core) | `2.2.0` | AGPL-3.0-or-later + commercial option | Agent Firewall, Flight Recorder, approval gates, dry-run, replay, runtime enforcement. |
| [`ruleoak-protocol`](https://github.com/ruleoak/ruleoak-protocol) | `1.0.0` | MIT | Evidence JSONL, `.ruleoak.yml`, action envelopes, schemas, badges, and conformance fixtures. |
| [`ruleoak-adapters-ts`](https://github.com/ruleoak/ruleoak-adapters-ts) | `1.0.0` | Apache-2.0 | TypeScript adapters for MCP-style, tool-calling, OpenAI Agents JS-style, LangChain.js-style, Vercel AI SDK-style, coding-agent, and OpenClaw-style workflows. |
| [`ruleoak-py`](https://github.com/ruleoak/ruleoak-py) | `1.0.0` | Apache-2.0 | Python bridge/adapters for LangGraph and Python agentic workflows. |
| [`ruleoak-openclaw-adapter`](https://github.com/ruleoak/ruleoak-openclaw-adapter) | `1.0.0` | MIT | Optional OpenClaw-style compatibility adapter. Not official or endorsed by OpenClaw maintainers. |
| [`ruleoak-agentic-skills`](https://github.com/ruleoak/ruleoak-agentic-skills) | `1.0.0` | Apache-2.0 | Agentic skill manifests, safety scanner, permission summaries, and examples. |

SafeDesk and the consumer/prosumer vertical apps are private/commercial products powered by RuleOak Core. They are not published as public source code.



### High-risk agent action demos

RuleOak Core v2.2.0 includes public, local, deterministic demos for seven common risky agent actions: protected-folder delete, shell command, database mutation, dangerous MCP tool, external email-like action, poisoned retrieved context, and risky skill/plugin install.

```bash
npm run agentic:high-risk-demos
npm run test:high-risk-demos
```

See `examples/high-risk-agent-actions/` and `docs/use-cases/high-risk-agent-action-demos.md`.

## License

RuleOak Core is open source under the GNU Affero General Public License v3.0 or later (`AGPL-3.0-or-later`).

You may use, study, modify, and distribute RuleOak Core under the terms of the AGPL. If you modify or run RuleOak Core as part of a network service, the AGPL may require you to make the corresponding source code available under the same license.

For closed-source embedding, proprietary vertical applications, hosted services, enterprise deployments, or use cases where AGPL obligations are not suitable, commercial licenses are available.

Contact: hello@ruleoak.com
