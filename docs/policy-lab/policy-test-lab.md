# RuleOak Policy Test Lab

RuleOak Core includes a local Policy Test Lab for developers who want to test policy behavior before connecting an agent to real tools.

The lab answers three practical questions:

1. What will this policy allow, approval-gate, or block?
2. Why did the policy reach that decision?
3. Did a policy change become more permissive or more restrictive?

## Commands

```bash
npm run policy:test
npm run policy:explain
npm run policy:diff
```

## Test a policy pack combination

```bash
npm run policy:test -- --packs=filesystem-safe,external-communication,ticketing-write-approval,cloud-llm-approval
```

Expected output includes decisions such as:

```text
search_docs: allowed
send_external_message: approval_required
delete_workspace_file: blocked
```

The JSON report is written to:

```text
reports/policy-lab/policy-test-report.json
```

## Explain a policy

```bash
npm run policy:explain -- --packs=filesystem-safe,external-communication
```

This prints the effective decision for each tool in the combined policy.

The JSON report is written to:

```text
reports/policy-lab/policy-explain.json
```

## Diff two policies

```bash
npm run policy:diff -- --before=ticketing-readonly --after=ticketing-write-approval
```

This shows whether a policy change made tool behavior more restrictive or less restrictive.

The JSON report is written to:

```text
reports/policy-lab/policy-diff.json
```

## Scenario file

The default scenario is:

```text
configs/policy-test-scenarios.example.json
```

You can pass a different scenario:

```bash
npm run policy:test -- --scenario=configs/my-policy-scenario.json
```

## Boundary

Policy Test Lab does not execute tools. It evaluates policy behavior locally and records evidence, approvals, and audit events for review. It is a developer validation tool, not a compliance certification.
