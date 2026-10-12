# RuleOak FAQ

## What is RuleOak?

RuleOak is a local-first authorization, execution-control, effect-evidence and retry-safety boundary for supported AI-agent and MCP tool actions.

## What problem is different from ordinary authorization?

Authorization answers whether an action may execute. It does not prove whether an external effect happened after a timeout, dropped response, process crash or partial failure. RuleOak explicitly models both authorities.

## Is RuleOak a prompt guardrail?

No. Prompt/content guardrails operate around model input/output. RuleOak focuses on concrete tool actions at the execution boundary. Heuristic content signals may be inputs, but they are not the primary security model.

## Is RuleOak a sandbox?

No. RuleOak cannot control an action that bypasses the guarded SDK, CLI, gateway or service. Use OS sandboxing, least privilege and process/network isolation for stronger containment.

## Does RuleOak require a cloud service or account?

No. The public project is local-first and does not require a hosted RuleOak control plane for its core authority/evidence workflows.

## Does RuleOak send telemetry?

External telemetry is off by default. Review workspace configuration and any optional integrations before enabling outbound data flows.

## What is an Effect Boundary?

It is a guarded execution path where RuleOak can connect exact authorization, one-use execution authority, effect observation/postcondition verification and retry disposition. A policy-only proxy without trusted effect semantics is not automatically a full Effect Boundary.

## What is an Effect Profile?

A reviewed contract that tells RuleOak how to verify a specific external effect for a specific operation/resource shape. Generic tool names do not create trusted semantics by themselves.

## Why use one-use execution authority?

It binds the reviewed authorization to one execution attempt and rejects simple replay. A later retry must obtain fresh authority.

## What happens when RuleOak cannot verify the effect?

The effect remains unresolved and retry guidance should remain conservative (`verify_before_retry`) rather than guessing from a timeout, exit code or HTTP response.

## Is the evidence tamper-proof?

No. The local hash chain is tamper-evident within the recorded sequence. A privileged local actor may replace or delete the complete store. Signed checkpoints/external retention can strengthen the model.

## Which Node.js versions are supported?

The public preview targets Node.js 22 or later. CI exercises the current documented matrix; production-like use should prefer supported LTS runtimes.

## Which MCP transports are supported?

RuleOak includes documented stdio and Streamable HTTP behavior for supported JSON-RPC/MCP paths. It does not claim universal compatibility with every client, server, extension or transport variation.

## Can RuleOak protect built-in tools in an AI application?

Only if those actions are actually routed through a cooperating RuleOak boundary. Built-in tools or side channels that bypass RuleOak remain outside its enforcement scope.

## Does RuleOak automatically approve safe actions?

Policy can allow actions under configured rules, but the project does not infer “safe” from a model's confidence or a generic tool label. Approval/policy remains explicit.

## Can RuleOak learn policy automatically?

Learning mode can observe and propose rules, but it does not silently apply permission expansion. A human must review and explicitly apply a suggestion.

## Why are there three npm packages?

- `@ruleoak/protocol` contains public contracts and validators.
- `@ruleoak/core` contains the authority/effect/evidence runtime and SDK.
- `@ruleoak/cli` contains process, MCP, approval, reconciliation and audit workflows.

They are versioned and released together.

## Does RuleOak verify AI-generated source code?

The repository includes an experimental governed candidate-review stack that can compare source against declared intent and baseline-owned qualification. It is secondary to the runtime Effect Boundary and does not let the producing model certify itself.

## Is RuleOak production-ready?

RuleOak v0.50.0 is a pre-1.0 developer preview. It is suitable for evaluation, controlled pilots and integration testing. Production deployment requires review against your threat model, identity model, operating environment, failure modes and effect semantics.

## How do I report a compatibility problem?

Use the GitHub compatibility/issue workflow after the repository is public. Include versions, integration path, sanitized reproduction steps and expected/observed behavior. Do not include secrets or private evidence.
