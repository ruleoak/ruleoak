# Approval provider API

RuleOak v0.50.0 defines Approval Provider API v1.1 together with ApprovalRequest v1 and ApprovalResult v1.

The core package exports:

- `APPROVAL_PROVIDER_API_VERSIONS`
- `APPROVAL_PROVIDER_API_VERSION` (`1.1`)
- `APPROVAL_DECISIONS`
- `buildApprovalRequest`
- `buildApprovalResult`
- `verifyApprovalRequest`
- `verifyApprovalResult`
- `applyApprovalResult`
- `ApprovalBroker`
- `MemoryApprovalProvider`

## Provider contract

```js
const provider = {
  apiVersion: '1.1',
  providerId: 'example.review-service',
  name: 'Example review service',
  async request(request, context) {
    // request.provider_id is already bound to this provider.
    return { accepted: true, approval_id: request.approval_id, status: 'pending' }
  },
  async decide(approvalId, decision, context) {
    // Return ApprovalResult v1 for an exact resolved action.
  }
}
```

Provider v1.1 requires a stable `providerId`. RuleOak binds that identifier into ApprovalRequest before sending it. ApprovalResult must carry the same provider identity.

Legacy v1.0 providers remain readable for compatibility. A v1.0 provider may still return the older immediate decision shape, but that path produces a legacy decision receipt and is not the current exact ApprovalResult→ExecutionLease binding path.

## Signing

`buildApprovalResult(..., { secret })` and `signApprovalResult()` support HMAC-SHA256 provider signatures. Callers can require them with `requireSignature` / `requireApprovalSignature` and the configured provider secret.

## Privacy

ApprovalRequest intentionally omits raw tool arguments and arbitrary call context. Providers receive only the bounded identity, target, risk/classification and exact digests needed to review the action.

## Built-in file queue

The CLI file queue identifies itself as `ruleoak.local-file-queue`. A local decision produces ApprovalResult v1 and stores it inside the decided approval record.

```bash
ruleoak approve --pending --dir ./workspace
ruleoak approve --pending --id <approval-id> --decision allow_once --dir ./workspace
```

Expired or stale claimed approvals fail closed and are restored to Pending so the action can be re-evaluated.


## Provider identity and request boundary

ApprovalRequest v1 must be created for an explicit provider identity. There is no implicit provider identity in the v1 builder. Provider API v1.1 therefore uses its stable `providerId` as part of the signed/digested request binding.

The provider receives a closed, bounded request projection. Raw tool arguments and arbitrary call context are not fields in that projection, and a hand-built request containing undeclared nested fields fails protocol validation even if its semantic digest is recomputed.
