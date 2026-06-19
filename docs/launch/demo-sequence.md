# Public Demo Sequence

Keep the launch demo short and concrete. Do not begin with the full architecture.

## Demo 1 — AI coding agent governance

```bash
npm run coding:agent-governance
```

Show:

- read/search action is allowed;
- code/file write is governed;
- destructive workspace deletion is blocked;
- report artifacts are generated.

Message:

> RuleOak governs the actions an AI coding agent wants to take before those actions execute.

## Demo 2 — Enterprise RAG answer governance

```bash
npm run rag:answer-governance
```

Show:

- answer requires evidence;
- sensitive source access is governed;
- unsupported claims are flagged or blocked;
- evidence-backed report is generated.

Message:

> RuleOak separates evidence and policy from the prompt.

## Demo 3 — Local approval and audit report

```bash
npm run approval:ux:v2:check
npm run audit:viewer:v2:check
```

Show:

- approval-required action has reviewer context;
- approval packet can be exported;
- audit viewer verifies evidence and audit-chain integrity.

Message:

> RuleOak turns tool-call decisions into reviewable evidence.
