# Approval-gated Write Connectors Demo

This demo shows the RuleOak Core v2.1.0 pattern for write connectors:

1. propose a write intent
2. evaluate policy
3. require approval for risky external writes
4. deny destructive actions
5. record a local outbox instead of changing external systems

The demo does not call GitHub, Jira, or any network service.
