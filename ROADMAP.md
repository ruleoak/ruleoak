# RuleOak roadmap

## Current: v0.50.0 public preview

RuleOak is a free/open-source **Effect Boundary** for consequential AI-agent actions and a verification layer for AI-produced code.

```text
authorize exactly → execute once → verify effect → evidence-bound retry decision
```

The supported implementation includes one-use execution authority, Effect Receipts, provenance-bound effect semantics, MCP stdio/Streamable HTTP paths, crash/response-loss recovery, local evidence/reconciliation, capability drift, developer candidate review, and public conformance/stability metadata.

## Near-term work is evidence-driven

Do not add broad product surface merely to increase version numbers. Priorities are:

1. independent installs and time-to-first-protected-action evidence;
2. Effect Profiles requested by real MCP/agent workflows;
3. external security review and remediation;
4. protocol/adapter conformance against current MCP evolution;
5. real candidate-review exercise and independently reported false-positive/false-block cases;
6. compatibility fixtures and regression cases contributed from real use.

## 1.0 readiness

1.0 requires stable public contracts, reproducible/attested releases, mature conformance, independent security review, documented production operations, and meaningful external adoption. No date is promised.

## Intent-Verified Development

The public `ruleoak dev` front door supports external/chat coding without requiring a second RuleOak coding-model call. Candidate acceptance review, privacy-safe activation snapshots, reusable review boundaries, and durable receipt comparison are implemented locally. External repeat-use evidence remains unproven until independent users provide it.
