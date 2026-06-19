# RuleOak Policy Pack Maturity

RuleOak Core v2.1.0 turns policy packs from simple configuration lists into versioned governance assets.

Public release wording remains unchanged:

- Latest public RuleOak Core release: **v2.1.0**
- Earlier public baseline: **v1.0.1**
- Policy-pack maturity: **included in RuleOak Core v2.1.0**

## What a mature policy pack contains

Each pack now uses `ruleoak.policy_pack.v1` and includes:

- `schemaVersion`
- semantic pack `version`
- compatibility metadata for `ruleoak.governance.v1`
- latest public Core release marker `v2.1.0`
- allow / approval-required / blocked tool decisions
- pack-local `scenarioTests`
- metadata for maturity, status, owner, and examples

The pack manifest is intentionally separate from prompts. Prompts can ask an agent to do work, but the policy pack decides whether the resulting tool call is allowed, approval-gated, or blocked.

## Commands

```bash
npm run policy:pack:validate
npm run policy:pack:scenarios
npm run policy:pack:compatibility
npm run policy:explain
npm run policy:diff
```

## Scenario tests per pack

Every current pack now includes at least one local scenario test. These scenario tests evaluate expected policy behavior without executing tools.

Example behavior:

```text
read repo file          -> allowed
write source file       -> approval_required
destructive shell       -> blocked
```

This makes a pack safer to change because a developer can see whether a modification accidentally makes an agent more permissive.

## Explain output

`policy:explain` now includes provenance. It shows:

- final decision per tool;
- which pack contributed the effect;
- whether multiple packs conflict;
- the precedence rule: `blocked > approval_required > allowed`.

## Compatibility matrix

`policy:pack:compatibility` generates a matrix covering:

- pack id and version;
- manifest schema;
- governance protocol;
- latest public Core release;
- scenario test count;
- status.

## Boundary

Policy Pack Maturity improves governance asset quality. It does not certify regulatory compliance, replace secure runtime sandboxing, or guarantee that an application integrated the policy correctly.
