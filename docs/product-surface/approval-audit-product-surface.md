# Approval and Audit Product Surface

RuleOak Core v2.1.0 includes a local-first approval and audit product surface for developers and external evaluators who want to inspect governed AI workflows without reading every JSON artifact by hand.

It combines:

- approval inbox state;
- reviewer identity, comments, SLA, requested evidence, and approval packets;
- Audit Report Viewer v2 reports;
- evidence-bundle and audit-chain verification state;
- audit packet export;
- a local static dashboard and optional local HTTP server.

## Run it

```bash
npm run product:surface:demo
npm run product:surface:build
npm run product:surface:serve
```

Open the printed local URL or open:

```text
reports/approval-audit-surface/index.html
```

## Export packet

```bash
npm run product:surface:packet
```

This creates:

```text
reports/approval-audit-surface/approval-audit-packet.zip
```

The packet contains the local dashboard, approval state, approval inbox HTML, and audit catalog.

## What this is

This is a local developer/admin product surface for RuleOak Core v2.1.0. It helps users understand how approval-required AI actions, audit reports, evidence bundles, and exported packets fit together.

## What this is not

This is not a hosted SaaS service. It does not add SSO, RBAC, enterprise retention, multi-user locking, or production identity management by itself. Those capabilities belong in a future commercial or enterprise layer.

## Validation

```bash
npm run product:surface:check
npm run test:approval-audit-product-surface
```
