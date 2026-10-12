# Validation Hardening

Validation Hardening strengthens falsification, adversarial testing, evidence identity, provider realism, scale, and external-validation truth boundaries across the Intent-Verified Development stack.

## Local release gates

- Frozen semantic qualification is versioned independently of the implementation. Later behavior changes require a new frozen benchmark version; they do not rewrite the old corpus.
- An adversarial semantic corpus tests negation, strengthening language, false-friend vocabulary and unrelated changes.
- Context packages label repository slices `UNTRUSTED_REPOSITORY_CONTENT`, set `instruction_authority=false`, and redact credential-like values before emission.
- Intent Evidence Authority evidence observations may carry Ed25519 signed-digest attestations. A trusted key and producer identity match upgrades an observation to `ATTESTED`; an invalid supplied attestation makes the observation non-independent. Unattested legacy evidence remains `DECLARED` independence for backward compatibility.
- Model-Independent Execution provides OpenAI Responses, Anthropic Messages and Google Gemini hosted adapters. Model output remains non-authoritative.
- A synthetic 100,000-file / 400,000-relationship scale check exercises validation data structures without claiming a production-repository SLO.

## External gates intentionally not claimed locally

The source tree contains runnable targets/harnesses for ten unrelated public repositories, repeated same-model context A/B, a truly blind holdout and GitHub PR Observe integration. Source qualification records these as `NOT_RUN` until independently executed.

Validation Hardening therefore strengthens the evidence model while explicitly preserving the distinction between local regression proof and external validation.
