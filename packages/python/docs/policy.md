# Policy

Policy keys match `@ruleoak/core`: `defaultAction`, `allowedActions`, `approvalRequired`, and `blockedActions`.

Precedence:

1. `blockedActions` always wins.
2. More-specific `allowedActions` beats less-specific `approvalRequired`.
3. More-specific `approvalRequired` beats less-specific `allowedActions`.
4. Same-specificity allow/approval conflict resolves to `needs_approval`.
5. `defaultAction` applies when no explicit policy rule matches.
