# Jira read-only evidence connector

This demo turns Jira issue metadata into RuleOak evidence records.

Fixture mode:

```bash
npm run jira:demo
```

Live read-only mode:

```bash
RULEOAK_JIRA_BASE_URL=https://example.atlassian.net \
RULEOAK_JIRA_EMAIL=you@example.com \
RULEOAK_JIRA_API_TOKEN=... \
RULEOAK_JIRA_JQL='project = PLAT ORDER BY updated DESC' \
npm run jira:demo:real
```

Boundary:

- GET-only search request
- no issue creation
- no comments
- no transitions
- no field updates
- no destructive operations
