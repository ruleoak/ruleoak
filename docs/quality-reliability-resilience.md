# Quality, reliability and resilience

This hardening pass is additive to RuleOak 0.50.0. It does not promote RuleOak to 1.0 and does not widen policy, delegation, approval, revocation, lease, receipt or evidence authority.

## Failure boundaries hardened

- one-use ApprovalResult, ExecutionLease and DecisionReceipt replay markers are durably created before success is returned;
- revocation and delegation-budget registries use bounded, locked, atomic durable replacement rather than vulnerable append-only writes;
- file locks carry host/PID/ownership tokens and do not evict a still-live local owner merely because a timestamp is old;
- capability history uses bounded atomic replacement and rejects corrupt chains;
- evidence logs enforce byte, line and event ceilings;
- integer authority budgets and usage reject values outside JavaScript's safe-integer precision range;
- ApprovalProvider callbacks have bounded deadlines;
- MCP Registry and remote Inspector inputs have deadlines, Content-Type validation and bounded response materialization;
- MCP stdio inspection drains bounded stdout/stderr and handles timeout/early process exit;
- the MCP HTTP gateway bounds request batches and mixed-batch upstream JSON, awaits streaming pipelines and gives the upstream request a total deadline without retrying side-effecting POSTs;
- local encrypted secret fallback and Flight Control authority artifacts use atomic durable writes; corrupt optional Flight state is surfaced as a warning while authority-parent reads remain fail-closed.

## Evidence semantics

A successful HTTP response remains only a remote-response observation. This hardening does not convert transport success into proof of a remote business effect. EffectReceipt observation quality remains authoritative.

## Automatic QA

`npm run qa:auto` invokes `scripts/quality_reliability_resilience_qa.mjs`, and recursive package-test discovery includes the new core and CLI adversarial regression suites.

## Residual risks

Operating-system termination during non-atomic external effects, hardware/storage faults, kernel/filesystem defects, remote-service ambiguity and other failures outside RuleOak's process boundary remain possible. RuleOak contains or reports application-controlled recoverable failures; it does not claim literal crash impossibility.


## Local file and callback bounds

The hardened CLI bounds user-controlled policy/call/manifest/Registry/CrashLab/learning inputs before JSON materialization, bounds recursive CrashLab and bundle discovery by count/depth, caps evidence and bundle bytes, and uses atomic private-file replacement for important CLI state and generated audit artifacts. Injected authorization/MCP callbacks are deadline-bounded; a streaming HTTP failure after headers are committed destroys the response instead of attempting a second response.

These controls are containment boundaries, not claims that hostile operating systems, disk devices, runtimes, or third-party code cannot fail.
