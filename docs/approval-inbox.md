# RuleOak Local Approval Inbox

RuleOak Core v2.1.0 includes a local approval inbox for reviewing actions that were paused by policy.

The inbox collects approval requests from existing RuleOak reports and builds a local HTML viewer plus a JSON state file.

## Commands

```bash
npm run approval:inbox:build
npm run approval:inbox
npm run approval:approve -- <approval-id>
npm run approval:reject -- <approval-id>
```

The local server listens on `127.0.0.1:8788` and does not call external services.

## What it shows

- pending approvals
- approved approvals
- rejected approvals
- action name
- subject or target
- risk level
- policy reason
- evidence ID where available

## Boundary

The v2.1.0 inbox is local-first and file-backed. It is an approval UX foundation, not an enterprise workflow engine, identity system, or compliance-certified approval platform.
