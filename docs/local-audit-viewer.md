# RuleOak Local Audit Viewer

RuleOak can generate a self-contained local HTML audit viewer from `.ruleoak/evidence.jsonl` plus local approval/session files.

```bash
node packages/cli/bin/ruleoak.js replay \
  --html .ruleoak/report.html \
  --dir .ruleoak-demo-output/permission-manager
```

Open the generated HTML file in a browser. The report does not need a local server, CDN, external fonts, or network access.

## What the viewer shows

- hash-chain verification status
- allow / deny / approval-required counts
- pending approval records from `.ruleoak/pending/`
- decided approval records from `.ruleoak/approvals/`
- session cache entries from `.ruleoak/sessions/`
- reviewable policy suggestions from `.ruleoak/policy-suggestions/`
- per-event risk, target, call ID, session, source, approval ID, matched rule, and reason
- approval lifecycle for events that produced or consumed an approval ID
- redacted arguments only
- client-side filters for decision, risk, and text search

## Why this matters

RuleOak should not only block or allow actions. It should leave evidence that a developer can review after an agent run. The local viewer turns raw JSONL into a quick incident timeline without introducing a hosted dashboard or cloud dependency.

## Security notes

The report is generated locally and escapes evidence-derived fields before interpolation. It is designed for offline review of RuleOak-controlled flows.

The viewer is not a tamper-proof evidence store. A local user or malicious local process with file access can still modify `.ruleoak/` files. Use the hash-chain verification result to detect accidental or obvious event-chain corruption, not as a substitute for OS-level or enterprise-grade log protection.

## Policy rule audit

The local HTML viewer also shows applied exact-action policy rules and local policy-rule history records from `.ruleoak/policy-rule-history/`. Disabled rules remain visible for traceability even though the policy engine ignores them.
