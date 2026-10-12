# Public repository scope

`ruleoak/ruleoak` is the canonical public Apache-2.0 implementation and conformance repository for the RuleOak **Effect Boundary**. RuleOak v0.50.0 is the starting public release.

The first public job is narrow: bind exact authority to one consequential execution attempt, observe the external effect where trusted semantics exist, preserve uncertainty where they do not, and derive a safe retry disposition without blindly repeating the action.

Public material includes:

- ExecutionLease, EffectReceipt, policy/approval and evidence contracts;
- SDK, managed MCP stdio and Streamable HTTP Effect Boundary implementations;
- supported provenance-bound Effect Profiles and contribution guidance;
- effect reconciliation, local value evidence and capability-drift safety;
- Inspector, Flight Control, Flight Recorder and CrashLab;
- adapter/extension SPI, conformance vectors, threat/security boundaries and release QA;
- intent/candidate-review tooling for AI-produced changes;
- standards crosswalks, deterministic SBOM generation and attestation-ready release workflows.

Material that must remain outside the public repository includes:

- publication credentials and signing secrets;
- private customer or support data;
- credentials, API keys, private source or confidential evidence;
- local owner-only operational records not intended as project source.

Security corrections and core verification semantics belong in the open project.
