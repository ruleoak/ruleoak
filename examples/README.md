# Examples

Start with:

```bash
npm run example:consultant
```

Then create your own copy:

```bash
npm run create:app -- my-consultant-app
```

## Included examples

| Example | Purpose |
|---|---|
| `technical-consultant-demo` | Copyable generic consultant workflow with policy, evidence, approval, and audit output |
| `basic-domain-pack` | Minimal domain pack structure |

Examples use synthetic data only.


## Research Brief Demo

```bash
npm run example:research
```

Shows a non-IT workflow: sourced claims, confidence, known unknowns, recommendation, approval boundary, and audit-style research output.

## Python bridge example

`python-bridge/` shows how a Python application can use the private-preview companion `ruleoak-py` SDK to emit RuleOak Core v1.0-compatible governance records. The example is generic and local-first.
