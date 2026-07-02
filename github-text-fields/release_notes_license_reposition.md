# RuleOak licensing and compliance cleanup

This release clarifies RuleOak's package-level licensing model and removes ambiguous root licensing signals.

## Licensing model

- `@ruleoak/protocol`: MIT
- `@ruleoak/core`: Apache-2.0
- `@ruleoak/cli`: Apache-2.0
- Repository docs, tests, site source, and maintenance scripts: Apache-2.0 unless a file says otherwise

## Compliance files added

- `LICENSE.md` repository license map
- `LICENSES/Apache-2.0.txt` and `LICENSES/MIT.txt`
- package-local `LICENSE` files
- `REUSE.toml`
- file-level SPDX headers
- `TRADEMARK.md`
- `DCO.md`
- strengthened `CONTRIBUTING.md`

## Trademark clarification

The RuleOak name and branding are not licensed by MIT or Apache-2.0. Forks and modified distributions must be clearly renamed and must not imply official RuleOak status.

## Contribution clarification

RuleOak currently uses DCO sign-off, not a CLA. DCO is lightweight and adoption-friendly, but it does not automatically give Sun Shaobin or a future RuleOak legal entity proprietary relicensing rights over contributor-owned code.
