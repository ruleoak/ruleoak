# Candidate Acceptance Review

Candidate Acceptance Review turns the existing `ruleoak dev` verification result into one operator-facing acceptance review. It does not add a second verifier and it does not change Intent Evidence Authority evidence authority, Intent-Driven Change scope authority, Development Learning promotion, or Multi-Frontend Development external/managed producer selection.

Run the normal Chat/external flow:

```bash
ruleoak dev ./candidate-source.zip --intent "fix the playback regression"
```

The default terminal result now leads with a decision and then shows:

- changed behavior and affected capabilities;
- protected checks that did not pass;
- evidence requirements that remain missing or unknown;
- semantic/scope/qualification unknowns;
- deterministic next actions;
- aggregate local review facts such as review duration, changed-file count and RuleOak model usage.

`VERIFIED_FOR_DECLARED_SCOPE` means the available baseline-owned evidence passed for the declared scope. It is not a universal correctness claim. In particular, semantic-diff runtime effect remains `UNKNOWN` unless independently established by the relevant evidence path.

## Privacy-safe activation snapshot

Use an explicit output path when you want a small review-before-share adoption record:

```bash
ruleoak dev ./candidate-source.zip \
  --intent "fix the playback regression" \
  --activation-out ./ruleoak-dev-activation.json
```

The activation snapshot contains aggregate local review counts and timing only. It excludes repository/candidate paths, source code, prompt/intent text, usernames/hostnames, credentials, raw test output and source hashes. No upload occurs. The snapshot includes empty self-report fields for false-alert/usefulness feedback; RuleOak does not infer those values.

## Evidence boundary

The source implementation can record time-to-review and local aggregate outcomes, but the external acceptance criteria still require real developer observation. This source does not claim that five independent developers completed the flow, that false-alert targets were met, that users repeated the workflow, or that external adoption exists.
