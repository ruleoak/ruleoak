# RuleOak Local HTML Audit Viewer

`ruleoak replay --html <output.html>` generates a single-file local HTML audit viewer from `.ruleoak/evidence.jsonl`.

The report is self-contained: CSS and JavaScript are embedded in the file and no CDN, external font, external image, or network resource is required.

## Example

```bash
node packages/cli/bin/ruleoak.js replay \
  --html .ruleoak/report.html \
  --dir .ruleoak-demo-output/permission-manager
```

Open the generated file in a browser to review the RuleOak audit timeline.

## Viewer features

The report shows:

- hash-chain verification status
- total events
- allowed, denied, and approval-required counts
- pending approvals
- decided approvals
- session-cache entries
- action timeline
- risk level, target, call ID, session, source, and approval ID
- approval lifecycle status
- matched rules
- decision reasons
- redacted arguments
- event hashes
- client-side filters for decision, risk, and search text

## Safety guarantees

The generated HTML report is designed to be safe to archive and safe to open offline:

- no Tailwind CDN
- no remote scripts
- no external fonts
- no external images
- all evidence-derived fields are HTML-escaped before interpolation

This matters because tool arguments and retrieved context can be adversarial. A string such as `&lt;script&gt;alert(1)&lt;/script&gt;` must appear as text in the report, not execute as code.
