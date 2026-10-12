# MCP integration guide

RuleOak supports selected MCP stdio and Streamable HTTP integration paths. MCP capability discovery and schema metadata are useful inputs, but they are not authority and they do not prove effect semantics.

## Stdio model

```text
MCP client ↔ RuleOak managed wrapper ↔ MCP server
```

Use the setup workflow to analyze and, where supported, apply a managed wrapper:

```bash
node packages/cli/bin/ruleoak.js protect --setup --dry-run
node packages/cli/bin/ruleoak.js protect --setup --apply
node packages/cli/bin/ruleoak.js protect check
```

For Codex-managed MCP configuration:

```bash
node packages/cli/bin/ruleoak.js protect codex add --name protected-server -- <server-command> [args...]
node packages/cli/bin/ruleoak.js protect check --require-effect-boundary
```

## Streamable HTTP model

The HTTP path must be evaluated as an actual deployment, not just a protocol label. Confirm authentication, endpoint identity, session semantics, transport behavior, and where RuleOak sits relative to the executor.

## Capability discovery

Inspector can normalize capability metadata and fingerprints so drift is visible. Treat those results as discovery evidence only.

A tool advertised as `write_file` does not automatically gain filesystem postcondition semantics. A reviewed Effect Profile must bind semantics to the actual route/resource contract.

## Protection states

- `READY_EFFECT_BOUNDARY` — interception is healthy and trusted postcondition semantics exist for the required route.
- `READY_POLICY_ONLY` — policy/interception is healthy, but effect verification is incomplete.
- `ATTENTION` — route proof, configuration, evidence or unresolved state needs operator action.

## Common mistakes

1. Assuming a client built-in is governed because an MCP server is governed.
2. Assuming all tools on a protected server have equivalent effect semantics.
3. Treating schema discovery as permission.
4. Treating transport success as the external business postcondition.
5. Exposing a local proxy on the network without adding explicit authentication/TLS controls.

## Verification checklist

Prove a deny blocks the actual MCP call, prove one-use authority rejects replay, induce malformed/timeout behavior, verify evidence output, and confirm bypass paths explicitly. If effect semantics are not known, keep the stronger effect-boundary claim disabled.
