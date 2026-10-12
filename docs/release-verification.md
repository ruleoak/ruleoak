<!-- SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
     SPDX-License-Identifier: Apache-2.0 -->
# Verify a RuleOak release

Use more than the filename. Verify the release checksum and, for a release produced by the authoritative GitHub workflow, verify the GitHub artifact attestation.

```bash
sha256sum -c SHA256SUMS.txt
```

For GitHub-hosted release artifacts, after the fresh repository has produced attestations:

```bash
gh attestation verify ./ruleoak-*.tgz --repo ruleoak/ruleoak
```

Inspect `release-manifest.json` and `sbom.cdx.json` as evidence accompanying the packages. The SBOM is CycloneDX and is itself checksum-bound. A GitHub release workflow also attests the package subjects against the SBOM.

For npm packages, verify the published version and provenance badge/metadata on npm after trusted publishing is configured. Source configuration alone cannot prove a registry-side provenance record exists.

A locally generated release candidate is useful for reproducibility checks but is **not** a substitute for an externally verifiable GitHub/npm attestation.
