# RuleOak Verify — change assurance

RuleOak Verify is an experimental, agent-neutral change-assurance surface built on the Intent-Verified Development stack. It combines observed source changes, Semantic Diff, Intent Evidence Authority independent evidence adjudication and Engineering Memory historical regression protections into one PR/change report.

## Modes

- **Observe** never blocks. It reports what RuleOak can establish and leaves uncertainty explicit.
- **Verify** returns PASS only when affected governed capabilities have sufficient independent evidence. Missing or incomplete semantic/evidence context returns REVIEW; independent FAIL/CONFLICTED evidence blocks.
- **Govern** blocks unsafe or ungoverned code changes, weakened protected guarantees, relaxed declared budgets where policy applies, and insufficient affected evidence.

Use product mode with change-assurance flags:

```text
ruleoak verify --mode observe --base <base> --candidate <candidate>
ruleoak verify --mode verify --base <base> --candidate <candidate>
ruleoak verify --mode govern --base <base> --candidate <candidate>
```

The pre-RuleOak Verify evidence-only `ruleoak verify` command remains available when product flags are absent.

## Truth boundaries

A report decision is advice, not repository merge authority. `DETERMINISTIC`, `OBSERVED`, `INFERRED`, and `UNKNOWN` provenance remain distinct. Model/agent assertions never satisfy Intent Evidence Authority evidence requirements. When Intent is absent, Observe still provides an observed change report but semantic certainty remains unavailable.
