# Demo Playbook

This playbook gives a short, repeatable path for showing RuleOak without overclaiming enterprise certification.

## Demo 1: 10-minute tool-call governance

```bash
npm install
npm run integrate:10min
npm run approval:inbox:build
npm run report:html
```

Message:

> RuleOak can sit in front of tool calls and turn model intent into an explicit allow, approval-required, or deny decision with evidence and a report.

## Demo 2: AI coding agent governance

```bash
npm run coding:agent-governance
```

Show:

- read/search action allowed;
- risky write action requiring approval;
- destructive or secret-exposing action denied;
- generated report and evidence bundle.

Message:

> Coding agents are useful because they can act. RuleOak gives developers a policy and audit boundary before those actions run.

## Demo 3: Enterprise RAG answer governance

```bash
npm run rag:answer-governance
```

Show:

- evidence-backed answer behavior;
- sensitive document policy;
- unsupported answer risk;
- report output.

Message:

> RuleOak is not only for operations. It also helps govern evidence-sensitive answer workflows.

## Demo 4: Personal local-first assistant governance

```bash
npm run personal:local-assistant-governance
```

Show:

- local-first decision artifacts;
- file/email/calendar-style action gating;
- approval UX fit for personal or desktop apps.

Message:

> The same governance protocol works for local-first personal apps and enterprise workflows.

## Demo discipline

Do not say:

- “RuleOak is compliance-certified.”
- “RuleOak prevents all dangerous AI behavior.”
- “RuleOak is a complete security sandbox.”

Do say:

- “RuleOak creates governance records at the tool-call boundary.”
- “RuleOak separates policy from prompts.”
- “RuleOak helps generate evidence-backed review artifacts.”
