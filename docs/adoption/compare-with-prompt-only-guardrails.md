# RuleOak versus prompt-only guardrails

Prompt instructions are useful, but they are not a reliable governance record.

| Concern | Prompt-only guardrail | RuleOak boundary |
|---|---|---|
| Policy location | Inside model instructions | Outside the prompt |
| Tool execution | Usually decided by agent flow | Evaluated before execution |
| Approval | Often ad hoc | Explicit approval record |
| Audit | Usually logs text | Governance records and evidence bundle |
| Replay | Difficult | Canonical replay verifier |
| Local-first use | Possible | Default pattern |

Recommended wording:

> RuleOak complements prompt guardrails by adding a policy, approval, evidence, and audit boundary around tool calls.

Do not claim that RuleOak automatically makes agents safe. It governs tool-call decisions when integrated into the action path.
