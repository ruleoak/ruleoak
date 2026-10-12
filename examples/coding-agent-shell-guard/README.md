# Coding-agent shell guard

This example protects simulated coding-agent commands without executing real shell operations.

```bash
npm run demo:coding-agent
```

It demonstrates:

- a known safe workspace-list action
- package installation requiring session approval
- reuse of the demo provider's session grant
- destructive deletion denied before its mock executor runs
- automatic one-time receipt consumption
- a local evidence report under `.ruleoak-demo-output/coding-agent-shell-guard/.ruleoak/report.html`

Architecture: [`architecture.mmd`](architecture.mmd). Policy: [`policy.json`](policy.json). Expected summary: [`expected-output.txt`](expected-output.txt).

Test and cleanup:

```bash
node examples/coding-agent-shell-guard/test.mjs
node examples/coding-agent-shell-guard/cleanup.mjs
```

All commands and side effects are mocked. The demo does not install packages or delete files.
