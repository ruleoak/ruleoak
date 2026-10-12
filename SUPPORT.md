# RuleOak Support

## Open-source support

RuleOak v0.50.0 is a free/open-source project. Use GitHub Issues for reproducible bugs, documentation gaps and compatibility reports. Use GitHub Discussions for design questions and Effect Profile proposals.

Before reporting a runtime problem, collect sanitized output from:

```bash
ruleoak --version
ruleoak protect check
ruleoak record verify
```

Include operating system, Node.js version, exact command and a synthetic reproduction. Never post secrets, credentials, private source, or private evidence.

## Security issues

Follow [`SECURITY.md`](./SECURITY.md). Do not disclose an unpatched vulnerability through a public issue or discussion.

## Scope

Best-effort project support covers the public packages and documented behavior. It does not guarantee support for actions that bypass RuleOak, unsupported Node.js versions, arbitrary private forks, or custom tool semantics without a reviewed effect contract.
