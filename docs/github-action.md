# GitHub Actions adoption and RuleOak Dev check

The repository exposes a composite action that runs RuleOak locally against the checked-out workspace.

## Onboarding

```yaml
steps:
  - uses: actions/checkout@v6
  - uses: ruleoak/ruleoak@v0.50.0
    with:
      mode: onboarding
```

The default `onboarding` mode is non-mutating and checks file/path presence only. It does not upload repository source, prompts, RuleOak evidence or MCP credential values.

Use `mode: doctor` only after the repository intentionally contains a `.ruleoak` workspace and policy.

## Verify an externally produced candidate

When CI has a complete candidate directory or ZIP available in the workspace:

```yaml
steps:
  - uses: actions/checkout@v6
  - uses: ruleoak/ruleoak@v0.50.0
    with:
      mode: dev
      candidate: candidate-source.zip
      intent: Fix station switching without regressing Android Auto
      report: ruleoak-dev-report.json
```

`mode: dev` is the simplified Multi-Frontend Development external/chat path. RuleOak makes zero planner/implementer model calls, applies the local Intent-Driven Change/Intent Evidence Authority/Development Learning authority path, and disables build handoff in the shared CI action. The resulting JSON is a local candidate-verification report; it is not a claim of native/device qualification unless that evidence was independently available to the project.

The action installs the RuleOak source carried by the selected Git tag and executes the CLI locally inside the GitHub runner. It does not require a RuleOak cloud service.
