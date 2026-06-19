# Approval-gated Write Connectors

RuleOak Core v2.1.0 includes a conservative pattern for write connectors.

The goal is not to let an agent freely update external systems. The goal is to create a governed write path:

1. propose a write intent
2. evaluate policy
3. attach evidence
4. request human approval when required
5. deny destructive actions
6. record a local outbox / audit report

The included connectors are demo connectors. They do not call GitHub, Jira, or the network.

## Why this matters

Read-only evidence connectors help agents understand context. Write connectors are riskier because they may change tickets, comments, files, deployments, or communications.

RuleOak treats write actions as approval-gated by default.

## Demo

```bash
npm run write:demo
npm run report:html
```

Generated files:

- `examples/write-connectors-demo/out/write-connectors-report.json`
- `examples/write-connectors-demo/out/write-outbox.json`
- `reports/html/write-connectors-report.html`

## Boundary

The v2.1.0 write-connector pattern are local dry-run connectors. They do not change external systems.

Future production connectors should keep the same governance lifecycle while adding real connector authentication, permission scoping, and explicit human approval UX.
