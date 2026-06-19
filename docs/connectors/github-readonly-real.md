# RuleOak GitHub Read-only Evidence Connector

RuleOak Core v2.1.0 includes a real read-only GitHub evidence connector.

It can collect repository, issue, and pull request metadata through GitHub GET requests and convert that information into RuleOak evidence records.

## Commands

Mocked local demo, no token and no network required:

```bash
npm run github:demo
```

Real GitHub read-only mode:

```bash
RULEOAK_GITHUB_REPO=owner/repo GITHUB_TOKEN=... npm run github:demo:real
```

## Safety boundary

The connector only performs read-only HTTP GET requests. It does not create comments, close issues, merge pull requests, transition tickets, or write to any external system.

For write operations, RuleOak continues to use local approval-gated write intents and dry-run outbox records.
