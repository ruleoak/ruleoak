# RuleOak Intent Compiler — bounded recompilation experiment

Intent Recompilation tests one narrow hypothesis: an implementation component can be replaced from durable intent and independently re-qualified without preserving its original source structure.

The experiment target is Engineering Memory relevance selection. Model-Independent Execution's original matcher fingerprint is recorded in `qa/recompile/engineering-memory-relevance.intent-package.json`, but the Intent Recompilation runtime path delegates to `packages/cli/src/generated/engineering-memory-relevance.generated.js`. The generated file is reproducible from the Intent Recompile Package and is not hand-authored authority.

```bash
ruleoak compile --experiment engineering-memory-relevance --json
```

The command is dry-run by default. It regenerates candidate bytes in memory, obtains non-authoritative implementer/reviewer advice through the Model-Independent Execution model abstraction, and reports whether the committed generated module matches the deterministic result. `--apply` rewrites only the declared target module.

Success is not source equality. The release gate requires: original runtime isolation; generated-byte reproducibility; structural/source divergence from the Model-Independent Execution baseline; the pre-existing Engineering Memory 10-case regression contract; and downstream Semantic Impact semantic-impact, Intent-Driven Change change-planning, and Context Compiler context contracts. Hosted-model execution remains `NOT_RUN` unless separately authorized and configured. Compiler/model output never becomes Intent Evidence Authority evidence.
