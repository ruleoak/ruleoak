# ChatGPT + RuleOak Dev

Use ChatGPT to analyze and implement the feature, then use RuleOak as the independent local verifier.

```text
ChatGPT produces candidate source
        ↓
ruleoak dev candidate-source.zip --intent "..."
        ↓
Intent-Driven Change scope review + Semantic Diff semantic comparison + local qualification + Intent Evidence Authority evidence
        ↓
optional exact-ZIP handoff to external qualification runner
        ↓
Development Learning candidate (never implicitly promoted)
```

RuleOak external mode makes zero RuleOak planner/implementer model calls. ChatGPT usage remains outside RuleOak accounting.

Recommended handoff prompt to the coding chat: ask for a complete source ZIP that preserves package/application identity unless the requested change requires otherwise, includes regression tests, excludes generated dependencies/build outputs, and states what was not natively executed.
