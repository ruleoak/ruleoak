# CI and release verification

RuleOak's repository checks are intentionally split because different gates prove different properties. A single green test command should not be treated as universal release evidence.

## Local source checks

From a clean source tree:

```bash
npm run check:bootstrap
npm run check:source-manifest
npm test
npm run qa:auto
```

Then run the publication/security/package gates relevant to the release, including npm metadata, launch readiness, release consistency, workflow security, standards, package-content checks, install smoke and reproducibility.

## Aggregate qualification

```bash
npm run qualify
```

The aggregate command is useful as orchestration, but a host timeout is not automatically a PASS or a FAIL. Preserve the last completed gate and rerun the remaining gates independently when necessary.

## Source manifest

`SOURCE_MANIFEST.sha256` binds governed source paths, file modes and SHA-256 digests. It is useful for detecting mixed or incomplete trees—especially missing dot-directories such as `.github/` or `.ruleoak/` after a bad copy/extraction.

## GitHub workflow security

Public workflows are checked for immutable action references. Hosted CI still proves hosted execution only after the repository exists and GitHub has run the workflows on the exact commit/tag.

## Package verification

`npm pack` content checks and packed-install smoke tests verify what would actually be distributed, not merely what exists in the monorepo.

## Reproducibility

Reproducibility checks should compare independently generated artifacts byte-for-byte where the release contract claims deterministic output.

## Release evidence ladder

Keep these layers distinct:

1. source tree and manifest;
2. local/static tests;
3. CI-hosted tests/security scanning;
4. packaged artifacts;
5. signed/attested artifacts where applicable;
6. public registry/repository publication;
7. deployment/integration evidence from real environments.

Do not use a lower layer to claim a higher one.
