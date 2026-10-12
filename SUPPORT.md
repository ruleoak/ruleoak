# RuleOak Support

## Start with self-diagnosis

For runtime/integration problems, collect sanitized output from:

```bash
ruleoak --version
ruleoak protect check
ruleoak protect status
ruleoak effect pending
ruleoak record verify
```

If you are working from source, also run:

```bash
npm run check:source-manifest
npm test
```

See [`docs/troubleshooting.md`](./docs/troubleshooting.md) before reporting a common boundary/effect issue.

## Open-source support

RuleOak v0.50.0 is a free/open-source developer preview. After the fresh public repository is available:

- use GitHub Issues for reproducible bugs, documentation gaps and compatibility reports;
- use GitHub Discussions for design questions and Effect Profile proposals;
- use the compatibility-report template for client/server/runtime-specific integration evidence.

Include:

- RuleOak version;
- Node.js version;
- operating system/architecture;
- integration path (SDK, MCP stdio, MCP HTTP, REST, CLI);
- exact sanitized command/reproduction;
- expected vs observed authorization/effect behavior.

Never post credentials, access tokens, private source, private evidence, raw customer data or signing material.

## Security issues

Follow [`SECURITY.md`](./SECURITY.md) and use GitHub private vulnerability reporting once the repository is public. Do not disclose an unpatched vulnerability through a public issue or discussion.

## What best-effort support covers

Best-effort project support covers public packages, documented protocols/contracts, release artifacts and documented integration paths.

It does not imply support for:

- actions that bypass RuleOak;
- unsupported runtime versions;
- arbitrary private forks;
- custom tool semantics without a reviewed Effect Profile;
- third-party services outside RuleOak's control;
- production architecture/security decisions that depend on your environment.

## Useful documentation

- [`docs/getting-started.md`](./docs/getting-started.md)
- [`docs/use-cases.md`](./docs/use-cases.md)
- [`docs/security-boundary.md`](./docs/security-boundary.md)
- [`docs/threat-model.md`](./docs/threat-model.md)
- [`docs/compatibility-matrix.md`](./docs/compatibility-matrix.md)
- [`docs/troubleshooting.md`](./docs/troubleshooting.md)
