# @ruleoak/core

Protocol-neutral RuleOak authority and Effect Boundary kernel.

It provides exact action/policy binding, one-use `ExecutionLease`, `EffectReceipt`, provenance-bound postcondition verification, retry disposition, evidence integrity, bounded authority/revocation and supporting capability/reliability primitives.

Unsupported effect semantics fail closed rather than being inferred from a tool name.

## Experimental family contract

The additive `@ruleoak/core/family` entrypoint provides exact release and typed evidence contracts. See the source distribution document `docs/family-contract.md`. Integrity, human review, semantic support, workload qualification and effect confirmation remain independent; evidence never transfers execution authority.
