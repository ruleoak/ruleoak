# Privacy-minimized incident export

`ruleoak audit incident --out incident.zip` creates a derived support/incident artifact. It does not alter or replace the Flight Recorder evidence chain.

The exporter first verifies the original evidence chain, then emits only a strict minimal-v1 whitelist: timeline/index, safe semantic action label, decision/risk/safe rule identifier, opaque generated IDs, and a small set of numeric/boolean EffectReceipt observations. It omits raw targets, arguments, context, reasons/errors, policy/workspace contents, approvals/sessions, prompts/source content, headers/bodies, credentials and local paths.

`metadata.json` records the original evidence digest, event count and last hash so the derived timeline can be tied back to the local evidence without including that evidence. Optional HMAC signing protects the incident bundle metadata.
