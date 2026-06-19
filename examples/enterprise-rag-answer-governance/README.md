# Enterprise RAG Answer Governance

Run:

```bash
npm run rag:answer-governance
```

This reference vertical shows how RuleOak governs an enterprise RAG answer path. Knowledge-base search is allowed, restricted-document use requires approval, and unsupported answers are blocked. The generated report records citation coverage, redaction checks, approvals, and replayable evidence.

Outputs are written to `out/`: governance records, evidence bundle, audit log, approval request, JSON report, and HTML report.
