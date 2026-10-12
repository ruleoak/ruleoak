# RuleOak npm publication checklist

RuleOak v0.50.0 is designed for trusted, reviewable publication. This checklist separates source-verifiable readiness from account/repository settings that only an repository/package maintainers can establish.

## Before the first public npm publication

Use `publication_mode=initial-direct` in `.github/workflows/publish.yml` **only when all three `@ruleoak/*` packages do not yet exist on npm**.

Repository/account prerequisites:

1. The public GitHub repository is `ruleoak/ruleoak` and the exact `v0.50.0` tag points at the qualified commit.
2. GitHub branch/ruleset protection, MFA, secret scanning, private vulnerability reporting, and the `npm` environment are configured.
3. Each npm package is configured with GitHub Actions trusted publishing for `publish.yml` and the `npm` environment.
4. The trusted publisher temporarily permits direct `npm publish`, because npm staged publishing cannot create a brand-new package.
5. No long-lived npm automation token is stored in GitHub.
6. Run the release-candidate workflow and inspect the exact tarballs, `SHA256SUMS.txt`, CycloneDX SBOM, release manifest, and publish plan.
7. Run the publish workflow from the exact `v0.50.0` tag and enter `confirm_version=0.50.0`, `publication_mode=initial-direct`.
8. Verify all three registry versions and provenance after publication.

## Immediately after the first publication

Change the npm trusted-publisher permission to **stage-only** if the account/package configuration supports it. Keep package publishing access at the strongest available 2FA/token-restriction setting.

## Subsequent versions

Use `publication_mode=stage-existing`. The workflow submits the exact qualified tarballs with `npm stage publish` but does not make them public. A maintainer must then review and approve each staged package with 2FA, in dependency order:

1. `@ruleoak/protocol`
2. `@ruleoak/core`
3. `@ruleoak/cli`

The stage review/approval is intentionally outside CI because it is proof-of-presence.

## Source-verifiable commands

```bash
npm run qualify
SOURCE_DATE_EPOCH=946684800 npm run release:candidate
cat release-candidate/publish-plan.json
cat release-candidate/SHA256SUMS.txt
```

## Claims that remain external

A source archive cannot prove that GitHub settings are enabled, that npm trusted-publisher relationships exist, that packages were actually published, that provenance is visible on npm, that Scorecard has run successfully, or that users activate/retain RuleOak. Record those as external release/adoption evidence rather than source claims.
