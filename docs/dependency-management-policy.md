<!-- SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
     SPDX-License-Identifier: Apache-2.0 -->
# Dependency management policy

RuleOak minimizes production dependencies and treats dependency changes as release-impacting changes.

- Direct dependencies are declared in package manifests and locked in `package-lock.json`.
- Pull requests changing dependencies are reviewed by GitHub Dependency Review and ordinary CI before merge.
- Dependabot is used for update discovery on the authoritative GitHub repository.
- New runtime dependencies require a documented need, compatible license, maintained upstream, and review of the transitive footprint.
- A dependency change must not weaken the Effect Boundary, evidence integrity, fail-closed behavior, or the public/private source boundary.
- Release packaging generates a deterministic CycloneDX SBOM. A real public release must additionally carry externally verifiable provenance/attestation where the hosting platform supports it.
- Known-vulnerability policy is fail closed for release-blocking findings at the configured CI threshold unless a reviewed non-exploitability exception is documented in the authoritative repository.

This policy describes source and CI expectations. It does not claim that hosted GitHub security settings are enabled until they are verified on the live repository.
