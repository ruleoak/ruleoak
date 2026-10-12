# Capability drift and authority review

RuleOak capability comparison distinguishes ordinary metadata drift from changes that can alter execution authority or agent behavior.

An explicit policy review is required for:

- newly added state-changing/high-consequence/destructive tools;
- consequence escalation;
- consequential input-schema changes;
- tool description or annotation changes;
- secret/credential/identity-related capability changes; and
- execution identity, transport, or protocol changes.

Description and annotation changes are tracked through digests. They do **not** redefine the established authorization-surface fingerprint, so a routine public/index compatibility invariant remains stable, but they do invalidate the retained approval baseline for semantic review. This catches a class of MCP/tool-definition drift where a tool keeps the same name and schema while its instructions or annotations change.

Read-only tools that expose or request secrets, credentials, tokens, private keys, permissions, or identity material are not auto-allowed merely because they are read-only; the conservative recommended policy is `deny` until explicitly overridden.

Capability comparison never silently rewrites a user's policy and never grants new capabilities. The Agent Release Gate can bind an explicit review to `candidate.capability_review_fingerprint`; when a capability fingerprint changes, a bare boolean acknowledgement is insufficient for consequential drift.
