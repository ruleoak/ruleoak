<p align="center">
  <img src="docs/assets/brand/ruleoak-logo-transparent.png" alt="RuleOak" width="360">
</p>

# RuleOak Core

> **Policy, approval, evidence, and audit for AI tool calls.**
>
> RuleOak wraps proposed agent actions before execution so developers can decide: allow, require approval, or block.

```text
proposed tool call -> policy decision -> evidence record -> approval gate -> audit report
```

## Quickstart: govern a tool call in 10 minutes

```bash
npm install
npm run integrate:10min
npm run report:html
```

The demo shows three tool calls:

| Tool call | Decision | Why |
|---|---|---|
| `search_docs` | allow | read-only local evidence action |
| `send_external_message` | approval required | external communication needs review |
| `delete_workspace_file` | block | destructive local action |

Read [docs/integrations/govern-ai-tool-call-in-10-minutes.md](docs/integrations/govern-ai-tool-call-in-10-minutes.md).

## v2.0.1 polish release

RuleOak Core v2.0.1 improves the public developer path:

- clearer first-screen positioning around governed AI tool calls
- a 10-minute integration guide
- Protocol v1 compatibility statement
- Python SDK compatibility note
- approval inbox UX guidance
- updated demo asset for tool call -> policy -> approval -> audit

## v2.0: report viewer and telemetry export

RuleOak Core v2.0 adds a stronger local report-viewer path and OpenTelemetry-style local export for governance events.

```bash
npm run demo
npm run viewer:build
npm run telemetry:export
npm run report:view
```

The telemetry export writes local JSON/JSONL files only. It does not send telemetry to a backend.

## v2.0: approval-gated write connectors

RuleOak Core v2.0 adds a conservative write-connector pattern. Agents can propose write intents, but external-style writes are policy-checked, evidence-backed, approval-gated, and recorded to a local dry-run outbox.

```bash
npm run write:demo
npm run report:html
```

The included GitHub-style and Jira-style write connectors do not call external services. They demonstrate the governance lifecycle before any real connector is added.

## Try it in two commands

```bash
npm install
npm run launch
```

The launch flow runs the first-user path: examples list, governed demos, sandbox demo, HTML report generation, and next-step guidance.

## 60-second demo

![RuleOak tool-call approval audit demo](docs/assets/demo/ruleoak-tool-call-approval-audit-demo.gif)

The demo path shows:

```text
install → launch → policy decision → evidence → approval → audit report
```

Useful commands:

```bash
npm run demo
npm run sandbox:demo
npm run guard:demo
npm run report:view
npm run onboard
npm test
```

## What RuleOak is for

Use RuleOak when an agent or AI workflow needs to answer these questions clearly:

| Question | RuleOak concept |
|---|---|
| Is this action allowed? | Policy decision |
| What supports this recommendation? | Evidence record |
| Does a human need to approve it? | Approval gate |
| What happened during the run? | Audit log and report |
| Can tool/file/network actions be bounded? | Sandbox foundation |

RuleOak is useful for technical diagnosis, research workflows, review systems, operational assistants, document analysis, and other vertical AI applications where unchecked action is not acceptable.



## MCP Guard Pack + read-only evidence connectors, and approval-gated write connector demos

RuleOak Core v2.0 adds a local MCP Guard Pack + read-only evidence connectors, and approval-gated write connector demos for MCP-style tool requests.

```bash
npm run mcp:demo
```

The demo evaluates three `tools/call` requests before execution:

- `search_docs` → allowed
- `send_external_message` → approval required
- `delete_workspace_file` → blocked

MCP Guard is local-only. It does not run an MCP server, execute tools, or call the network. It normalizes MCP-style tool manifests and records RuleOak policy, evidence, approval, and audit decisions.




## Read-only Evidence Connectors

RuleOak Core v2.0 adds read-only evidence connector patterns for local GitHub/Jira-style fixtures and workspace files.

```bash
npm run connector:demo
```

The connector demo proves the enterprise integration boundary without exposing credentials or writing to external systems:

- collect evidence from local fixtures
- mark records as read-only
- generate deterministic evidence hashes
- produce an audit-style connector report
- avoid network and write actions

Write connectors should come later and should be approval-gated.


## What v2.0 includes

| Area | Included in v2.0 |
|---|---|
| Runtime | Run manager, policy engine, evidence store, approval gate, audit log, report exporter |
| Sandbox foundation | Filesystem, network, command, and tool policy guards with deny-by-default behavior |
| Tool Guard | Governed tool-call decisions with allow, approval-required, and blocked outcomes |
| Demos | Technical Consultant demo and Research Brief demo |
| Launch UX | `npm run launch`, `npm run demo`, workflow chooser, templates, one-page HTML reports, local report viewer |
| Python bridge | Private-preview `ruleoak-py v0.2.1` SDK guidance for RuleOak Core v2.0-compatible governance records and governed LLM calls |
| Local LLM readiness | Hardware check, starter Ollama model recommendation, smoke test helpers |
| Quality signals | Tests, CI workflow, demo GIF, threat model docs, feedback task list |


## Governance Protocol v1 compatibility

RuleOak Core v2.0.1 uses the protocol identifier `ruleoak.governance.v1` for core governance records. The v2.x line should keep this record protocol backward-compatible unless a breaking change is explicitly documented.

Run:

```bash
npm run protocol:conformance
```

Read [docs/protocol/compatibility-statement.md](docs/protocol/compatibility-statement.md).

## Python SDK compatibility

The private-preview `ruleoak-py` SDK should emit records compatible with `ruleoak.governance.v1`. It remains a bridge for Python vertical apps, not a fork of RuleOak Core.

Read [docs/integrations/python-sdk-compatibility.md](docs/integrations/python-sdk-compatibility.md).

## JavaScript/TypeScript and Python

RuleOak Core is the canonical runtime foundation.

Python builders can evaluate the private-preview companion SDK:

```bash
cd ruleoak-py
python -m pip install -e .
python examples/media_workflow_example.py
```

The Python SDK emits RuleOak Core v2.0-compatible run, evidence, approval, audit, policy decision, report, and governed LLM records. It is a bridge, not a fork of the runtime. The SDK is currently private preview and should not be described as a public stable package yet.

Read [docs/integrations/python-sdk.md](docs/integrations/python-sdk.md).

Public release note: `ruleoak-py` is not yet a public stable SDK. It is a private-preview bridge used to validate Python vertical-app integration before final licensing and API boundaries are published.

## Runtime lifecycle

A RuleOak run follows a simple control path:

```text
create run
→ start run
→ collect evidence
→ evaluate proposed action
→ request approval if needed
→ record audit events
→ export report
```

Inspect the runtime:

```bash
npm run runtime:inspect
```

## Sandbox foundation

RuleOak Core v2.0 includes a deny-by-default sandbox foundation. It is a security foundation control layer with automated tests and documentation. It is **not** an externally security-reviewed sandbox yet.

```bash
npm run sandbox:inspect
npm run sandbox:demo
npm run test:sandbox
```

The sandbox evaluates:

- filesystem reads and writes;
- localhost versus external network calls;
- command allow, deny, and approval-required decisions;
- registered tool decisions.

## Examples

```bash
npm run examples:list
npm run example:consultant
npm run example:research
```

| Example | What it shows |
|---|---|
| Technical Consultant Demo | Evidence-backed case analysis, probable cause, recommended action, approval boundary, audit-style report |
| Research Brief Demo | Sourced claims, confidence, known unknowns, recommendation, publishing approval boundary |
| Python Bridge Sample | Generic Python workflow emitting RuleOak-compatible governance records |

Read [docs/examples-matrix.md](docs/examples-matrix.md).

## How RuleOak fits with other agent tools

RuleOak is not trying to replace orchestration, personal-assistant, or observability tools. It focuses on a narrower governance boundary: policy, evidence, approval, audit, and sandbox controls.

Read [docs/comparisons.md](docs/comparisons.md).

## Contributing and feedback

RuleOak Core is currently in a **feedback-first contribution phase**.

Issues and Discussions are welcome. Pull requests are disabled while the project finalizes its contribution governance and licensing process.

Useful feedback includes:

- setup problems
- broken commands
- unclear README steps
- confusing examples
- policy or audit model questions
- sandbox boundary questions
- integration ideas
- documentation improvements
- security concerns reported privately

At this stage, please do not send unsolicited code patches. External code contributions may require a Contributor License Agreement or equivalent contribution terms in the future.

Start here:

- Use Issues for concrete bugs or documentation problems.
- Use Discussions for questions, design feedback, and integration ideas.
- Use `SECURITY.md` for vulnerability reporting.

Read [docs/community/feedback-tasks.md](docs/community/feedback-tasks.md).

## HTML reports and local viewer

Generate one-page reports:

```bash
npm run report:html
```

Open a local-only browser viewer:

```bash
npm run report:view
```

The viewer serves reports at `http://127.0.0.1:8787/` from your machine. It is not a hosted cloud service.

## Create your own workflow

```bash
npm run roak:init -- my-workflow --template=consultant-workflow
npm run roak:init -- my-research --template=research-workflow
npm run roak:init -- my-minimal --template=minimal-governed-workflow
```

Each template gives you a small policy, sample input, and workflow notes so you can adapt the RuleOak pattern to your own domain.

## Local LLM readiness

```bash
npm run llm:doctor
npm run llm:pull
npm run llm:smoke
```

The local LLM helper checks your machine and recommends a starter Ollama model. It is onboarding guidance, not a benchmark.

## What v2.0 is not

RuleOak Core v2.0 is not yet:

- a mature enterprise platform;
- an externally security-reviewed sandbox;
- a certified compliance product;
- a hosted cloud service;
- a finished vertical application.

The current release is a runtime foundation for learning, prototyping, and building governed workflows.

## Documentation

| Need | Start here |
|---|---|
| Quickstart | [docs/quickstart.md](docs/quickstart.md) |
| Runtime lifecycle | [docs/runtime-lifecycle.md](docs/runtime-lifecycle.md) |
| Sandbox foundation | [docs/sandbox-foundation.md](docs/sandbox-foundation.md) |
| Python SDK bridge | [docs/integrations/python-sdk.md](docs/integrations/python-sdk.md) |
| Comparison with other tools | [docs/comparisons.md](docs/comparisons.md) |
| Feedback tasks | [docs/community/feedback-tasks.md](docs/community/feedback-tasks.md) |
| Threat model | [docs/security/threat-model.md](docs/security/threat-model.md) |
| Build a vertical workflow | [docs/build-a-vertical.md](docs/build-a-vertical.md) |
| Local LLM readiness | [docs/local-llm.md](docs/local-llm.md) |
| License FAQ | [docs/license-faq.md](docs/license-faq.md) |
| Brand rationale | [docs/brand-rationale.md](docs/brand-rationale.md) |

## License

RuleOak Core is licensed under **AGPL-3.0-or-later**. See [LICENSE](LICENSE) and [docs/license-faq.md](docs/license-faq.md).


## RuleOak Core

> **Govern every AI tool call before it acts.**
>
> RuleOak Core v2.0.1 includes Tool Guard: policy, evidence, approval, and audit around agent actions and tool calls.
 v2.0: Governed Tool Calls

RuleOak Core v2.0.1 includes Tool Guard and an MCP Guard prototype. Start with `npm run guard:demo`, then read `docs/tool-guard.md` and `docs/mcp-guard.md`.


## Governance Record Protocol

RuleOak Core v2.0 adds `ruleoak.governance.v1`, a documented governance record protocol with JSON schemas, golden records, and a conformance test kit. This makes RuleOak records easier to validate across TypeScript Core, the private-preview Python bridge, and future adapters.

```bash
npm run protocol:conformance
npm run test:protocol
```


## LangGraph and CrewAI Adapter Samples

RuleOak Core v2.0 includes dependency-free adapter samples that show how to wrap agent-framework tool calls with RuleOak Tool Guard.

```bash
npm run adapter:demo
npm run test:adapters
```


## MCP Guard Proxy Prototype

RuleOak Core v2.0 includes a local in-process MCP Guard Proxy prototype for JSON-RPC `tools/call` requests.

```bash
npm run mcp:proxy:demo
npm run test:mcp-proxy
```

The proxy demonstrates how RuleOak can sit between an AI client and MCP-style tool execution.

## Reusable policy packs

RuleOak Core v2.0 adds reusable policy packs for common agent risk areas:

- filesystem safety
- external communication
- ticketing read-only evidence
- approval-gated ticketing writes
- cloud LLM approval
- PII redaction

Try them:

```bash
npm run policy:packs:list
npm run policy:demo
```

Policy packs make RuleOak easier to adopt because teams can start from explicit governance defaults instead of embedding safety rules inside prompts.

## Local Approval Inbox

RuleOak Core v2.0 adds a local approval inbox for actions that require human review. It collects pending approvals from RuleOak reports and builds a local HTML viewer.

Try it:

```bash
npm run guard:demo
npm run approval:inbox:build
npm run approval:inbox
```

The inbox is local-first and file-backed. It does not call external services.
