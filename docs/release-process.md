# RuleOak release process

RuleOak releases `@ruleoak/protocol`, `@ruleoak/core`, and `@ruleoak/cli` with one aligned version.

## Preconditions

- clean protected release branch or tag
- all package versions and internal dependency ranges aligned
- changelog and documentation updated
- `npm run check:publish` passes
- npm trusted publishing configured for all three packages
- GitHub environment `npm` configured with the intended protection rules

## Local release validation

```bash
npm ci --ignore-scripts
npm run check:publish
npm audit
```

Inspect package contents:

```bash
npm pack --workspace @ruleoak/protocol --dry-run
npm pack --workspace @ruleoak/core --dry-run
npm pack --workspace @ruleoak/cli --dry-run
```

Build the non-publishing release candidate:

```bash
npm run release:candidate
```

Review `release-candidate/release-manifest.json`, `SHA256SUMS.txt`, and all three package tarballs. In GitHub, the `Build release candidate` workflow performs the same validation and uploads the result without publishing to npm.

## Tag

```bash
git tag -s v0.50.0 -m "RuleOak v0.50.0"
git push origin v0.50.0
```

## Publish

Run the `Publish npm packages` GitHub Actions workflow from the exact release tag and enter the exact package version.

The workflow publishes in dependency order:

1. `@ruleoak/protocol`
2. `@ruleoak/core`
3. `@ruleoak/cli`

## Verify

```bash
npm view @ruleoak/protocol@0.50.0 version
npm view @ruleoak/core@0.50.0 version
npm view @ruleoak/cli@0.50.0 version

npx @ruleoak/cli@0.50.0 demo quickstart
```

Create or publish the GitHub release only after npm verification succeeds.


## Public launch supply-chain gates

Before a public release candidate is promoted:

1. Run `npm run qualify`, including standards and public-launch truth gates.
2. Build tarballs with `npm run release:candidate`; the output includes `release-manifest.json`, `SHA256SUMS.txt` and deterministic CycloneDX 1.6 `sbom.cdx.json`.
3. On GitHub, the release-candidate workflow uses OIDC permissions and artifact attestations for package tarballs plus release metadata/SBOM. A SLSA level is not claimed merely because the workflow exists; verify the actual public release attestation first.
4. Publish npm packages through configured trusted publishing and verify registry provenance after publication.
5. Verify the repository's hosted security controls (branch/ruleset, secret scanning, private vulnerability reporting, dependency alerts, scorecard upload) on the real public repository.

Checksums, SBOMs, attestations and standards crosswalks are release evidence; none is a security certification by itself.
