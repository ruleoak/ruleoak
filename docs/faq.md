# RuleOak FAQ

## What is RuleOak?

RuleOak is a local-first authorization and evidence boundary for AI agent and MCP tool actions. It evaluates a proposed action before execution, returns allow, deny, or approval-required, and records redacted evidence.

## Is RuleOak a prompt guardrail?

No. Prompt and content guardrails operate around model input and output. RuleOak is focused on concrete tool actions at the execution boundary. It can use heuristic prompt-injection or secret signals, but those are defense-in-depth inputs rather than its primary security model.

## Is RuleOak a sandbox?

No. RuleOak cannot control an action that bypasses the guarded SDK, CLI, gateway, or service. Use operating-system sandboxing and least privilege for stronger containment.

## Does RuleOak require a cloud service?

No. The public packages are local-first and do not require an account or hosted control plane.

## Does RuleOak send telemetry?

External telemetry is off by default. Review workspace configuration and the security boundary before enabling any optional integration.

## Which Node.js versions are supported?

The public preview supports Node.js 22 or later. CI tests Node.js 22 and 24 LTS and Node.js 26 Current.

## Which MCP transports are supported?

RuleOak includes an MCP-style stdio boundary and a Streamable HTTP gateway for documented JSON-RPC behavior. It does not claim complete compatibility with every client, server, extension, or transport variation.

## Why use one-time decision receipts?

A receipt binds the authorization result to the evaluated action and policy. A cooperating executor can consume an allow receipt once before causing side effects, reducing simple replay and time-of-check/time-of-use mistakes.

## Is the evidence tamper-proof?

No. The local hash chain is tamper-evident within the event sequence. A privileged local actor may replace or delete the complete store. Signed checkpoints and external storage can strengthen the model.

## Can RuleOak automatically learn policy?

Learning mode can group observed actions and propose rules, but it never applies permission expansion silently. A human must review and explicitly apply a suggestion.

## Why are there three npm packages?

- `@ruleoak/protocol` contains open contracts and validators
- `@ruleoak/core` contains the authorization runtime and SDK
- `@ruleoak/cli` contains process, MCP, approval, policy, and audit workflows

They are versioned and released together.

## Is RuleOak production-ready?

RuleOak is a pre-1.0 public preview. It is suitable for evaluation, local development, controlled pilots, and integration testing. Production deployment requires review against your threat model, identity model, operating environment, and failure modes.
