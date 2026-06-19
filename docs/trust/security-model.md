# Security Model

RuleOak Core protects the **tool-call decision boundary**. It evaluates proposed actions before execution and records the decision, evidence, approval status, and audit trail.

## Protected boundary

RuleOak can govern actions such as:

- file reads and writes;
- shell or command execution requests;
- network access requests;
- MCP tool calls;
- adapter tool calls from LangGraph, CrewAI, or custom loops;
- evidence connector reads;
- external message or ticket updates;
- approval-required workflow steps.

## Core assumptions

RuleOak assumes:

- the host application routes tool calls through RuleOak before execution;
- policy packs are reviewed before use;
- secrets are not intentionally embedded in prompts, policies, or reports;
- generated reports are stored in an appropriate local or organizational location;
- developers understand the difference between a policy boundary and an operating-system sandbox.

## What RuleOak does not secure by itself

RuleOak does not by itself provide:

- kernel-level sandboxing;
- container isolation;
- malware detection;
- data-loss-prevention coverage for every external channel;
- identity provider enforcement;
- enterprise RBAC;
- certified compliance status;
- protection for tool calls that bypass RuleOak.

## Threats RuleOak helps reduce

| Threat | RuleOak mitigation |
|---|---|
| Destructive tool call | Deny policy and audit record |
| Sensitive action without review | Approval-required decision |
| Prompt-only policy bypass | Policy is outside the prompt |
| Unsupported evidence claim | Evidence-backed report pattern |
| Hidden model action | Tool-call decision log |
| Unsafe adapter behavior | Adapter conformance wrapper |
| Unreviewed policy change | Policy-pack scenario tests and diff output |

## Safe deployment guidance

For serious use cases, combine RuleOak with:

- least-privilege tool credentials;
- container or OS-level sandboxing where needed;
- separate secrets management;
- identity and access management;
- code review for policy packs;
- immutable or backed-up audit storage;
- security review of all high-risk tool implementations.

## Security claim boundary

RuleOak has automated security-boundary tests and policy-boundary examples. It is not yet externally security reviewed, independently certified, or a replacement for an enterprise security architecture.
