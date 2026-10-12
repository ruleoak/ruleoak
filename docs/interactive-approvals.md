# Interactive approvals

Run:

```bash
ruleoak approve
```

Pending records are ApprovalRequest v1 artifacts. They show bounded actor/tool/target/risk information and exact action/policy digests without copying raw action arguments into the approval contract.

Decisions:

1. allow once
2. deny once
3. allow this session
4. always ask for this exact action
5. always allow this exact action
6. always block this exact action

A local decision creates ApprovalResult v1 for the current exact action. Session/persistent choices additionally create the existing session cache or reviewable policy suggestion; they never silently edit active policy.

## Concurrency, expiry and policy binding

A pending file is atomically claimed before decision. A second process cannot successfully decide the same pending record.

ApprovalRequest is bounded by the original needs-approval DecisionReceipt expiry. ApprovalResult cannot outlive its request. If the policy digest changes before resolution, RuleOak rejects the stale approval and restores the claimed record to Pending for re-evaluation.

## Exact lease binding

Where an approval is used to authorize execution, RuleOak creates an approved DecisionReceipt v1.2 and one-time ApprovalResult consumption record before an ExecutionLease v1.2 can be issued. One ApprovalResult cannot issue multiple leases.
