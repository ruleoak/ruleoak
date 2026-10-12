# Policy migration

RuleOak includes deterministic migration from the legacy list-based policy format to Policy v2 structured rules.

Legacy fields:

- `blockedActions`
- `approvalRequired`
- `allowedActions`

Migration creates ordered rules with conservative priorities:

| Legacy source | Policy v2 effect | Priority |
|---|---|---:|
| `blockedActions` | `deny` | 300 |
| `approvalRequired` | `needs_approval` | 200 |
| `allowedActions` | `allow` | 100 |

The legacy default action is preserved. Wildcard and default-allow policies produce warnings for manual review

## Preview

```bash
ruleoak policy migrate --policy ./legacy-policy.json
```

Preview mode never changes files

## Write to a new file

```bash
ruleoak policy migrate \
  --policy ./legacy-policy.json \
  --out ./policy-v2.json
```

## In-place migration

```bash
ruleoak policy migrate \
  --policy ./legacy-policy.json \
  --write --yes
```

In-place migration creates a timestamped backup before replacing the source file

## Programmatic API

```js
import { migratePolicyToV2 } from '@ruleoak/core'

const result = migratePolicyToV2(legacyPolicy)
console.log(result.policy)
console.log(result.warnings)
```

Migration preserves `exactActionRules` and adds non-enforcing migration metadata. Review and test the migrated policy before placing it on a real execution boundary
