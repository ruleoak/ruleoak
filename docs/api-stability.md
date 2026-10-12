# Public API Stability

RuleOak v0.50.0 introduces explicit public-surface maturity without declaring RuleOak 1.0. The machine-readable authority is `@ruleoak/protocol/stability/api-maturity.json`; the current stable guard is `stable-api-snapshot.json`. SHA-pinned historical floors under `stability/history/` make the current snapshot cumulative, and stable TypeScript declaration fingerprints detect signature drift as well as removals.

## Maturity levels

- **experimental** — may change or be removed during developer preview; changes still require release notes.
- **preview** — intended for integration use; breaking changes before 1.0 require an explicit migration path.
- **stable** — existing stable identifiers, package entry points, protocol versions and file formats cannot be removed or incompatibly redefined without the deprecation process.

Package-level maturity and per-export maturity are separate. `@ruleoak/protocol`, `@ruleoak/core`, and `@ruleoak/cli` remain pre-1.0 preview packages even though selected protocol contracts and the Extension SPI are stable. This deliberately avoids treating the entire 0.x surface as frozen.

The conformance-tested contract families listed here are the stable protocol set for the first public v0.50.0 release. Reliability Scorecard v1.0 remains preview. Core runtime and most CLI commands remain preview; advisory learning/demo surfaces are experimental.

`npm run check:api-stability` rejects removal of stable exports, protocol versions, package entry points, CLI commands, Extension SPI versions, or stable schema files. `npm run qa:auto` also executes the same authority.
