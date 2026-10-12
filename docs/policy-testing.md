# RuleOak policy testing

Use policy tests to check what a policy would do before relying on it.

Single call:

```bash
node packages/cli/bin/ruleoak.js policy test --call examples/calls/delete-protected.json --dir ./demo-workspace
```

Suite:

```bash
node packages/cli/bin/ruleoak.js policy test --suite examples/policy-tests/basic.json --dir ./demo-workspace
```

A suite contains cases with a call file and expected decision.
