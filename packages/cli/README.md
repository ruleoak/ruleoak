# @ruleoak/cli

RuleOak's local-first Effect Boundary CLI for supported MCP/agent routes: protect, verify route health, inspect effect coverage, reconcile uncertain outcomes, and produce evidence-safe retry decisions.

Start with:

```bash
ruleoak demo effect-boundary
ruleoak protect --setup --dry-run
ruleoak protect check
```

The CLI never claims a full Effect Boundary when only policy interception is available; `protect check` distinguishes `READY_EFFECT_BOUNDARY` from `READY_POLICY_ONLY`.

After a real protected action, inspect local value and optionally export a privacy-safe aggregate snapshot:

```bash
ruleoak protect value
ruleoak feedback snapshot --out ruleoak-adoption-snapshot.json
```

The snapshot is local-only until you choose to share it and excludes project paths, prompts, tool arguments, credentials, raw evidence, and evidence hashes.

## RuleOak Dev

```bash
ruleoak dev demo
ruleoak dev ./candidate-source.zip --intent "Implement the requested behavior"
```

`ruleoak dev` is the simplified Multi-Frontend Development external/chat candidate-verification front door. It invokes zero RuleOak coding models and retains Intent-Driven Change scope, Intent Evidence Authority evidence, and Development Learning authority.


## Experimental Intent IR v0.1

Validate or inspect an implementation-independent intent manifest locally:

```bash
ruleoak intent validate path/to/product.intent.json
ruleoak intent show path/to/product.intent.json --canonical
```

Validation is fail-closed for duplicate IDs, unknown/wrong-kind references, unsupported schema versions and undeclared core fields. No model or network access is required.

## Experimental Brownfield Understanding v0.1

```bash
ruleoak understand --out understanding.json
ruleoak explain cap.effect-boundary --graph understanding.json
ruleoak trace cap.effect-boundary --graph understanding.json --depth 2
```

Repository facts are provenance-labeled as `OBSERVED`, Intent/binding facts as `DECLARED`, and conservative derived relationships as `INFERRED`. Missing semantics remain `UNKNOWN`; the Brownfield Understanding default inference adapter is `none`.
## Semantic Impact (experimental)

```text
ruleoak impact "<proposed behavioral change>" [--dir <path>] [--graph <understanding.json>] [--out <impact.json>] [--json]
```

Semantic Impact is deterministic and local-first. It reports affected capabilities, protected Intent, implementation surfaces, evidence gaps, conflicts, uncertainty and risk. It does not modify source or claim that candidate tests are verification evidence.


## Intent Evidence Authority (experimental)

```bash
ruleoak evidence validate qa.evidence.json
ruleoak evidence status --intent app.intent.json --evidence qa.evidence.json
ruleoak verify --intent app.intent.json --evidence qa.evidence.json
ruleoak prove claim.example --intent app.intent.json --evidence qa.evidence.json
ruleoak coverage --intent app.intent.json --evidence qa.evidence.json
ruleoak contradiction --intent app.intent.json --evidence qa.evidence.json
```

Only current independent evidence can satisfy a declared evidence requirement. Model/agent assertions remain visible but non-authoritative.

### Semantic Diff (experimental)

`ruleoak diff --semantic <base> <candidate>` reports declared capability/guarantee/budget/authority change, observed implementation change, evidence invalidation, and uncertainty. Implementation-only changes remain UNKNOWN semantic effect until independently verified.

## Intent-Driven Change (experimental)

`ruleoak change "<desired outcome>"` is dry-run by default and emits a Proposed Intent Delta plus bounded implementation scope. `--apply` requires a separately produced `implementation-proposal-v0.1` bound to the exact plan. Implementer assertions never count as Intent Evidence Authority evidence; post-change Semantic Diff and Intent Evidence Authority verification remain separate authorities. See `docs/intent-driven-change.md`.


### Context Compiler (experimental)

```text
ruleoak context "improve semantic impact uncertainty analysis" --max-bytes 131072 --max-files 20 --out context.json
```

Use `--plan <change-plan.json>` to compile from an Intent-Driven Change plan. Context omission is a budgeted relevance decision, not proof of irrelevance.

## Engineering Memory (experimental)

`ruleoak memory validate <bundle.json>` validates a versioned local Engineering Memory bundle. `ruleoak memory relevant <task>` reports current matching records and regression protections. Relevant records can add planning actions/evidence requirements to `impact`, `context`, and `change`; they do not prove the current implementation.

### Model-independent execution (experimental)

Use `ruleoak model providers` to inspect adapters and `ruleoak model execute` to run a planner/implementer/reviewer/reasoning role. Model output is always non-authoritative.

## RuleOak Verify (experimental)

Use RuleOak Verify product mode by supplying change-assurance flags:

```bash
ruleoak verify --mode observe --base <base> --candidate <candidate>
ruleoak verify --mode verify --base <base> --candidate <candidate>
ruleoak verify --mode govern --base <base> --candidate <candidate>
```

Observe never blocks. Verify returns PASS only when affected governed capabilities have sufficient independent Intent Evidence Authority evidence. Govern can block unsafe or ungoverned code changes. When product flags are omitted, `ruleoak verify` retains the Intent Evidence Authority evidence-only behavior.


## OakSpec interoperability (preview)

`ruleoak oakspec export|validate|import|adapters` provides candidate-safe OakSpec 1.0 interoperability. Imports never become declared Intent or verification evidence by import alone.
