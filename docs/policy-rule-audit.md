# RuleOak policy rule audit

RuleOak keeps persistent approval intent reviewable. When a user applies an `always_allow` or `always_block` policy suggestion, RuleOak writes an exact-action rule to `.ruleoak/policy.json` instead of broadening general allow/block lists.

This slice adds an audit and rollback layer for those exact-action rules.

## List exact-action rules

```bash
node packages/cli/bin/ruleoak.js policy rules --dir .
```

The output shows:

- rule ID
- enabled or disabled status
- allow or block effect
- exact tool and target
- decision fingerprint
- source policy suggestion
- source approval record
- number of local history records

## Disable a rule without deleting history

Preview first:

```bash
node packages/cli/bin/ruleoak.js policy disable-rule --id <rule-id> --dir .
```

Apply after review:

```bash
node packages/cli/bin/ruleoak.js policy disable-rule --id <rule-id> --yes --dir .
```

Disabling a rule marks it as disabled inside `.ruleoak/policy.json` and writes a history record under:

```text
.ruleoak/policy-rule-history/
```

The policy engine ignores disabled rules, but the rule remains visible for traceability.

## Re-enable a disabled rule

Preview first:

```bash
node packages/cli/bin/ruleoak.js policy enable-rule --id <rule-id> --dir .
```

Apply after review:

```bash
node packages/cli/bin/ruleoak.js policy enable-rule --id <rule-id> --yes --dir .
```

## Why disable instead of delete

Deleting a rule hides why it existed. RuleOak preserves the rule and writes a local history event so a user can later answer:

- Which approval created this rule?
- Which suggestion created this rule?
- When was it disabled or enabled?
- Which exact action fingerprint did it cover?

## Security note

Policy rule audit is local evidence, not tamper-proof storage. A local user or malicious process with filesystem write access can still edit `.ruleoak/policy.json` or `.ruleoak/policy-rule-history/`. Future versions can add signed policy-change logs or OS-level hardening.
