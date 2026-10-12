# RuleOak troubleshooting

## `protect check` reports `READY_POLICY_ONLY`

The route is intercepted and policy can be enforced, but trusted postcondition semantics are not available for at least one protected action.

Actions:

1. inspect the affected route/tool identity;
2. confirm whether a built-in Effect Profile applies;
3. add/review an explicit Effect Profile only when you can define the real external postcondition;
4. keep retry behavior conservative until effect semantics are established.

Do not “fix” this state by mapping a generic tool name to strong semantics without provenance.

## `protect check` reports `ATTENTION`

Inspect configuration, route proof, stale state and unresolved effects:

```bash
ruleoak protect status
ruleoak effect pending
ruleoak record verify
```

Resolve the actual cause before treating the boundary as ready.

## An effect is unresolved

Run bounded reconciliation:

```bash
ruleoak effect show --id <effect-id>
ruleoak effect reconcile --limit 20
ruleoak effect retry-plan --id <effect-id>
```

Reconciliation does not replay the original action. If the effect is still ambiguous, investigate the external system manually or improve the Effect Profile/observation path.

## A retry is recommended

A safe-to-retry result does not reuse the prior lease. The caller must obtain fresh authority for the new attempt.

## The evidence chain does not verify

Stop treating the affected evidence as trustworthy until the mismatch is understood. Check whether files were copied, truncated, manually edited or generated from a different workspace/source identity.

## MCP traffic bypasses RuleOak

RuleOak cannot govern a route it does not own. Confirm the client configuration actually launches/connects through the RuleOak wrapper/proxy rather than directly to the server.

## SDK code appears to authorize but an unguarded call still executes

A developer can retain a reference to an unguarded executor. Ensure the application invokes only the guarded function/tool path for consequential operations.

## The source manifest fails after copying files

Hidden directories such as `.github/` and `.ruleoak/` are part of the source tree. Avoid copy commands or Finder workflows that omit dotfiles. Use a clean extraction/clone and verify the manifest before debugging individual files.

## `npm run qualify` takes a long time

The aggregate gate intentionally runs many focused checks. On constrained environments, run constituent gates to isolate failures. Do not label an aggregate timeout as PASS; preserve completed focused results separately.

## Need more information

Include the RuleOak version, Node.js version, operating system, integration path, sanitized command/output and whether the issue is authorization, transport, effect verification, evidence or packaging related. Do not include secrets or private evidence.
