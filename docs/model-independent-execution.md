# Model-Independent Execution

RuleOak Model-Independent Execution makes model providers replaceable execution resources. Model output is always `NON_AUTHORITATIVE`: it may propose plans, implementation guidance, reviews, or reasoning summaries, but it cannot change Intent authority, obtain tool/mutation authority, or satisfy Intent Evidence Authority evidence requirements.

## Providers

- `deterministic-reference-a` — local deterministic source-qualification provider.
- `deterministic-reference-b` — a second local deterministic strategy used for provider-independence regression testing.
- `openai-responses` — hosted adapter for the OpenAI Responses API. It is never invoked unless `--allow-network` is explicit and both `OPENAI_API_KEY` and `RULEOAK_OPENAI_MODEL` (or `OPENAI_MODEL`) are configured. Requests use `store: false`.

## CLI

```text
ruleoak model providers --json
ruleoak model execute --role planner --provider deterministic-reference-a --task "..." --json
ruleoak model execute --role reviewer --provider openai-responses --context context.json --allow-network --json
```

Usage is recorded per execution. Deterministic providers report `ESTIMATED_LOCAL`; hosted providers use returned provider token usage when a request actually runs. No provider usage fields are added to Intent IR.

## Authority boundary

Every result contains:

```text
authority = NON_AUTHORITATIVE
evidence_authority = EXTERNAL_TO_MODEL_EXECUTION
tool_authority = EXTERNAL_TO_MODEL_EXECUTION
```

A model result cannot be presented as test, device, runtime, external, or other independent evidence merely because the model states that work passed.
