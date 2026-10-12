# RuleOak policy packs

Policy packs are local starter policies. They help developers try RuleOak without writing a policy from scratch.

```bash
node packages/cli/bin/ruleoak.js policy packs
node packages/cli/bin/ruleoak.js policy show --pack cautious
node packages/cli/bin/ruleoak.js init --policy-pack cautious
```

Included packs:

- `readonly`
- `cautious`
- `developer-local`
- `mcp-server-safe`
- `family-safe`

Policy packs are copied into `.ruleoak/policy.json` at initialization time. They are not fetched from a network service.
