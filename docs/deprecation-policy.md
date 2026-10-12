# Deprecation policy

A deprecated public surface must remain functional while it is deprecated, identify a replacement when one exists, carry machine-readable `since`, warning code and earliest-removal metadata, and be documented in release notes.

For **stable** surfaces, removal requires at least two subsequent minor releases after deprecation and cannot occur before the documented earliest-removal release. Preview/experimental removals may use a shorter window when necessary, but still require explicit migration guidance. Security fixes may narrow behavior sooner when preserving behavior would be unsafe; the release must state that exception.

Runtime warnings must be deterministic and bounded. RuleOak emits a deprecation warning at most once per process for a deprecated API call path.

In v0.50.0, `@ruleoak/core.stableStringify` is deprecated in favor of `canonicalStringify`. The alias remains functional and emits `RULEOAK_DEP_STABLE_STRINGIFY` once per process.
