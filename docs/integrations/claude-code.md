# Claude Code + RuleOak Dev

Claude Code can remain the implementation producer while RuleOak remains the independent verifier:

```bash
ruleoak dev ./candidate-source.zip --intent "Add the requested feature without changing protected intent"
```

The candidate is non-authoritative. RuleOak checks the actual source delta against Intent-Driven Change-derived allowed scope and rejects protected `.ruleoak/intent/` mutation through the external path.
