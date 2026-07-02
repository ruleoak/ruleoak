# RuleOak HTML Timeline Report

`ruleoak replay --html <output.html>` generates a single-file local HTML timeline from `.ruleoak/evidence.jsonl`.

The report is self-contained: CSS is embedded in the file and no CDN or network resource is required. It shows:

- hash-chain verification status
- total actions
- allow / deny / needs approval / dry-run counts
- action timeline
- matched rules
- decision reasons
- event hashes

Example:

```bash
npx ruleoak replay --html .ruleoak/report.html
```

Open the generated file in a browser to review the Flight Recorder timeline.


## Safety guarantees

The generated HTML report is designed to be safe to archive and safe to open offline:

- no Tailwind CDN
- no remote scripts
- no external fonts
- no external images
- all evidence-derived fields are HTML-escaped before interpolation

This matters because tool arguments and retrieved context can be adversarial. A string such as `&lt;script&gt;alert(1)&lt;/script&gt;` must appear as text in the report, not execute as code.
