# Release Boundaries

RuleOak Core v1.3 is an early runtime foundation for governed AI workflows.

It demonstrates and implements a practical control path:

```text
policy → evidence → approval → audit
```

## Included in v1.3

- runtime lifecycle modules;
- deny-by-default sandbox foundation;
- Tool Guard for governed tool-call decisions;
- MCP Guard prototype for evaluating MCP-style tool requests;
- policy, evidence, approval, and audit primitives;
- Technical Consultant and Research Brief demos;
- local LLM readiness helpers;
- launch UX, templates, HTML reports, and local report viewer;
- tests and CI workflow;
- threat-model and sandbox-boundary documentation.

## Not claimed in v1.3

RuleOak Core v1.3 is not yet:

- a mature enterprise platform;
- an externally security-reviewed sandbox;
- a certified compliance product;
- a hosted cloud service;
- a finished vertical application.

## Correct positioning

Use this wording:

> RuleOak Core v1.3 is an AGPL early runtime with a deny-by-default sandbox foundation for governed AI workflows.

Avoid wording such as:

```text
enterprise-ready
bank-grade
production-safe
compliance-certified
security-reviewed
```

unless those capabilities are later implemented, tested, reviewed, and documented.


## v1.3 Tool Guard boundary

Tool Guard evaluates proposed tool calls and records governance decisions before execution. It is not a tool executor, production proxy, externally security-reviewed sandbox, or compliance certification.
