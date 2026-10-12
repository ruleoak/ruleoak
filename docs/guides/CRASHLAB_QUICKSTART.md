# CrashLab Quickstart

Run `ruleoak crashlab run --scenario scenarios/reliability/ambiguous-create-timeout.json`. The included scenario intentionally demonstrates duplicate effects after an ambiguous timeout and should return FAIL. The idempotent companion scenario should PASS.
