# Enterprise Evidence Connectors Reference

This reference example shows how RuleOak can collect read-only evidence from enterprise-style systems without writing back to them.

```bash
npm run enterprise:connectors
```

The example uses local fixtures for ServiceNow, Confluence, GitLab, Splunk, Prometheus, Kubernetes/OpenShift, CI/CD and collaboration systems. It is intentionally offline and credential-free.

The goal is not to certify a vendor integration. The goal is to define the connector boundary:

- read-only evidence collection
- summarized outputs instead of raw logs/chat transcripts
- no credentials in reports
- no write methods in evidence connectors
- replayable JSON report for audit-oriented workflows
