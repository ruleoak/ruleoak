# Contributing to RuleOak

Issues, documentation improvements, Effect Profiles, compatibility reports, tests, focused fixes and small pull requests are welcome.

## Before contributing

- read [`SECURITY.md`](./SECURITY.md) and [`docs/security/BOUNDARY.md`](./docs/security/BOUNDARY.md);
- open an issue before a large architecture/protocol change;
- avoid depending on internal package source paths;
- never submit secrets, private evidence, customer/employer material, or data you cannot publish;
- preserve the rule that unsupported effect semantics fail closed.

## Development setup

```bash
npm ci --ignore-scripts
npm test
npm run check:publish
```

Changes to policy, authority, evidence, receipts, effect verification, Effect Profiles or stream/gateway behavior should include positive, negative and fail-closed tests.

## Effect Profile contributions

Effect Profiles are a high-value contribution area. A profile must define **observable postconditions**, provenance/identity requirements and bounded resource scope; a tool name by itself is never sufficient proof of semantics.

See [`docs/effect-profiles.md`](./docs/effect-profiles.md).

## Contribution license

All current first-party source, documentation, tests, examples, schemas and repository automation are Apache-2.0 unless a file explicitly identifies third-party material under another license.

Contributions are accepted under the license of the file/path changed. Do not silently relicense third-party or contributor-owned material.

## DCO sign-off

Every commit must include a Developer Certificate of Origin sign-off:

```bash
git commit -s -m "Describe your change"
```

DCO is not a CLA and does not automatically grant future proprietary relicensing rights. See [`DCO.md`](./DCO.md).

## Pull request expectations

- explain the user/security problem;
- describe the public behavior change;
- include tests and documentation;
- preserve fail-closed behavior;
- keep package contents minimal;
- pass `npm run qualify` and REUSE lint;
- resolve security/static-analysis findings or document a reviewed suppression.

## Security reports

Do not open a public issue for an undisclosed vulnerability. Follow [`SECURITY.md`](./SECURITY.md).

## Trademark

The RuleOak name/logo are not licensed under Apache-2.0. Forks and modified distributions must be clearly renamed and must not imply official status. See [`TRADEMARK.md`](./TRADEMARK.md).
