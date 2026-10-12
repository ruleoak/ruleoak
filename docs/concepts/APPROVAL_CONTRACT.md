# Approval Contract

RuleOak defines an exact-action approval chain. Approval is no longer represented only by a queue status or provider callback.

```text
needs_approval DecisionReceipt
        ↓
ApprovalRequest v1
        ↓
ApprovalResult v1
        ↓
approved DecisionReceipt v1.2
        ↓
one-time approval-use marker
        ↓
ExecutionLease v1.2
```

## ApprovalRequest v1

An ApprovalRequest binds the pending decision to:

- `approval_id`
- original `request_decision_id`
- semantic `request_digest`
- exact `action_digest`
- exact `policy_digest`
- `principal_id`
- expected `provider_id`
- issuer/audience
- request/not-before/expiry times
- one-time request nonce
- bounded display/classification metadata

The request intentionally does not copy raw tool arguments or arbitrary normalized-call context.

## ApprovalResult v1

An ApprovalResult binds:

- the exact ApprovalRequest and request digest
- the original needs-approval DecisionReceipt ID
- exact action and policy digests
- principal
- provider identity
- approver identity
- `allow` or `deny`
- decision time and bounded validity
- one-time result nonce
- semantic result digest
- optional HMAC signature

Provider signatures authenticate an ApprovalResult inside a configured shared trust domain. Semantic digests detect accidental/tampered content but are not a substitute for provider authentication.

## Policy freshness

RuleOak rechecks the current policy digest when an ApprovalResult is applied. An approval cannot resolve a request evaluated under a different policy.

## Lease binding and replay resistance

An approved DecisionReceipt is version 1.2 and carries the approval/request/provider correlation IDs.

An approval-bound ExecutionLease is version 1.2. `issueExecutionLease()` atomically consumes the ApprovalResult into an approval-use store and binds that one use to the generated lease ID and nonce. A second lease cannot be issued from the same ApprovalResult.

If approval consumption succeeds but a later lease-build check fails, the approval remains spent. This is intentionally fail-safe; RuleOak does not silently restore an approval whose issuance attempt may have raced with authority/revocation state.

## Session and persistent choices

`allow_session` still creates an exact-action session cache after approving the current action. `always_allow`, `always_ask`, and `always_block` still create reviewable policy suggestions where applicable. These UX choices do not replace the exact ApprovalResult for the current action and do not silently mutate active policy.

## Provider compatibility

Approval Provider API v1.1 adds a stable `providerId`. Legacy provider API v1.0 remains accepted for compatibility, but immediate v1.1 provider decisions must be returned as ApprovalResult v1 artifacts.


## Provider-safe request projection

ApprovalRequest must bind an explicit provider identity before it leaves RuleOak. There is no implicit "unspecified" provider in the v1 builder.

The protocol itself enforces the provider-safe projection: `normalized_call`, `classification`, and `action` have closed nested field sets. A caller cannot add raw `arguments`, arbitrary `context`, or undeclared nested fields and remain a valid ApprovalRequest merely by recomputing `request_digest`.

Approval resolution verifies request/result validity at the actual resolution time by default. Deterministic callers/tests may supply an explicit `now`; omitting it never rewinds verification to the historical provider decision time.

