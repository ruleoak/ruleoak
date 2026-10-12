# RuleOak 60-second Effect Boundary demo

The fastest way to understand RuleOak is to reproduce the three decisions an execution boundary must distinguish.

## Run

```bash
npm install
npm run demo:effect-boundary
```

## Decision matrix

### 1. The effect happened, but the response was lost

RuleOak authorizes one exact write, consumes a one-use `ExecutionLease`, writes the file, deliberately loses the function response, then independently verifies the expected filesystem state.

Expected result:

```text
confirmed_success -> do_not_retry
Duplicate retry prevented: YES
```

### 2. The effect provably did not happen and the action is explicitly idempotent

RuleOak captures the pre-dispatch state, the simulated operation fails without mutating it, and the operation explicitly declares duplicate-safe/idempotent semantics.

Expected result:

```text
confirmed_failure -> safe_to_retry_with_new_authority
Fresh authority required: YES
```

RuleOak still does not reuse the consumed lease.

### 3. The tool is unsupported / has no trusted effect semantics

The call may be authorized, but RuleOak has no trustworthy postcondition for the external effect.

Expected result:

```text
unknown -> verify_before_retry
```

RuleOak does not manufacture certainty from a tool name, process return, HTTP response, or localhost endpoint.

## Why this differs from an allow/deny gateway

An allow/deny decision answers whether an action **may** execute. It cannot by itself prove whether an external effect **did** happen after a timeout, process crash, dropped response, or partial failure.

```text
authorization -> one-use execution -> observed effect -> independent verification -> retry disposition
```

See [`examples/templates/`](examples/templates/) for copyable developer implementations.
