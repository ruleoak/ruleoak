# AI Coding Agent Governance

Run:

```bash
npm run coding:agent-governance
```

This reference vertical shows how RuleOak can sit in front of coding-agent actions without replacing the coding assistant. It allows declared repository reads and tests, requires approval for source edits and protected git actions, and blocks destructive shell or secret-exfiltration attempts by default.

Outputs are written to `out/`: governance records, evidence bundle, audit log, approval request, JSON report, and HTML report.
