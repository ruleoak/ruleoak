# Evidence Connectors Demo

RuleOak Core v1.3 adds read-only evidence connector patterns.

```bash
npm run connector:demo
```

The demo loads local GitHub and Jira fixtures plus a local notes file. It does not call the network, use credentials, or write back to external systems.

The goal is to prove the connector boundary:

- collect evidence
- classify it as read-only
- include it in a RuleOak report
- preserve auditability
- avoid write actions until approval-gated connectors exist
