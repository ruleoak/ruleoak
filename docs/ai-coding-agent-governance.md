# AI Coding Agent Governance

This RuleOak Core v2.1.0 reference vertical shows RuleOak governing an AI coding agent at the tool-call boundary.

Run:

```bash
npm run coding:agent-governance
```

The workflow demonstrates:

- repository and task evidence reads are allowed;
- source-file writes require approval;
- destructive shell commands and secret exfiltration are blocked;
- an evidence bundle, approval record, audit chain, JSON report, and HTML report are produced;
- replay verification can validate the generated evidence bundle and audit log.

This vertical is designed for developers building CLI coding agents, IDE assistants, code-modifying workflows, or governed automation around tools such as file edit, shell, git, and test execution.

Boundary statement: RuleOak governs decisions and evidence before tool execution. It is not an OS sandbox, repository permission system, or replacement for branch protection.
