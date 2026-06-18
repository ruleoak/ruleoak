# GitHub and Jira Read-only Connector Pattern

RuleOak Core v1.3 includes local fixture connectors that model how GitHub and Jira evidence can be collected safely.

These are not production API connectors yet. They are a tested connector boundary:

- read local fixture data
- summarize evidence
- never write back
- never use network
- never require credentials
- produce RuleOak-compatible evidence records

This lets developers design governed workflows before connecting to real enterprise systems.

## Future direction

A future production connector should keep the same safety structure:

- read-only mode by default
- explicit credentials boundary
- network allowlist
- approval-required write actions
- audit record for every proposed external change
- dry-run mode
