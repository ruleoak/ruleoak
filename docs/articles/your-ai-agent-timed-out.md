# Your AI Agent Timed Out. Did the Action Actually Happen?

A timeout is not an outcome.

That sounds obvious in distributed systems, yet it is easy to forget when an AI agent is driving tools.

Imagine an agent calls `create_issue`:

```text
agent → tool → external service
                   ↓
               issue created
                   ↓
             response lost
```

The agent sees a timeout. There are now two materially different worlds:

```text
A. the issue was never created
B. the issue was created and only the response was lost
```

Retrying in A may be correct. Retrying in B may create a duplicate issue, duplicate deployment, duplicate message, duplicate transaction, or duplicate infrastructure change.

## Authorization is necessary but not sufficient

A policy gateway can answer:

> Was this exact action allowed to execute?

That is an authorization question.

After dispatch, a different question appears:

> What external effect actually happened?

A successful transport response is not always proof of the intended business effect, and a failed/lost response is not proof of no effect.

## The Effect Boundary

RuleOak models the sequence explicitly:

```text
intent
  ↓
exact authorization
  ↓
one-use ExecutionLease
  ↓
execute once
  ↓
EffectReceipt
  ↓
independent postcondition verification
  ↓
retry disposition
```

The retry decision is evidence-bound:

- `DO_NOT_RETRY` when the effect is confirmed;
- `SAFE_TO_RETRY_WITH_NEW_AUTHORITY` only when no-effect is actually established and retry safety is explicit;
- `VERIFY_BEFORE_RETRY` / manual review when the world is still ambiguous.

The original authority is never silently reusable.

## Why postconditions matter

For an exact local file write, the postcondition may be the expected SHA-256 digest at the reviewed canonical path.

For Git, it may be exact repository/ref/commit state.

For a ticketing API, a useful profile might verify that the expected ticket identity exists rather than trusting only the response body.

The semantics must be tied to the actual implementation. A tool named `write_file` does not automatically mean "write this process's local filesystem." RuleOak therefore requires recognized or explicitly reviewed Effect Profiles and fails closed for unknown semantics.

## Failure modes the boundary must survive

A serious implementation needs to handle more than a clean 200 response:

- timeout before dispatch;
- timeout after dispatch;
- response loss after successful effect;
- process crash after authority consumption;
- partial effect;
- stale visibility/eventual consistency;
- concurrent mutation;
- capability/schema drift;
- replay of consumed authority;
- verifier-state tampering.

The important rule is constant:

> **uncertainty must remain uncertainty until external evidence resolves it.**

## Try the failure in 60 seconds

```bash
npm install
npm run demo:effect-boundary
```

The demo performs a real temporary filesystem side effect, deliberately loses the response, verifies the expected digest, and refuses the duplicate retry.

## The broader implication

AI agents did not invent the two-generals problem, ambiguous commit outcomes, idempotency keys, or exactly-once myths. They made these distributed-systems problems operationally common in software that can now decide to retry on its own.

That is why agent safety needs more than permission checks. For consequential actions, the execution path needs an explicit answer to:

> **Was it authorized, did it happen, and what evidence makes the next action safe?**
