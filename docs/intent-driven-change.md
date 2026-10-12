# Intent-Driven Change v0.1

Intent-Driven Change introduces an experimental change orchestration boundary around the the Intent-Verified Development primitives.

```bash
ruleoak change "improve the desired behavior"
```

is **dry-run by default**. It creates a Proposed Intent Delta, runs Semantic Impact, derives an explicit implementation scope from Brownfield Understanding bindings, and assigns separate planner, implementer, reviewer and evidence-adjudicator authorities. It does not modify source.

Mutation requires both explicit apply mode and a separately produced implementation proposal tied to the exact `plan_id`:

```bash
ruleoak change "improve the desired behavior" --apply --proposal implementation-proposal.json
```

Before the first write RuleOak rejects proposals that are stale, out of scope, exceed the file/size budget, traverse symlinks, target denied runtime/authority paths, or do not match the exact plan. Existing files require exact path authorization; new files may only be created beneath plan-derived implementation/test prefixes.

The implementation producer may include assertions such as claimed test results, but these are recorded as `NON_AUTHORITATIVE`. They never satisfy Intent Evidence Authority evidence requirements. After mutation RuleOak compares exact in-memory pre/post snapshots using Semantic Diff and then runs Intent Evidence Authority. Without independent evidence the source may be changed but the change remains `APPLIED_VERIFICATION_REQUIRED` rather than qualified.

Intent-Driven Change intentionally does not invoke a specific LLM/model provider. It defines the safe implementation-proposal handoff and role separation. Model/provider execution belongs to a later model-execution abstraction wave.
