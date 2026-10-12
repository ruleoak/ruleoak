# RuleOak telemetry

RuleOak is local-first. It does not send telemetry by default.

## Default behavior

`ruleoak init` writes local policy and evidence paths only. No project path, hostname, username, policy, evidence event, tool argument, prompt, or private content is sent anywhere.

## Opt-in init ping

The CLI contains a deliberately minimal opt-in initialization ping for future project-health measurement:

```bash
ruleoak init --telemetry opt-in
```

The ping is sent only if both conditions are true:

1. The user passes `--telemetry opt-in`
2. `RULEOAK_TELEMETRY_ENDPOINT` is set

The payload contains only:

- event name
- RuleOak version
- timestamp

## Local evidence is separate

Telemetry is not evidence logging. Evidence remains local under `.ruleoak/evidence.jsonl` unless the user explicitly exports or copies it.


## Local adoption/operational measurements are not telemetry

`ruleoak protect status` derives first protected action, protected action counts, active-use days, approval challenges, route health, evidence integrity, and pending-effect counts from local workspace state. Those values are never sent by the status command. They exist so a developer can determine whether RuleOak has reached real first value without enabling external telemetry.

## Shareable adoption snapshot

For a external evaluation, use `ruleoak feedback snapshot --out ruleoak-adoption-snapshot.json`. This is a local export, not telemetry. It is allowlisted to aggregate activation/safety fields and excludes project paths, usernames, hostnames, prompts, tool arguments, credentials, raw evidence, and evidence hashes. The user must review and choose whether to share the file.
