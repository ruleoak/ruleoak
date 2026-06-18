# How RuleOak Fits With LangGraph, CrewAI, OpenClaw, and AgentOps

RuleOak is not a replacement for agent orchestration frameworks, personal AI assistants, or observability platforms.

RuleOak focuses on a narrower governance layer:

```text
policy → evidence → approval → audit → sandbox boundaries
```

Use this page to understand where RuleOak fits.

## Factual positioning

| Tool | Publicly described focus | Where RuleOak differs |
|---|---|---|
| LangGraph | Agent orchestration with capabilities such as durable execution, streaming, and human-in-the-loop workflows. | RuleOak does not try to be the graph engine. It provides governance records and boundaries around actions: policy, evidence, approval, audit, and sandbox foundation. |
| CrewAI | Building collaborative agents, crews, and flows, with concepts such as guardrails, memory, knowledge, and observability. | RuleOak does not try to model agent teams. It focuses on whether a proposed action is allowed, what evidence supports it, whether approval is required, and what audit record remains. |
| OpenClaw | A personal AI assistant that runs on user devices and acts through channels such as chat, email, calendar, and device interfaces. | RuleOak is not a consumer assistant. It is a developer runtime foundation for governed vertical workflows and accountable action boundaries. |
| AgentOps | Agent observability for AI agents and LLM applications, including tracing and debugging agent behavior. | RuleOak is not primarily a monitoring dashboard. It creates governance decisions and records before, during, and after actions. |

## Complementary use

RuleOak can complement these tools:

- A LangGraph workflow can call a RuleOak-style policy/evidence/approval layer before high-risk actions.
- A CrewAI crew can record RuleOak-compatible evidence and audit events when agents recommend or perform actions.
- A personal assistant can use RuleOak-style approval boundaries before external or destructive actions.
- An observability tool can trace execution while RuleOak records governance decisions and approval boundaries.

## What RuleOak cares about

RuleOak asks questions such as:

- Is this action explicitly allowed?
- Is it blocked by policy?
- Does it require approval?
- What evidence supports the recommendation?
- What record remains after the run?
- Did sandbox policy allow the file, network, command, or tool operation?

## What RuleOak does not claim

RuleOak Core v1.3 does not claim to be:

- a full graph orchestration framework;
- a multi-agent team builder;
- a personal assistant;
- a hosted observability platform;
- an externally security-reviewed sandbox;
- a certified compliance product.

## Source links

- LangGraph documentation: https://docs.langchain.com/oss/python/langgraph/overview
- CrewAI documentation: https://docs.crewai.com/
- OpenClaw GitHub: https://github.com/openclaw/openclaw
- OpenClaw website: https://openclaw.ai/
- AgentOps website: https://www.agentops.ai/
