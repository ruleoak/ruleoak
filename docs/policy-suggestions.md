# SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
# SPDX-License-Identifier: Apache-2.0

# RuleOak Policy Suggestions

RuleOak supports persistent approval intent without silently editing policy files.

When a pending approval is decided with `always_allow` or `always_block`, RuleOak decides the current pending action and writes a reviewable suggestion file under `.ruleoak/policy-suggestions/`.

```bash
node packages/cli/bin/ruleoak.js approve --pending --id <approval-id> --decision always_allow --dir .
node packages/cli/bin/ruleoak.js approve --pending --id <approval-id> --decision always_block --dir .
node packages/cli/bin/ruleoak.js policy suggestions --dir .
node packages/cli/bin/ruleoak.js policy apply-suggestion --id <suggestion-id> --dir .
node packages/cli/bin/ruleoak.js policy apply-suggestion --id <suggestion-id> --yes --dir .
```

## Safety model

Policy suggestions are not active policy rules when they are created.

They are local JSON files that record user intent and an exact-action match fingerprint. A developer can preview the policy delta and then explicitly apply it with `--yes`. RuleOak never applies a suggestion during the approval decision itself.

This avoids a dangerous pattern where an approval prompt silently expands future permissions.

## Suggestion file shape

A suggestion contains:

- `suggestion_id`
- `source_approval_id`
- `requested_decision`
- `exact_match`
- `suggested_policy_delta`
- `safety_mode: not_applied`
- manual application notes

## Apply flow

Preview first:

```bash
node packages/cli/bin/ruleoak.js policy apply-suggestion --id <suggestion-id> --dir .
```

Apply after review:

```bash
node packages/cli/bin/ruleoak.js policy apply-suggestion --id <suggestion-id> --yes --dir .
```

The applied rule is written to `.ruleoak/policy.json` under `exactActionRules`. It is keyed by the same exact-action fingerprint used by the approval record, so it does not broaden `allowedActions` or `blockedActions`.

After application, the suggestion file is marked `status: applied` and `safety_mode: applied`.

## Roll back an applied exact-action rule

Applied suggestions become exact-action rules in `.ruleoak/policy.json`. To list and disable one without deleting history:

```bash
node packages/cli/bin/ruleoak.js policy rules --dir .
node packages/cli/bin/ruleoak.js policy disable-rule --id <rule-id> --yes --dir .
```

Disabled rules are ignored by the policy engine but preserved in policy and recorded under `.ruleoak/policy-rule-history/`.
