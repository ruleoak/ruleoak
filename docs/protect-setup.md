# Three-minute protection setup

`ruleoak protect --setup` performs bounded discovery of known local MCP configuration locations and produces a conservative protection summary without starting MCP servers or exposing config secrets.

It returns only sanitized server identity/transport data, whether hidden environment/argument material exists, declared tool counts, capability fingerprints, and starting policy recommendations. Environment values, command arguments, credentials, and URL query/user-information are not returned.

When declared tools are available, read-only tools start as `allow`, state-changing/uncertain tools as `needs_approval`, and destructive tools as `deny`. Servers without declared static tool metadata remain explicitly unknown until inspected through a live supported boundary.

Use `--dry-run` to inspect without initializing a RuleOak workspace. Without `--dry-run`, RuleOak initializes or preserves the workspace with the recommended conservative policy pack.

## Runtime activation and day-2 verification

`ruleoak protect --setup --apply` changes only supported stdio MCP configuration entries. RuleOak does not label the route active merely because JSON was rewritten: it launches the installed wrapper and sends the reserved `ruleoak/route-probe` request. The wrapper consumes that probe itself and must prove `forwarded: false` before activation is reported.

Use `ruleoak protect check` for the normal day-2 operation: it refreshes the route proof and immediately evaluates current configuration, evidence-chain integrity, unresolved effects, and trusted effect-profile coverage. `READY_EFFECT_BOUNDARY` means the selected managed routes are both currently intercepted and covered by a trusted effect profile; `READY_POLICY_ONLY` means interception/policy is healthy but at least one route lacks trusted postcondition semantics. `ruleoak protect check --require-effect-boundary` exits non-zero for the policy-only state. Use `ruleoak protect verify` when only the route proof is desired. The last full bounded verification is stored locally under `.ruleoak/protection/last-verification.json`; server-scoped checks use a separate sanitized per-server verification file so a partial check cannot overwrite the last full-route proof; `ruleoak protect status` reports route health and observed protected-action evidence. `ruleoak protect rollback` restores RuleOak-created backups. These operations do not silently expand the protected surface: an MCP route is protected only while calls actually cross that RuleOak wrapper.


## Local first-value and day-2 health evidence

`ruleoak protect status` does not treat a historical route probe as sufficient forever. It checks the current managed wrapper command/arguments against the retained activation digest, requires a fresh matching route proof, verifies the local evidence chain, and reports unresolved effects.

The same command also derives bounded local adoption signals from tamper-evident RuleOak events: real protected MCP tool-call count (the reserved route probe is excluded), final allow/deny outcomes, approval challenges, unique protected tool types, first/last protected action, active protected-use days, and the elapsed time from first verified boundary to first real protected action where both timestamps are available. `first_value_achieved` therefore means a real MCP tool call crossed the boundary; it does not mean setup merely succeeded. `repeat_use_observed` currently means protected actions were observed on at least two UTC dates.

These measurements remain in the local workspace. They are not the optional external telemetry ping described in `docs/telemetry.md` and contain no claim of company-wide or production-wide coverage.


### Full stdio Effect Boundary

A managed consequential stdio MCP `tools/call` now crosses the complete RuleOak effect sequence: final policy/approval decision → one-use `ExecutionLease` consumption → crash-safe inflight journal → one downstream dispatch → correlated JSON-RPC response observation → independent postcondition verification → retry disposition. If the child commits the side effect and exits before returning a response, RuleOak can still resolve a supported filesystem postcondition to `confirmed_success → do_not_retry`.

Automatic local filesystem effect inference is provenance-bound and deliberately narrow. A generic MCP server does not gain filesystem semantics from a tool name. RuleOak auto-recognizes the reference `@modelcontextprotocol/server-filesystem` command only when it has one or more existing configured roots; custom routes require an explicit reviewed `local-filesystem` profile and roots. It supports exact-content `write_file`, `create_directory`, file `move_file`, and `edit_file` only when every requested edit has one exact unique match. Requested paths must resolve inside the reviewed roots and their canonical resolution is retained in the verifier contract; a path that later resolves somewhere else becomes ambiguous. Symlink targets, directory moves without a content identity, oversized/unsupported content, and unfamiliar tools are not auto-certified. They remain unknown/manual until an explicit safe verifier exists.

Before dispatch, each tracked effect is journaled under `.ruleoak/effects/inflight/`. If the RuleOak boundary itself is interrupted after dispatch, `ruleoak effect reconcile` converts that inflight intent into an ambiguous receipt and reruns only the retained serializable postcondition. It never re-dispatches the original action.

### Local value evidence

`ruleoak protect value [--json]` derives a digest-bound local report from the verified Flight Recorder chain. It counts real protected calls (never route probes), decision outcomes, effect-verification states, do-not-retry dispositions, ambiguous-response resolutions, recovery after boundary restart, repeat-use days and unresolved effects. It deliberately does not claim a prevented incident or external adoption.

### Explicit effect profiles

For a reviewed custom local filesystem stdio server, run the wrapper with an explicit bounded profile:

```bash
ruleoak mcp wrap --dir . --effect-profile local-filesystem --effect-root /reviewed/root -- <server-command> [args...]
```

For a loopback Streamable-HTTP server, loopback is not semantic proof. Use the same explicit profile and roots only when the operator has reviewed that server's tool semantics:

```bash
ruleoak mcp http --upstream http://127.0.0.1:9000 --effect-profile local-filesystem --effect-root /reviewed/root
```
