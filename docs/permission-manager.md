# RuleOak Permission Manager

RuleOak includes a local workstation-grade permission manager on top of its authorization and evidence boundaries.

## What is implemented

- Normalized tool-call validation in `@ruleoak/protocol`
- Deterministic risk classification in `@ruleoak/core`
- Secret-like value detection and redaction before evidence logging
- Prompt-injection-like instruction detection
- `evaluatePermissionRequest()` as the high-level permission gateway API
- `ruleoak check --call <file>` for single-call evaluation
- File-queue approvals under `.ruleoak/pending/`
- `ruleoak approve --pending` for pending approval review
- `allow_once`, `deny_once`, `allow_session`, `always_allow`, and `always_block` decisions
- Session approval cache under `.ruleoak/sessions/`
- Reviewable policy suggestions under `.ruleoak/policy-suggestions/`
- Explicit `ruleoak policy apply-suggestion --id <id> --yes` apply flow
- Exact-action rules under `.ruleoak/policy.json`
- `ruleoak demo permission-manager` for seven local scenarios

## Public-package boundary

This is still a small public package surface:

- `@ruleoak/protocol`
- `@ruleoak/core`
- `@ruleoak/cli`

MCP-specific packages, desktop apps, and mobile approval flows remain future work. The local HTML audit viewer is included in `@ruleoak/cli` as `ruleoak replay --html`; it is not a separate public package in this release.

## Demo

```bash
npm install --ignore-scripts
npm run demo:permission-manager
```

The demo covers public read, private read, protected delete, email send, shell command, secret exfiltration, and prompt-injection-like text.

## Single-call check

```bash
node packages/cli/bin/ruleoak.js check --call examples/calls/read-private-note.json
```

The command prints the action, risk, decision, explanation, evidence path, and pending approval ID when approval is required.

## Approval queue

When a call needs approval, RuleOak writes a local JSON approval record under `.ruleoak/pending/`. The pending record stores metadata, redacted action arguments, risk, decision reason, and an exact-action approval fingerprint.

List pending approvals:

```bash
node packages/cli/bin/ruleoak.js approve --pending --dir .
```

Decide a pending approval:

```bash
node packages/cli/bin/ruleoak.js approve --pending --id <approval-id> --decision allow_once --dir .
node packages/cli/bin/ruleoak.js approve --pending --id <approval-id> --decision deny_once --dir .
node packages/cli/bin/ruleoak.js approve --pending --id <approval-id> --decision allow_session --dir .
```

`allow_once` records a final allowed evidence event for the pending call. `deny_once` records a final denied evidence event. `allow_session` records the approval and stores an exact-action session cache entry so repeated equivalent checks in the same session are allowed without creating another pending record.

Persistent choices are intentionally conservative:

```bash
node packages/cli/bin/ruleoak.js approve --pending --id <approval-id> --decision always_allow --dir .
node packages/cli/bin/ruleoak.js approve --pending --id <approval-id> --decision always_block --dir .
node packages/cli/bin/ruleoak.js policy suggestions --dir .
node packages/cli/bin/ruleoak.js policy apply-suggestion --id <suggestion-id> --dir .
node packages/cli/bin/ruleoak.js policy apply-suggestion --id <suggestion-id> --yes --dir .
```

`always_allow` and `always_block` decide the current pending action and write a reviewable JSON suggestion under `.ruleoak/policy-suggestions/`. RuleOak does not silently edit `.ruleoak/policy.json`; a human must preview the suggested exact-action rule and apply it explicitly with `--yes`.

Applied suggestions are stored under `exactActionRules` and matched by the same exact-action fingerprint used by the approval record. This avoids silently broadening `allowedActions` or `blockedActions`.

## Local audit viewer

Generate a local HTML audit viewer after running checks or demos:

```bash
node packages/cli/bin/ruleoak.js replay \
  --html .ruleoak/report.html \
  --dir .ruleoak-demo-output/permission-manager
```

The viewer shows the evidence timeline, hash-chain status, pending approvals, decided approvals, session-cache entries, and per-event decision details. It is a single offline HTML file with embedded CSS and JavaScript.

## Security boundary

This feature evaluates proposed actions routed through RuleOak. It is not a sandbox, kernel hook, endpoint security agent, or tamper-proof logging system. Tools that do not route through RuleOak are outside this control boundary.
