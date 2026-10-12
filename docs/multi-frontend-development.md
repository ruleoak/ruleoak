# Multi-Frontend Development

Multi-Frontend Development makes implementation producers interchangeable while preserving one RuleOak authority system.

The normal managed path remains:

```sh
ruleoak do "<desired outcome>" --implementation managed --provider <provider> --allow-network
```

For ChatGPT, another coding agent, or a human-produced candidate, use external mode:

```sh
ruleoak do "<desired outcome>" \
  --implementation external \
  --frontend chat \
  --candidate ./candidate-source.zip
```

External mode invokes **zero RuleOak planner/implementer model calls**. RuleOak deterministically derives impact/context, reviews the base-to-candidate source delta against the Intent-Driven Change allowed scope, runs Semantic Diff, executes available qualification tools, constructs Intent Evidence Authority evidence, and applies the same Development Learning-candidate policy. External implementation assertions remain non-authoritative.

If the candidate is the exact source ZIP that should be sent to an existing external qualification runner, RuleOak can preserve and submit those exact bytes:

```sh
ruleoak do "<desired outcome>" \
  --implementation external \
  --frontend chat \
  --candidate ./candidate-source.zip \
  --handoff-inbox /path/to/build-system/inbox/auto
```

RuleOak records the source ZIP SHA-256 and verifies the copied inbox artifact is byte-identical. It does not treat submission as build/device evidence; external qualification remains pending until independently observed.

## Development API

Multi-Frontend Development also exposes a bearer-token protected local API:

```sh
export RULEOAK_DEVELOPMENT_API_TOKEN='...'
ruleoak api development --dir /path/to/app --listen 127.0.0.1:7333
```

`POST /v1/development/run` accepts the same managed/external implementation choice. The API server fixes the repository root at startup; callers cannot switch it per request. Managed network access is disabled unless the server itself is started with `--allow-network`.

## Authority and token boundary

The frontend chooses only the implementation producer. Intent-Driven Change remains scope/mutation authority, Intent Evidence Authority remains evidence authority, Development Learning still requires explicit promotion, and missing device/external evidence cannot become PASS.

External mode is additionally required to report:

- RuleOak model role calls: `0`
- hosted RuleOak model calls: `0`
- RuleOak model tokens: `0`

Managed mode reports hosted model call/token usage so cost is visible rather than implicit.
