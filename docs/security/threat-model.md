# Threat Model

RuleOak Core v1.3 includes a sandbox foundation. It is not yet externally security-reviewed.

## Primary risks

| Risk | Description | v1.0 control direction |
|---|---|---|
| Prompt injection | Untrusted content tries to override workflow instructions | Treat retrieved content as untrusted; keep policy decisions outside the model |
| Tool overreach | Agent proposes or calls tools beyond intended scope | Tool registry and policy evaluation |
| Filesystem leakage | Workflow reads secrets or unrelated files | Workspace boundary and denylist checks |
| Network exfiltration | Workflow sends data to unapproved endpoints | Network deny-by-default |
| Unsafe command execution | Workflow runs dangerous commands | Command allow/deny/approval decisions |
| Approval bypass | Risky action executes without human decision | Approval gate and audit events |
| Audit gaps | Important decisions are not recorded | Audit log and report exporter |

## Design principle

The model can propose. The runtime and sandbox decide. Risky actions require approval. The run is recorded.

## Review boundary

The v1.3 threat model is a starting point for engineering review. It is not a certification or security audit.
