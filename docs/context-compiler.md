# Context Compiler

`ruleoak context <engineering task>` compiles a bounded Context Package from RuleOak Intent, Brownfield Understanding repository understanding, Semantic Impact impact analysis, explicit implementation bindings, candidate tests and evidence requirements.

The compiler is deterministic and local by default. It does not send repository data to a model provider.

## Example

```text
ruleoak context "improve intent change proposal scope planning" --out ruleoak-context.json
```

Optional limits:

```text
--max-bytes 131072 --max-files 20 --max-slice-lines 160
```

An Intent-Driven Change plan can supply the task and affected capability set:

```text
ruleoak context --plan change-plan.json --out context.json
```

The Context Package records included Intent, source/test slices, exclusion rationale, naive-vs-compiled byte accounting, required binding coverage, uncertainty, and the fact that excluded files are **not proven irrelevant**.

Context Compiler does not claim a hosted-model performance result. Its release benchmark uses the same deterministic non-model consumer against naive and compiled context and records hosted same-model A/B as `NOT_RUN`. A real model comparison is an external qualification input once model-provider execution is introduced.
