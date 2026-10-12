# Public API compatibility — v0.50.0

RuleOak v0.50.0 is the first public release. Its public API maturity registry distinguishes `experimental`, `preview`, and `stable` surfaces so compatibility expectations are explicit from the start.

Stable protocol and API surfaces are recorded in `@ruleoak/protocol/stability/api-maturity.json`, `stable-api-snapshot.json`, and `compatibility-matrix.json`. A release must not silently reclassify a stable surface downward to make a breaking change pass.

If code calls `stableStringify`, migrate to `canonicalStringify`; the compatibility alias remains available with a bounded deprecation warning. The deprecation metadata states the replacement and earliest eligible removal.

Future compatibility notes must distinguish additive changes, preview/experimental breakage, and stable-surface deprecations. Public release history starts at v0.50.0.
