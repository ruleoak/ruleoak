# One-Intent Development

One-Intent Development makes the governed development-stack engineering kernel an internal implementation detail for ordinary development.

```text
ruleoak do "<desired outcome>"
```

The one user outcome authorizes RuleOak to perform bounded engineering orchestration: deterministic impact analysis, Context Package compilation, non-authoritative model planning/implementation, Intent-Driven Change proposal review and mutation, automatic project-tool discovery, qualification execution, evidence collection, Intent Evidence Authority adjudication, and bounded repair.

## User-experience invariant

Ordinary successful use requires **zero manual intermediate RuleOak commands**. A developer does not separately run `impact`, `context`, `diff`, `verify`, construct an evidence bundle, identify source files, or invoke the discovered build/test commands.

Those commands remain available for inspection, debugging, policy customization, and CI composition.

## Authority boundaries

`ruleoak do` is an authority-bearing request to attempt the stated outcome, not an authorization for unconstrained code generation.

- Intent-Driven Change remains mutation-scope authority.
- Model planner/implementer output remains `NON_AUTHORITATIVE`.
- Semantic Diff remains semantic-change analysis.
- Automatically executed independent tools can create Intent Evidence Authority evidence.
- Missing device/runtime/external/manual evidence stays `NOT_RUN`/`UNKNOWN`.
- Repeated qualification failure, scope rejection, protected-Intent conflict, or repair-limit exhaustion stops autonomy.
- A repository without sufficient declared Intent/binding authority stops at `AUTHORITY_GAP`; RuleOak does not silently promote inferred brownfield semantics into mutation authority.

## Tool discovery

One-Intent Development can consume an explicit `.ruleoak/autonomy.json` profile, or conservatively discover common local qualification surfaces including npm scripts, Gradle, Python/pytest, Go, Rust. Commands execute without a shell and are mapped only to evidence classes RuleOak can justify from the tool contract.

## Local qualification vs hosted coding

The One-Intent Development source benchmark uses a deterministic injected implementation driver to qualify orchestration, bounded mutation, repair, automatic qualification, and evidence plumbing. This does **not** prove general coding quality. Credentialed hosted end-to-end implementation remains `NOT_RUN` in source qualification unless explicitly executed with a configured provider.
