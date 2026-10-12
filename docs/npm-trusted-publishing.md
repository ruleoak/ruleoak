# npm trusted publishing

RuleOak includes `.github/workflows/publish.yml` for manual, ordered npm publishing through GitHub Actions OIDC

## Package order

1. `@ruleoak/protocol`
2. `@ruleoak/core`
3. `@ruleoak/cli`

Core depends on protocol, and CLI depends on both

## npm configuration

For each npm package, configure a trusted publisher that matches:

- GitHub organization: `ruleoak`
- Repository: `ruleoak`
- Workflow: `publish.yml`
- Environment: `npm`

Create a protected GitHub environment named `npm` and restrict deployment to maintainers and release tags/processes that you trust

## Publish

Create and push the exact signed release tag first, then run the GitHub workflow manually from that tag and enter the same aligned version, such as `0.50.0`

The workflow:

- checks out without persistent credentials
- installs from the lockfile with scripts disabled
- verifies package alignment
- runs the full publish-readiness suite
- publishes protocol, core, then CLI
- receives automatic npm provenance from trusted publishing for the public packages and public repository

Do not store a long-lived npm automation token when trusted publishing is configured

## Fresh-repository launch requirements

For each public package, configure npm trusted publishing against the exact `ruleoak/ruleoak` GitHub repository and the publish workflow before the first public publish. Keep `id-token: write` scoped to the publish job, do not store a long-lived npm automation token for normal publishing, enable two-factor authentication on maintainer accounts, and restrict/expire any remaining granular tokens. Public packages request npm provenance via `publishConfig.provenance=true`; trusted publishing should remain the primary authentication path.

A successful local `npm pack` proves package contents only. It does not prove that a public npm release was published with provenance; that claim is made only after verifying the actual registry release.
