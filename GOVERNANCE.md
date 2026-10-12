# RuleOak Governance

RuleOak is stewarded and published by **RuleOak Pte. Ltd.** (UEN 202639787M).

## Decision model

- security and fail-closed behavior take precedence over convenience;
- public behavior changes require tests and documentation;
- no tool receives trusted effect semantics from its name alone;
- standard/framework mappings must distinguish implementation evidence, crosswalks and external repository settings;
- large architecture/protocol changes should begin as an issue/design proposal;
- market claims must remain narrower than verified product behavior.

## Contributions

External contributions are welcome through pull requests. DCO sign-off is required and all current first-party paths are Apache-2.0 unless explicitly marked otherwise.

## Releases

- public package versions remain aligned across protocol, core and CLI;
- release candidates must pass `npm run qualify`;
- release candidates include hashes and an SBOM;
- public GitHub release artifacts should use artifact attestations;
- npm releases should use trusted publishing/provenance;
- security fixes may be released outside normal roadmap cadence.

## Repository controls

The authoritative GitHub repository should require MFA for privileged access, least-privilege collaborators, protected/default-branch rules and required security/status checks appropriate to a solo-maintainer project. See [`docs/security/OPEN_SOURCE_SECURITY_BASELINE.md`](./docs/security/OPEN_SOURCE_SECURITY_BASELINE.md).

## Project identity

The public source of truth is `ruleoak/ruleoak`. RuleOak Pte. Ltd. (UEN 202639787M) is the official publisher of that repository and the RuleOak project. Trademark use is governed separately by [`TRADEMARK.md`](./TRADEMARK.md).
