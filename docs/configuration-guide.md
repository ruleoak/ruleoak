# Configuration guide

RuleOak configuration should make the authority boundary inspectable rather than burying it in implicit defaults.

## Workspace

The local `.ruleoak/` workspace contains configuration/evidence material used by RuleOak workflows. Treat it as operational state: do not publish private evidence, credentials, or machine-local secrets merely because the directory is convenient.

## Policy

Policy should describe what the normalized action is allowed to do. Prefer narrow operation/resource rules and explicit defaults. A broad allow rule can make a technically healthy boundary operationally unsafe.

Useful principles:

- default deny for consequential paths;
- keep operation and resource identity explicit;
- separate approval requirements from effect semantics;
- version/review policy changes that can invalidate earlier assumptions;
- test both allowed and denied cases;
- do not encode secrets directly in public policy/configuration.

## Effect Profiles

Effect Profiles are not generic tool-name mappings. They bind reviewed postcondition semantics to a specific operation/resource shape and should include provenance, scope and bounded verification behavior.

A route without trusted postcondition semantics can still be policy-protected, but it should remain `READY_POLICY_ONLY` rather than pretending to have effect-boundary coverage.

## Approvals

Approval adds an explicit authorization step. It does not change the underlying policy/effect semantics. Approval providers should receive only the information required to make the decision and must not be treated as a source of effect truth.

## Evidence storage

Evidence is local by default. Protect the workspace using normal OS/filesystem controls appropriate to your environment. Hash-chain verification can detect inconsistencies in recorded evidence, but it does not make the local host tamper-proof.

## Remote or network-exposed operation

The default posture is local/cooperating. If you expose a REST or MCP proxy over a network, you are adding authentication, transport, availability and network-trust requirements that RuleOak does not automatically solve.

## Configuration review checklist

Before production-like use, verify:

- exact interception point;
- default policy behavior;
- approval provider scope;
- effect-profile provenance;
- evidence location/retention;
- retry/reconciliation behavior;
- bypass paths;
- transport authentication if non-loopback;
- upgrade/migration behavior for public schemas.

Use `protect check`, policy tests and CrashLab to validate the configuration rather than relying only on static review.
