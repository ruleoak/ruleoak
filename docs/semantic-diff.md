# Semantic Diff v0.1

RuleOak Semantic Diff adds experimental semantic comparison of two software states:

```text
ruleoak diff --semantic <base> <candidate>
ruleoak diff --semantic --base <path-or-git-ref> --candidate <path-or-git-ref>
```

Inside a Git worktree, `ruleoak diff --semantic` defaults to `HEAD` versus the current worktree.

## Authority model

Semantic Diff deliberately separates four provenance classes:

- `DETERMINISTIC` — explicit Intent IR structure changed.
- `OBSERVED` — filesystem or Git state changed.
- `INFERRED` — an observed implementation file is mapped to a capability through an explicit implementation binding or a conservative derived rule.
- `UNKNOWN` — the available sources do not justify a behavioral claim.

A source-code change alone is **not** proof that behavior changed, and it is also not proof that behavior was preserved. If implementation changes while declared behavior does not, Semantic Diff reports actual runtime semantic effect as `UNKNOWN` and invalidates/requires re-evaluation of relevant evidence.

## Report

The report includes capability changes, strengthened/weakened/unknown-direction guarantees, tightened/relaxed budgets, authority changes, declared user-visible/failure/compatibility deltas, implementation changes, evidence invalidation, risks, and explicit uncertainties.

Semantic Diff is planning/review data. It does not replace `ruleoak verify` and cannot certify the candidate.
