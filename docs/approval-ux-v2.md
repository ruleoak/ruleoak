# Approval UX v2

RuleOak Approval UX v2 is a RuleOak Core v2.1.0 reference for reviewing approval-required AI tool calls before they become actions.

It is intentionally local-first: it reads RuleOak reports and approval state from local files, writes reviewer decisions locally, and does not execute approved actions. It is not a replacement for enterprise IAM, RBAC, SSO, or workflow platforms.

## What it adds beyond the basic approval inbox

- reviewer identity and reviewer role
- approval comments and review notes
- approve, reject, and request-more-evidence decisions
- risk, priority, and SLA due time fields
- requested-evidence tracking
- approval history per request
- exportable approval decision log
- exportable approval packet with integrity hashes
- local HTML review inbox

## Run the reference

```bash
npm run approval:ux:v2
```

Outputs are written to:

```text
examples/approval-ux-v2/out/
├── approvals.json
├── index.html
├── approval-decisions.jsonl
├── approval-rag-sensitive-document.packet.json
└── summary.json
```

## Build the inbox from generated reports

```bash
npm run approval:inbox:build
npm run approval:inbox
```

Then open the local URL printed by the command.

## CLI review actions

```bash
npm run approval:approve -- <approval-id>
npm run approval:reject -- <approval-id>
npm run approval:request-evidence -- <approval-id> "business justification" "test output"
npm run approval:packet -- <approval-id>
```

## Approval packet

The approval packet uses:

```text
ruleoak.approval_packet.v1
```

It includes the request, reviewer context, SLA status, requested evidence, decision history, and integrity hashes. The packet is designed for audit handoff and offline review.

## Boundary statement

Approval UX v2 records decisions. It does not perform the underlying tool action. Applications must explicitly re-check policy and approval state before executing the action.

