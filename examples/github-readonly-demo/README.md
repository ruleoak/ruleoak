# RuleOak GitHub Read-only Connector Demo

Demonstrates the RuleOak Core v2.1.0 GitHub read-only evidence connector.

By default the demo uses a mocked `fetch` implementation, so it requires no token and no network.

To call the real GitHub API, set:

```bash
RULEOAK_GITHUB_REPO=owner/repo GITHUB_TOKEN=... npm run github:demo:real
```

The connector only performs GET requests and never writes to GitHub.
