# RuleOak Trust Center

RuleOak Core is a local-first governance layer for AI tool calls. This trust center explains what the project claims, what it does not claim, and how developers can evaluate it before using it in serious workflows.

Public release status:

- latest public RuleOak Core release: **v2.1.0**;
- earlier public baseline: **v1.0.1**;
- this archive is prepared as the **RuleOak Core v2.1.0 public developer release**.

## What RuleOak is designed to do

RuleOak is designed to sit at the action boundary of an AI workflow:

```text
AI proposes a tool call
→ RuleOak evaluates a policy pack
→ RuleOak records evidence and the decision
→ RuleOak pauses risky actions for approval
→ RuleOak denies blocked actions
→ RuleOak writes replayable governance artifacts
```

The trust model is intentionally narrow: RuleOak governs tool-call decisions and evidence records. It is not an agent framework, a model provider, an operating-system sandbox, or a certified compliance product.

## Trust assets in this repository

| Asset | Purpose |
|---|---|
| Governance Protocol v1 | Stable record contract for governance artifacts |
| Policy-pack maturity checks | Versioned, testable policy packs |
| Reference verticals | Realistic examples across SRE, coding agents, RAG, and personal local-first workflows |
| Adapter conformance | Shared expectations for MCP, LangGraph, CrewAI, and custom loops |
| Security boundary docs | Clear statement of what RuleOak guards and what remains outside scope |
| AGPL/commercial boundary | Clear open-core licensing posture |
| Public release checklist | Repeatable pre-release validation path |
| Demo playbook | Short demos that produce reviewable artifacts |

## Recommended evaluator path

1. Run `npm install`.
2. Run `npm test`.
3. Run `npm run trust:check`.
4. Run `npm run integrate:10min`.
5. Run one reference vertical, such as `npm run coding:agent-governance`.
6. Open the generated HTML report.
7. Run protocol replay verification on the generated evidence bundle.
8. Review the security model and licensing boundary before using RuleOak with sensitive systems.

## Trust language guidance

Use precise claims:

- preferred: “policy-enforced tool-call governance”;
- preferred: “evidence-backed reports”;
- preferred: “local-first governance artifacts”;
- preferred: “audit-friendly records”;
- avoid: “certified compliance”;
- avoid: “enterprise compliance guarantee”;
- avoid: “sandbox guarantee”;
- avoid: “prevents all unsafe AI behavior”.

RuleOak can help create evidence for governance review. It does not replace legal, risk, security, or compliance review.
