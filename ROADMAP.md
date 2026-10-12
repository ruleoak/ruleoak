# RuleOak roadmap

## Current: v0.50.0 public preview

RuleOak is a free/open-source **Effect Boundary** for consequential AI-agent actions and a secondary verification layer for AI-produced source candidates.

```text
authorize exactly → execute once → verify effect → evidence-bound retry decision
```

The current public project includes one-use execution authority, Effect Receipts, reviewed Effect Profiles, MCP stdio/Streamable HTTP paths, response-loss recovery, local evidence/reconciliation, capability inspection/drift, CrashLab, source-candidate review and public qualification/release tooling.

## Roadmap principles

RuleOak does not add surface area merely to increase version numbers. Work is prioritized by evidence of real failure modes, interoperability needs and security/reliability gaps.

The project favors:

- narrow explicit contracts over implied universal compatibility;
- externally observable postconditions over success-message inference;
- reproducible failure fixtures over anecdotal reliability claims;
- stable public schemas over implementation-specific coupling;
- source/release evidence that others can independently verify;
- documented non-goals when the correct boundary belongs elsewhere.

## Near-term priorities

### 1. Effect coverage from real integrations

- add reviewed Effect Profiles requested by actual MCP/agent workflows;
- improve provenance and versioning of effect semantics;
- expand fixtures for ambiguous/partial effects without weakening fail-closed behavior.

### 2. MCP and adapter interoperability

- track current MCP protocol evolution conservatively;
- add compatibility fixtures from independent clients/servers;
- distinguish protocol support from client/server-specific integration evidence.

### 3. Failure and recovery evidence

- broaden CrashLab scenarios for races, delayed effects and long-lived ambiguity;
- improve operator reconciliation and evidence navigation;
- test recovery across process restart and stale configuration changes.

### 4. Independent security and compatibility review

- obtain external security review when the project has enough real integration usage to make it meaningful;
- remediate verified findings publicly where disclosure is safe;
- collect independently reported false-block, false-allow and compatibility cases.

### 5. Release and supply-chain verification

- keep releases reproducible and checksum/SBOM/provenance bound;
- verify hosted repository controls and attestations after public publication;
- keep standards/framework crosswalks narrower than actual evidence.

### 6. Developer ergonomics

- shorten time to first protected action;
- improve diagnostics for `READY_POLICY_ONLY` and `ATTENTION` states;
- make bypass paths and missing effect semantics easier to understand.

## Secondary: Intent-Verified Development

The public `ruleoak dev` stack can review external source candidates against declared intent and baseline-owned qualification without allowing a coding model to certify itself. Near-term work here is driven by real candidate-review exercises, measured false positives/false blocks and interoperability with external development workflows.

It remains secondary to the runtime Effect Boundary.

## 1.0 readiness

RuleOak 1.0 requires evidence, not a calendar date. Readiness includes:

1. stable public authority/effect contracts and a documented compatibility policy;
2. reproducible and externally verifiable releases;
3. mature conformance/compatibility fixtures;
4. independent security review and resolved material findings;
5. documented production operations/recovery boundaries;
6. meaningful external integrations demonstrating repeated use;
7. clear evidence that core retry/effect semantics hold in real failure modes.

No 1.0 date is promised.
