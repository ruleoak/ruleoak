# Cursor + RuleOak Dev

Export or package the complete candidate source from the Cursor-managed workspace, then run:

```bash
ruleoak dev ./candidate-source.zip --intent "Implement the requested behavior"
```

For pull requests, combine this with the repository composite action in `mode: dev` so the same candidate-verification path runs in CI.
