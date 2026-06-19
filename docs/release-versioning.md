# RuleOak Release Versioning

RuleOak documentation uses two separate version concepts:

1. **Public GitHub release version** — what users can download from the public RuleOak Core repository.
2. **Package metadata version** — the version declared by the package being released or validated.

## Current public Core releases

| Public release | Use in docs | Meaning |
|---|---|---|
| `v1.0.1` | Earlier public baseline | Use this only when referring to the first public baseline or older functionality. |
| `v2.1.0` | Latest public Core release | Use this for all public-facing current Core guidance until a later release is actually published. |

## Unreleased RuleOak Core v2.1.0 work

Version numbers after `v2.1.0` should not be described as public releases until they are actually published.

Recommended wording:

```text
Latest public Core release: v2.1.0.
This archive contains RuleOak Core v2.1.0 public-release work toward a possible future future major release.
```

Avoid wording such as:

```text
RuleOak Core future major releases is the latest public release.
```

## Rewrite rule for public docs and website

- Replace older pre-release references such as `v1.1`, `v1.3`, `v1.8`, or `v1.9` with `v1.0.1` or feature wording.
- Replace intermediate unreleased `v2.x` references before/around the public line with `v2.1.0` or feature wording.
- Keep post-`v2.1.0` numbers only when required for internal compatibility notes and clearly mark them as unreleased future work.

## Protocol version is different

`ruleoak.governance.v1` is the governance record protocol. It is not the same as the RuleOak Core product version.

Core can move from `v1.0.1` to `v2.1.0` and later to a future release while the protocol remains `ruleoak.governance.v1`.
