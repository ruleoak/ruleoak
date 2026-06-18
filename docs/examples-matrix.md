# Examples Matrix

RuleOak includes two first-launch demos to show that the governed-agent pattern is not tied to one domain.

| Example | Domain shape | Main question | Core pattern shown | Run command | Output |
|---|---|---|---|---|---|
| Technical Consultant Demo | Action-oriented case analysis | What happened, what evidence supports it, and what action needs approval? | evidence → probable cause → recommended action → policy decision → approval boundary → audit-style report | `npm run example:consultant` | `examples/technical-consultant-demo/out/case-report.json` |
| Research Brief Demo | Non-IT evidence review | What do the sources support, what is uncertain, and what requires approval before publishing? | sources → claims → confidence → known unknowns → recommendation → publication approval boundary | `npm run example:research` | `examples/research-brief-demo/out/research-brief-report.json` |

## Optional local LLM paths

| Example | Local LLM command |
|---|---|
| Technical Consultant Demo | `npm run example:consultant:llm` |
| Research Brief Demo | `npm run example:research:llm` |

Before using a local LLM:

```bash
npm run llm:doctor
npm run llm:pull
npm run llm:smoke
```

## Why two demos?

A single technical demo can make RuleOak look domain-specific. Two demos show the abstraction:

```text
policy boundary
+ evidence quality
+ approval decision
+ audit-style record
```

The demos are intentionally synthetic and small. They are not production systems.

| Python Bridge | `examples/python-bridge/generic_bridge_sample.py` | Python SDK bridge private preview for RuleOak Core v1.0-compatible governance records | Python app integration |
