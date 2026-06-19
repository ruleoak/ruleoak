# Connector safety corpus

RuleOak Core includes connector safety checks for evidence connectors.

The current rule is simple:

- read-only connectors must use read-only semantics
- GitHub and Jira evidence connectors must not perform write actions
- connector evidence must label write support as false
- connector reports must preserve evidence counts and source metadata

Future releases can expand this with pagination, rate limit, redaction, and live/fixture parity tests.
