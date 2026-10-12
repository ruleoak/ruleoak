# Agent Release Gate

The experimental Agent Release Gate compares a production agent baseline with a candidate using retained evidence rather than a hidden AI score.

It evaluates new critical failures, unsafe tool calls, duplicate/ambiguous effects, effect-verification coverage, CrashLab status, task-success regression, latency/cost regression, capability drift and an optional ModelQual production-replacement verdict.

The gate now fails closed on missing evidence identity: baseline/candidate evidence fingerprints, suite identity/version, and capability fingerprints are required by the default policy. Null or boolean safety metrics are not coerced to numeric zero.

When the candidate capability fingerprint changes, the candidate must include a capability-drift assessment. Material drift that requires policy review must be explicitly reviewed and bound to the exact candidate fingerprint through `capability_review_fingerprint`; otherwise release is blocked or held for evidence. A reviewed material drift remains visible as a release condition.

ModelQual `SAFE_WITH_CONDITIONS` is also propagated as a RuleOak release condition instead of being silently treated as an unconditional pass.

Decisions are `PASS`, `PASS_WITH_CONDITIONS`, `BLOCK`, `INSUFFICIENT_EVIDENCE`, or `INCOMPARABLE`. A generated Agent Release Passport binds the decision to baseline/candidate evidence and capability fingerprints and includes the effective release-policy digest.

Example:

```sh
ruleoak release gate \
  --baseline production-agent.json \
  --candidate candidate-agent.json \
  --out agent-release-passport.json \
  --junit agent-release.xml
```

CrashLab remains the fault-injection authority; the Release Gate consumes its result instead of introducing a second chaos engine.
