# Connector Reliability Pack

This RuleOak Core v2.1.0 release includes the read-only connector layer used by GitHub and Jira evidence collection.

The goal is not to make connectors powerful. The goal is to make evidence collection safer, more predictable, and easier to audit.

## What this layer adds

- Read-only method enforcement
- Pagination controls
- Timeout controls
- Retry controls for transient failures
- Rate-limit diagnostics
- Token and credential redaction
- Connector diagnostic evidence records
- Fixture/live parity tests
- Local HTML report support

## Commands

```bash
npm run connector:reliability
npm run test:connector-reliability
npm run github:demo
npm run jira:demo
npm run report:html
```

## Safety boundary

RuleOak evidence connectors remain conservative:

- GitHub connector uses GET-only requests
- Jira connector uses GET-only requests
- No comments are created
- No issues are closed
- No labels are changed
- No transitions are executed
- No credentials are written to reports

## Why this matters

A governance layer is only useful if evidence is trustworthy. RuleOak makes connector evidence more reliable by recording how data was collected and by proving that credentials and write actions stay outside the evidence path.
