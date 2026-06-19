# Enterprise RAG Answer Governance

This RuleOak Core v2.1.0 reference vertical shows RuleOak governing an enterprise RAG answer workflow.

Run:

```bash
npm run rag:answer-governance
```

The workflow demonstrates:

- knowledge-base search over a declared corpus is allowed;
- restricted-document use requires approval;
- unsupported answers are blocked;
- citation coverage and redaction checks are recorded as evidence;
- an evidence bundle, approval record, audit chain, JSON report, and HTML report are produced.

This vertical is designed for developers building internal policy assistants, document Q&A systems, knowledge bots, compliance helpers, and RAG applications where answers must remain evidence-backed.

Boundary statement: RuleOak records and gates evidence use. It does not certify legal, regulatory, or compliance correctness.
