# Policy v2

Policy v2 replaces ambiguous broad lists with named rules that can be reviewed, linted, explained, and migrated

## Evaluation principles

1. Invalid policy fails closed
2. Exact denies are evaluated before exact allows
3. Structured deny rules override structured permits
4. Legacy `blockedActions` overrides legacy allow/approval patterns
5. Higher priority and more specific matching choose between non-deny structured rules
6. Critical risk is denied unless an exact or structured allow explicitly sets `allowCritical: true`
7. The default action applies only after no explicit rule matches

## Rule shape

```json
{
  "id": "review-external-writes",
  "description": "External side effects require a user decision",
  "effect": "needs_approval",
  "priority": 50,
  "actions": ["email.send", "web.*", "mcp.email.send"],
  "resources": ["**"],
  "riskAtLeast": "medium",
  "riskAtMost": "critical",
  "conditions": {
    "dataFlows": ["external"],
    "sideEffects": ["mutating", "destructive"],
    "actorTypes": ["agent", "script"]
  }
}
```

## Effects

- `allow`
- `deny` or legacy `block`
- `needs_approval`
- `dry_run_only`

## Conditions

Rules can constrain:

- categories
- operations
- sensitivities
- data flows
- side effects
- actor types
- actor names
- session IDs
- scopes

All supplied conditions must match

## Risk ordering

```text
safe < low < medium < high < critical
```

`riskAtLeast` and `riskAtMost` form an inclusive range

## Resource patterns

- `*` matches one path segment
- `**` matches across path separators
- exact strings match exactly

Keep patterns narrow. Run policy lint to identify broad permits and inconsistent rules

```bash
ruleoak policy lint --dir <workspace>
ruleoak policy lint --dir <workspace> --strict
```

## Migration from legacy policy

Legacy fields remain supported during the pre-1.0 transition:

- `allowedActions`
- `approvalRequired`
- `blockedActions`
- `exactActionRules`

New policy packs use `policyVersion: 2` and `rules`. Prefer Policy v2 for new deployments because named rules produce better decision traces and safer review
