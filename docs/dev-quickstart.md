# RuleOak Dev quickstart

**AI writes. RuleOak verifies.**

RuleOak Dev is the simple public front door for external candidate development. Your coding tool produces the candidate; RuleOak does not invoke a second planner or implementer model. It applies the same Intent-Driven Change scope authority, Intent Evidence Authority evidence authority, Semantic Diff semantic comparison, Context Compiler context, and Development Learning rules as the longer `ruleoak do` workflow.

## 60-second local proof

```bash
npx @ruleoak/cli@0.50.0 dev demo
```

The demo changes one bounded source file, executes the candidate's own unit test, verifies the declared evidence requirement, and reports zero RuleOak coding-model calls/tokens.

## Verify a candidate from ChatGPT, Claude, Codex, Cursor, or a human developer

From the original/base source directory:

```bash
ruleoak dev ./candidate-source.zip \
  --intent "Fix station switching without regressing Android Auto"
```

Equivalent positional form:

```bash
ruleoak dev ./candidate-source.zip \
  "Fix station switching without regressing Android Auto"
```

The command defaults to:

- `implementation = external`
- `frontend = chat`
- zero RuleOak planner/implementer model calls
- no build handoff unless configured

## Configure the build inbox once

For a local external qualification runner such as the RuleOak compatible automatic external qualification runner:

```bash
export RULEOAK_BUILD_INBOX="$HOME/AI/RuleOak/inbox/auto"
```

Then normal use becomes:

```bash
ruleoak dev ./candidate-source.zip --intent "Fix station switching"
```

If local qualification does not fail, an exact source ZIP is copied byte-for-byte to the configured inbox with digest verification. The handoff is **not** itself build/device evidence.

Disable handoff for one run with:

```bash
ruleoak dev ./candidate-source.zip --intent "Fix station switching" --no-handoff
```

## Existing power-user CLI remains supported

```bash
ruleoak do \
  "Fix station switching" \
  --implementation external \
  --frontend chat \
  --candidate ./candidate-source.zip
```

`ruleoak dev` is a compatibility-preserving wrapper over that authority path, not a second implementation engine.


## candidate-acceptance review

The same `ruleoak dev` command now leads with one candidate-acceptance review covering changed behavior, failed protected checks, missing evidence, explicit unknowns, deterministic next actions and local review facts. `VERIFIED_FOR_DECLARED_SCOPE` is bounded to the available declared evidence; it is not a universal correctness claim.

To write a separate privacy-safe aggregate activation record for review before sharing:

```bash
ruleoak dev ./candidate-source.zip \
  --intent "Fix station switching without regressing Android Auto" \
  --activation-out ./ruleoak-dev-activation.json
```

The activation file excludes repository/candidate paths, source code, prompt/intent text, usernames/hostnames, credentials, raw test output and source hashes. It stays local unless you choose to share it.
