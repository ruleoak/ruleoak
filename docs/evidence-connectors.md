# Read-only Evidence Connectors

RuleOak Core v1.3 introduces read-only evidence connector patterns.

The purpose is to let governed workflows collect context from systems such as source-control, ticketing, and local documentation without giving the agent write access.

## Included in v1.3

- local file evidence connector
- GitHub read-only fixture connector
- Jira read-only fixture connector
- evidence connector runner
- deterministic evidence hash helper
- read-only connector report
- tests and demo

## Boundary

The v1.3 connectors are intentionally conservative.

They do not:

- call external networks
- require credentials
- update GitHub, Jira, or external systems
- create tickets, comments, commits, pull requests, or messages
- replace future production connectors

They do:

- prove the RuleOak connector pattern
- collect evidence records
- mark records as read-only
- generate audit-style reports
- provide a safe foundation for future approval-gated write connectors

## Run the demo

```bash
npm run connector:demo
npm run report:html
```

The demo uses local fixtures under `examples/evidence-connectors-demo/fixtures/`.

## Why read-only first

Read-only evidence connectors are safer than write connectors. They help an agent reason with context while keeping external systems protected. Future write connectors should be approval-gated and should keep clear audit records before any external update occurs.
