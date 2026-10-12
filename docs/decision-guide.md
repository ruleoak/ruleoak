# Decision guide: is RuleOak the right boundary?

RuleOak is useful when an automated system can perform a **consequential action** and the engineering problem is not only whether the action is allowed, but also whether the effect can be established safely after execution.

## Start with three questions

1. **Can the action cause durable external change?** Examples include file mutation, deployment, infrastructure change, issue creation, outbound webhook delivery, or another operation that can be expensive or unsafe to duplicate.
2. **Does the action actually cross a boundary you can control?** RuleOak governs cooperating SDK, CLI, MCP, REST, or proxy paths. It cannot govern an action that bypasses that path.
3. **Can you define useful postcondition evidence?** Exact effect verification is strongest when the operation has a trusted, bounded, observable postcondition. When it does not, RuleOak must preserve uncertainty rather than invent success.

## Strong fit

RuleOak is a strong fit when one or more of these are true:

- a timeout or disconnect could cause a dangerous duplicate retry;
- one-use authorization is preferable to reusable permission;
- the action needs a visible policy/approval/revocation path;
- the system needs a durable local evidence trail for what was authorized and observed;
- operators need to distinguish confirmed success, confirmed no-effect, and unresolved effect state;
- MCP capability drift or policy drift needs to be surfaced before execution;
- a development workflow needs external source candidates checked against declared intent without letting the producing model certify itself.

## Partial fit

RuleOak can still help when authorization is clear but effect verification is weak. In that case a route can remain `READY_POLICY_ONLY`: the authorization boundary is useful, but retry safety must not be overstated. You may need application-specific reconciliation or manual verification.

## Poor fit

RuleOak is not the primary solution when the main problem is:

- operating-system containment or malware isolation;
- enterprise identity/federation;
- network segmentation or TLS termination;
- secrets storage;
- universal prompt-injection prevention;
- arbitrary DLP across processes that do not cooperate;
- domain correctness that only your application can validate.

Those controls may be complementary, but they are different authorities.

## Decision matrix

| Question | If yes | If no |
|---|---|---|
| Can the action change durable external state? | Continue evaluating RuleOak. | Ordinary validation/observability may be sufficient. |
| Can you force the action through a cooperating boundary? | SDK/MCP/REST/CLI integration is possible. | RuleOak cannot govern the bypass path. |
| Can a retry duplicate or corrupt an effect? | Effect evidence and one-use authority are especially valuable. | Authorization/evidence may still help, but retry safety is less central. |
| Can you define a trusted postcondition? | `READY_EFFECT_BOUNDARY` is achievable. | Keep the route policy-only or unresolved. |
| Do you need local audit/reconciliation evidence? | Flight Recorder and evidence tooling fit naturally. | A smaller authorization layer may be enough. |

## Minimum adoption target

Do not begin by routing every tool through RuleOak. Pick **one consequential operation**, prove that deny prevents execution, prove one-use authority rejects replay, induce a response-loss case, and verify what the system does when the effect remains uncertain. Broaden scope only after that boundary is understood.

See also: [Deployment patterns](./deployment-patterns.md), [Use cases](./use-cases.md), [Threat model](./threat-model.md), and [Safe retry playbook](./safe-retry-playbook.md).
