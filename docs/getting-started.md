# Getting started with RuleOak

RuleOak's first job is simple: put a trustworthy execution boundary around a supported consequential agent/MCP action so a lost response does not become a blind retry.

## 1. See the failure mode

```bash
npm install
npm run demo:effect-boundary
```

The demo writes a file, deliberately loses the execution response, verifies the file digest from external state, and returns `confirmed_success → do_not_retry` without issuing a duplicate write.

## 2. Inspect existing MCP configuration

```bash
ruleoak protect --setup --dry-run
```

This is read-only discovery. It does not claim protection is active.

## 3. Activate a supported stdio MCP boundary

```bash
ruleoak protect --setup --apply
ruleoak protect check
```

`protect check` refreshes the route proof and reports either `READY_EFFECT_BOUNDARY`, `READY_POLICY_ONLY`, or `ATTENTION`.

For Codex, add a new MCP registration through RuleOak:

```bash
ruleoak protect codex add --name protected-server -- <server-command> [args...]
ruleoak protect check --require-effect-boundary
```

RuleOak only governs traffic that actually crosses the managed boundary. It does not claim to control built-in agent tools or side channels that bypass it.

## 4. Understand effect coverage

A policy decision answers **may this execute?** Effect verification answers **what actually happened?**

Automatic effect verification requires trusted semantics. RuleOak currently has built-in local filesystem contracts for supported shapes and can accept explicit reviewed profiles. Unknown/custom tool semantics remain unverified.

See [`effect-profiles.md`](effect-profiles.md).

## 5. Operate uncertain effects

```bash
ruleoak effect pending
ruleoak effect reconcile --limit 20
ruleoak effect retry-plan --id <effect-id>
```

These commands never replay the original action. A retry still requires fresh authority.

## 6. Integrate the SDK when you own the tool registry

```bash
npm install @ruleoak/core @ruleoak/protocol
```

Use the guarded execution surface so exact authorization, one-use authority, effect receipt, postcondition verification and retry disposition stay in one chain.

## 7. Verify evidence and release state

```bash
ruleoak record verify
ruleoak protect value
ruleoak release collect --out candidate.json
```

## Next documents

- [Effect Profiles](effect-profiles.md)
- [Effect verification and safe retry](effect-verification-safe-retry.md)
- [MCP Streamable HTTP](mcp-streamable-http.md)
- [Security boundary](security/BOUNDARY.md)
- [Standards and benchmarks](standards-and-benchmarks.md)
