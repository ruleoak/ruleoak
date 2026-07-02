# RuleOak telemetry

RuleOak does not send telemetry by default.

For the 30-day launch test, `ruleoak init` supports an explicit opt-in mode:

```bash
RULEOAK_TELEMETRY_ENDPOINT=https://example.com/ruleoak-init \
  npx @ruleoak/cli init --telemetry opt-in
```

If enabled, the ping is deliberately minimal:

```json
{
  "event": "ruleoak_init",
  "version": "0.1.0",
  "at": "<ISO timestamp>"
}
```

RuleOak does not send project path, hostname, username, policy content, evidence content, file names, tool arguments, or source code.

If `--telemetry opt-in` is not provided, no telemetry is attempted. If the environment variable is absent, the command prints that no endpoint is configured and continues normally.
