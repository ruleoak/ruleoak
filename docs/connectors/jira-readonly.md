# Jira read-only evidence connector

RuleOak Core v2.1.0 includes a Jira read-only evidence connector that converts Jira issue metadata into RuleOak evidence records.

## Why it exists

Many governed AI workflows need ticket context before making recommendations. The connector lets RuleOak collect Jira evidence without allowing an agent to comment, transition, assign, close, or update issues.

## Fixture mode

```bash
npm run jira:demo
```

## Live read-only mode

```bash
RULEOAK_JIRA_BASE_URL=https://example.atlassian.net \
RULEOAK_JIRA_EMAIL=you@example.com \
RULEOAK_JIRA_API_TOKEN=... \
RULEOAK_JIRA_JQL='project = PLAT ORDER BY updated DESC' \
npm run jira:demo:real
```

You can also use `RULEOAK_JIRA_PROJECT=PLAT` instead of a full JQL string.

## Safety boundary

The connector performs read-only Jira REST requests. It does not create issues, update fields, add comments, transition tickets, assign users, or perform destructive actions.

## Evidence records

The connector emits:

- a `jira_search` evidence record describing the query
- a `jira_issues` evidence record containing sampled issue metadata

The records can be included in RuleOak reports and protocol conformance workflows.
