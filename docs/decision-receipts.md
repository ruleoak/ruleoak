# Decision receipts

A DecisionReceipt binds one RuleOak decision to the normalized action digest, policy digest, principal/action context and a bounded validity window.

## Version 1.1

Version 1.1 adds nonce, issuer, audience, not-before and exactly-one-time receipt semantics. It remains the normal receipt for direct policy/authority decisions.

## Version 1.2 — approval-bound decision

RuleOak v0.50.0 uses DecisionReceipt v1.2 when ApprovalResult v1 resolves a `needs_approval` decision. In addition to v1.1 fields it binds:

- `approval_id`
- `approval_result_id`
- `approval_request_decision_id`
- `approval_provider_id`

The approved receipt preserves the exact action and policy digests from the request/result chain.

## Verification

Verification fails when the receipt is expired, action digest changes, current policy digest differs, a required signature is invalid, or an allow receipt is required and the decision is not allow.

A DecisionReceipt is an authorization artifact, not a sandbox. Verification does not itself consume it. Execution boundaries must use the appropriate one-time receipt/lease consumption mechanism.

See [`execution-grant-consumption.md`](./execution-grant-consumption.md) and [`concepts/APPROVAL_CONTRACT.md`](./concepts/APPROVAL_CONTRACT.md).
