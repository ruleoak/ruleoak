
# Approval Inbox UX

RuleOak Core v2.1.0 documents the local Approval Inbox so reviewers can understand pending agent actions before approving or rejecting them.

## What the inbox shows

Each approval request includes:

- action
- subject
- status
- risk level
- policy reason
- evidence ID
- source report
- creation time
- decision history
- reviewer decision note

## Commands

```bash
npm run approval:inbox:build
npm run approval:inbox
npm run approval:approve -- <approval-id>
npm run approval:reject -- <approval-id>
npm run approval:inbox:export
```

## Outputs

```text
reports/approval-inbox/index.html
reports/approval-inbox/approvals.json
reports/approval-inbox/approval-decisions.jsonl
```

## Boundary

The Approval Inbox is local-first. It reads local report files and writes local approval records. It does not execute approved actions, call external services, or provide a hosted approval workflow.
