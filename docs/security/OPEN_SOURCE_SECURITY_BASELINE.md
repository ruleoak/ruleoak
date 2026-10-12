# Open-source security baseline

RuleOak uses the OpenSSF Open Source Project Security (OSPS) Baseline as a repository-security reference and NIST SSDF/SLSA/REUSE as complementary secure-development and supply-chain references.

This file is a **readiness record**, not a certification badge.

## Static controls enforced in source

The repository tracks all 24 OpenSSF OSPS Baseline 2026.08.28 Level-1 controls in `standards/openssf-osps-level1-2026-08-28.json`. Each is marked source-pass, hybrid, not-applicable, or external-required. The release gate also checks or ships evidence for:

- OSI-approved Apache-2.0 licensing across first-party code;
- SECURITY.md and private-vulnerability-reporting instructions;
- DCO contribution policy;
- CodeQL workflow;
- dependency-review workflow;
- lockfile-based package installation;
- minimal default GitHub Actions permissions;
- Dependabot configuration;
- CODEOWNERS for security-sensitive surfaces;
- REUSE/SPDX metadata;
- SBOM generation for release candidates;
- release hashes and package manifest;
- immutable commit-pinned GitHub Actions;
- artifact provenance and SBOM-attestation workflow configuration;
- OpenSSF Security Insights v2.2.0 machine-readable metadata;
- no private/owner-only material in public source;
- documented SAST remediation threshold.

## Fresh GitHub repository settings that the owner must enable

Source files cannot prove hosted-repository settings. Before public launch, configure the authoritative repository to require:

1. MFA / strong authentication for privileged organization/repository access;
2. least-privilege collaborator permissions;
3. default branch `main`;
4. branch rules requiring CI, CodeQL/dependency/security checks before merge where GitHub permits them;
5. deletion/force-push protection for `main`;
6. private vulnerability reporting;
7. secret scanning and push protection where available;
8. Dependabot alerts/security updates;
9. signed/immutable release process and GitHub artifact attestations;
10. Actions restricted to required, reviewed sources and least-privilege workflow permissions.

For a solo-maintainer project, do not claim two-party review controls that do not exist. If a second maintainer is added, upgrade branch rules and review requirements accordingly.

## SAST remediation policy

- Critical/high findings that plausibly cross the documented RuleOak security boundary block release until remediated or explicitly documented as non-exploitable with maintainer rationale.
- Moderate findings are triaged before release and block when they can alter authorization, execution, effect certainty, evidence integrity, secret handling, release integrity or external exposure.
- Low/informational findings may be scheduled when they do not affect the security boundary.

Suppressions must be narrow, documented and reviewable.
