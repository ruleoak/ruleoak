# Local LLM Readiness

RuleOak Core includes an optional local-LLM readiness path for developers who want to run a vertical app locally.

This is useful for consultant-style workflows where private notes, logs, documents, or customer context should not be sent to a cloud model during local prototyping.

## What this does

```text
hardware check → model recommendation → Ollama pull → smoke test → consultant demo with local model
```

## Quick path

```bash
npm run llm:doctor
npm run llm:pull
npm run llm:smoke
npm run example:consultant:llm
npm run example:research:llm
```

Override the recommended model:

```bash
RULEOAK_OLLAMA_MODEL=qwen3:8b npm run llm:pull
RULEOAK_OLLAMA_MODEL=qwen3:8b npm run example:consultant:llm
npm run example:research:llm
```

## What the hardware doctor checks

- operating system
- CPU model
- CPU core count
- total RAM
- Apple Silicon hint
- NVIDIA GPU hint through `nvidia-smi`, if available
- whether `ollama` is on PATH

The recommendation is conservative. Real performance depends on CPU/GPU, memory pressure, context size, quantization, and what else is running on the machine.

## Default recommendation tiers

| RAM | Typical recommendation |
|---:|---|
| < 8 GB | `gemma3:1b` |
| 8–15 GB | `llama3.2:3b` |
| 16–23 GB | `qwen3:4b` |
| 24–47 GB | `qwen3:8b` |
| 48–95 GB | `qwen3:14b` |
| 96+ GB | `qwen3:30b` |

## Why this belongs in RuleOak

The local model is not the core value. The core value is still:

```text
policy → evidence → approval → audit
```

But for vertical apps, especially technical-consultant workflows, a local model path makes the first experience much more practical.

## Privacy note

Local runners can reduce cloud exposure, but they are not automatically risk-free. Review your model runner's logging, cloud features, cache paths, and organizational open-source policy before using real sensitive data.


## Model recommendation boundary

The hardware-based model recommendation is intentionally conservative. It is a starter path, not a benchmark and not a claim of best model quality.

Real results depend on:

- GPU/VRAM or unified memory;
- CPU generation;
- quantization;
- context length;
- token speed;
- concurrent applications;
- operating-system memory pressure;
- model family and task type.

Treat `npm run llm:doctor` as onboarding guidance, then test with your own workload.
