# RuleOak use cases

RuleOak is most useful where an automated action can change state and where a wrong retry, replay or authorization decision has a meaningful consequence.

## 1. Protect a local MCP filesystem tool

A coding agent uses an MCP filesystem server. RuleOak wraps the supported route, evaluates writes/deletes before dispatch and uses reviewed filesystem effect semantics where available.

Useful when:

- the MCP tool can mutate source/configuration;
- the caller may retry after timeouts;
- you want local evidence of decisions and effects.

Not guaranteed: control over built-in agent tools or any filesystem access that bypasses the wrapper.

## 2. Guard deployment or infrastructure actions

A tool proposes a deploy, restart, configuration mutation or infrastructure change. RuleOak can bind authorization to the exact normalized action and require approval for higher-consequence operations.

Effect verification should use an explicit domain-specific profile that checks the actual postcondition. A process exit code alone is not enough to claim the external system reached the intended state.

## 3. Prevent duplicate outbound actions

For webhook/API operations such as issue creation, notifications or other external writes, RuleOak can separate permission from retry safety. If a response is lost, reconciliation should inspect a stable external identifier/postcondition before recommending retry.

Unknown remote semantics remain `verify_before_retry`.

## 4. Build a guarded Node.js tool registry

When an application owns the tool registry, use `createRuleOak()` and guarded functions/tools so authorization, one-use authority, effect receipts and evidence remain in one execution chain.

This is stronger than asking application code to remember to call a separate policy API and then execute through an unrelated path.

## 5. Review an AI-produced code candidate

RuleOak can inspect a candidate source archive from a coding agent or human against declared intent and baseline-owned qualification. The producing model does not become the evidence authority.

Useful for:

- limiting change scope;
- preserving protected invariants;
- running available tests/qualification;
- exposing missing evidence rather than claiming completion.

This capability is secondary to the Effect Boundary and remains experimental unless an individual contract says otherwise.

## 6. Reproduce failure behavior before production

Use CrashLab to exercise timeout-before-effect, timeout-after-effect, partial effect, duplicate retry, revocation, expiry, stale state and concurrency scenarios against a declared contract.

CrashLab evidence demonstrates behavior for the exercised fixtures; it does not prove universal production safety.

## 7. Inspect capability drift without granting authority

Inspector and Capability Watch can normalize tools/capabilities and compare fingerprints over time. Discovery metadata can inform review but does not authorize execution.

## Choosing a use case

Start with one action path where failure would matter and where you can prove that the action actually crosses RuleOak. Do not begin by wrapping every tool indiscriminately. First establish:

1. exact action/resource identity;
2. authority and policy intent;
3. execution-path ownership;
4. whether a trustworthy postcondition can be observed;
5. expected retry behavior under ambiguity.
