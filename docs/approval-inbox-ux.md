# Approval Inbox UX polish notes

RuleOak Core v2.0.1 treats the local approval inbox as a key developer-facing workflow.

The inbox should help a reviewer answer five questions quickly:

1. What action is being requested?
2. Why does policy require approval?
3. What evidence supports the request?
4. What is the risk level?
5. What audit record will be produced after approve or reject?

## Recommended approval detail layout

- request ID
- proposed tool/action
- actor
- subject
- policy reason
- risk label
- evidence summary
- approve / reject instruction
- audit history

Current implementation remains local-only and file-backed. It does not run a hosted approval workflow and is not compliance-certified.
