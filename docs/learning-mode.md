# Learning mode

Learning mode reduces repetitive approval work without silently broadening permissions.

```bash
ruleoak protect --learn -- node agent.js
```

RuleOak records proposed actions, groups equivalent patterns, and creates inactive suggestions under `.ruleoak/learning/`.

Review:

```bash
ruleoak learn summary
ruleoak learn review
```

Apply or discard only after inspection:

```bash
ruleoak learn apply --id <suggestion-id> --yes
ruleoak learn discard --id <suggestion-id> --yes
```

Each suggestion includes:

- exact or generalized scope
- proposed effect
- observed resources
- contextual conditions
- expansion-risk level and explanation
- source learning session

Safety invariants:

- no suggestion is automatically active
- critical hard blocks never become allow suggestions
- broad `*` resource patterns receive high expansion-risk ratings
- applied suggestions retain provenance
