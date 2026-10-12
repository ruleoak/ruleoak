# Codex + RuleOak Dev

RuleOak Dev accepts a Codex-produced candidate exactly like any other external implementation:

```bash
ruleoak dev ./candidate-source.zip --intent "Repair the failing Android build without changing product behavior"
```

For cost-aware development, a useful split is:

- Chat/primary development surface: feature implementation and product-level changes.
- Codex: narrowly bounded repair worker when an observed build/lint/test/native failure exists.
- RuleOak: independent scope/evidence/semantic authority around both candidate and repair.

Do not treat a Codex statement that a build passed as build evidence. Evidence must come from the configured build/qualification boundary.
