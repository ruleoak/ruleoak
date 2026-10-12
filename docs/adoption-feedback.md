# Adoption feedback guide

RuleOak's public-preview goal is to learn whether an independent developer can protect a real tool boundary without assistance.

## The most useful feedback

1. Run the 60-second quickstart.
2. Protect one synthetic or non-production action boundary.
3. Run `ruleoak protect status` after a real MCP tool call and confirm `first_value_achieved=true`; the reserved setup probe does not count.
4. If an effect becomes ambiguous, run `ruleoak effect pending` and `ruleoak effect reconcile` and confirm no retry is executed.
5. Describe where setup, policy, approval, effect recovery, or evidence became unclear.
6. Run `ruleoak feedback snapshot --out ruleoak-adoption-snapshot.json`, review it, and optionally attach it to a external evaluation or issue.
7. Confirm whether the security boundary was understandable before reading source code.

## Quickstart feedback

Run:

```bash
npx @ruleoak/cli@0.50.0 demo quickstart
```

Then use the GitHub **Quickstart feedback** form. A failure report should include:

- operating system
- Node.js and npm versions
- RuleOak version
- sanitized command output
- the first step that did not match the documentation

## Integration feedback

For SDK, MCP, REST, or process-protection tests, use the **Compatibility report** form and include the smallest synthetic reproduction possible.

## Privacy and security

Before submitting anything publicly, remove:

- credentials and environment-variable values
- personal or customer data
- raw private prompts and tool arguments
- unredacted evidence bundles
- internal hostnames and infrastructure identifiers

Security vulnerabilities must be reported privately as described in `SECURITY.md`.

## Privacy-safe adoption snapshot

`ruleoak feedback snapshot` never uploads data. The generated JSON intentionally excludes project paths, host/user identity, prompts, tool arguments, credentials, raw evidence, and evidence hashes. It includes aggregate activation stage, first-value/repeat-use flags, protected-action counts, effect-contract coverage, unresolved-effect count, and evidence validity. External adoption remains explicitly false in the snapshot.
