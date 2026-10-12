# Glossary

## Authority Envelope
A bounded authority object describing who/what may act, where, under which constraints and delegation limits.

## Normalized action
A stable operation/resource representation used by policy, approval and execution authority.

## Policy decision
The allow/deny/approval-required result for the normalized action under the current policy/authority state.

## Approval
An explicit human/provider authorization step. Approval does not itself prove execution or external effect.

## ExecutionLease
Short-lived, one-use execution authority bound to the reviewed action. Reuse is rejected.

## EffectReceipt
The evidence record for what RuleOak observed about an execution attempt and its effect state.

## Effect Profile
Reviewed postcondition semantics for a bounded operation/resource shape. A generic tool name is not sufficient provenance.

## Effect Boundary
The combined boundary where authorization, one-use execution authority, effect observation/verification and retry disposition are connected.

## Retry disposition
The evidence-based next-action classification, such as do not retry, retry only with fresh authority, or verify before retry.

## Flight Recorder
Local redacted evidence chain for decisions, execution and effect state.

## Inspector
Capability-discovery and fingerprinting tooling. Discovery evidence does not grant authority.

## Capability Watch
History/drift tooling for normalized capability observations.

## CrashLab
Reproducible reliability scenarios for timeouts, response loss, duplicate retry, races, revocation and stale state.

## `READY_EFFECT_BOUNDARY`
The route is intercepted and trusted postcondition semantics are available for the required path.

## `READY_POLICY_ONLY`
Authorization/interception is healthy, but effect verification is incomplete for at least one required path.

## `ATTENTION`
Configuration, route proof, unresolved effect/evidence or another operator-visible condition requires review.

## Intent-Verified Development
A secondary source-review capability that evaluates external source candidates against declared intent and baseline-owned qualification. It is not the runtime Effect Boundary and does not allow the producing model to certify itself.
