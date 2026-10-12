# Why RuleOak

RuleOak exists because consequential AI-agent actions have two separate correctness problems: **authorization before execution** and **effect certainty after execution**.

Most authorization systems answer whether a request is allowed. That is necessary, but it does not answer what happened when execution is interrupted, the response is lost, or the caller retries.

## The failure mode

Consider a tool call that creates an issue, updates infrastructure, sends a message, writes a file or changes an external system:

```text
caller sends action
       ↓
external effect happens
       ↓
response is lost
       ↓
caller sees timeout
       ↓
caller retries
```

If the first effect already happened, a blind retry can duplicate or corrupt state. If the first effect definitely did not happen, refusing every retry can leave work incomplete. If the world is still ambiguous, pretending either answer is known is unsafe.

RuleOak therefore treats retry disposition as an evidence problem rather than a transport-status shortcut.

## The RuleOak chain

```text
exact action identity
    ↓
authority and policy
    ↓
approval when required
    ↓
one-use ExecutionLease
    ↓
execute once
    ↓
EffectReceipt
    ↓
trusted postcondition verification
    ↓
retry disposition
    ↓
local evidence
```

A one-use lease reduces replay mistakes. An Effect Profile describes how a particular external effect can be checked. When no trusted semantics are available, RuleOak keeps the outcome unresolved instead of inferring success from a tool name or response code.

## What RuleOak adds to ordinary guardrails

Prompt/content guardrails operate on model input and output. RuleOak focuses on concrete actions at the execution boundary. It can use contextual signals, but its primary job is not to decide whether text is suspicious; it is to make action authority and post-action evidence explicit.

## What RuleOak does not replace

RuleOak is not an OS sandbox, endpoint-security agent, IAM platform, network firewall or universal prompt-injection detector. It only governs actions that pass through a cooperating RuleOak boundary. Strong deployments should still use least privilege, OS/process isolation, secure credentials, network controls and domain-specific validation.

## A useful mental model

Think of RuleOak as two connected systems:

- **Flight Control** before execution — who/what may do exactly which action under which policy, approval and delegation constraints.
- **Flight Recorder** around and after execution — what RuleOak observed, what effect can be established, and what remains uncertain.

The Effect Boundary connects them.

## Where to go next

- [Getting started](getting-started.md)
- [Architecture overview](architecture/OVERVIEW.md)
- [Concepts map](concepts-map.md)
- [Use cases](use-cases.md)
- [Security boundary](security-boundary.md)
- [Threat model](threat-model.md)
