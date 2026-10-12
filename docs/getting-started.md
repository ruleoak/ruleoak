# Getting started with RuleOak

RuleOak's first job is simple: put a trustworthy execution boundary around one supported consequential action and make retry behavior evidence-based.

## Prerequisites

Use a clean v0.50.0 source checkout and a supported Node.js runtime. Before debugging anything else, verify that hidden repository content such as `.github/` and `.ruleoak/` is present.

```bash
npm run check:bootstrap
npm run check:source-manifest
```

## 1. See the failure mode

```bash
npm run demo:effect-boundary
```

The demo writes a file, deliberately loses the execution response, verifies the file digest from external state and returns `confirmed_success → do_not_retry` without issuing a duplicate write.

## 2. Choose one action path

Start with one consequential action where you can answer:

- what is the exact operation/resource identity?
- where can RuleOak intercept it?
- what policy/approval should apply?
- can the external effect be independently observed?
- what should happen after a timeout or disconnect?

Do not begin by wrapping every tool indiscriminately.

## 3. Inspect existing MCP configuration

```bash
node packages/cli/bin/ruleoak.js protect --setup --dry-run
```

This is read-only discovery. It does not claim protection is active.

## 4. Activate a supported stdio MCP boundary

```bash
node packages/cli/bin/ruleoak.js protect --setup --apply
node packages/cli/bin/ruleoak.js protect check
```

For Codex, add a new MCP registration through RuleOak:

```bash
node packages/cli/bin/ruleoak.js protect codex add --name protected-server -- <server-command> [args...]
node packages/cli/bin/ruleoak.js protect check --require-effect-boundary
```

`protect check` reports `READY_EFFECT_BOUNDARY`, `READY_POLICY_ONLY` or `ATTENTION`.

RuleOak only governs traffic that actually crosses the managed boundary. It does not claim to control built-in agent tools or side channels that bypass it.

## 5. Understand effect coverage

A policy decision answers **may this execute?** Effect verification answers **what actually happened?**

Automatic effect verification requires trusted semantics. RuleOak includes bounded built-in profiles for supported shapes and can accept explicit reviewed profiles. Unknown/custom tool semantics remain unverified.

See [Effect Profiles](effect-profiles.md).

## 6. Operate uncertain effects

```bash
node packages/cli/bin/ruleoak.js effect pending
node packages/cli/bin/ruleoak.js effect reconcile --limit 20
node packages/cli/bin/ruleoak.js effect retry-plan --id <effect-id>
```

These commands never replay the original action. A retry still requires fresh authority.

## 7. Integrate the SDK when you own the tool registry

When npm packages are public, install:

```bash
npm install @ruleoak/core @ruleoak/protocol
```

From the source checkout, use the workspace packages/examples directly. Keep exact authorization, lease consumption, effect receipt and verification in one guarded execution path.

## 8. Verify evidence and source state

```bash
node packages/cli/bin/ruleoak.js record verify
npm test
npm run qa:auto
```

For release qualification, run:

```bash
npm run qualify
```

Do not convert an unavailable environment or timeout into PASS. Keep focused completed evidence separate from unexecuted gates.

## 9. Know when to stop

Do not call a route `READY_EFFECT_BOUNDARY` merely because policy works. If no reviewed postcondition semantics exist, `READY_POLICY_ONLY` is the correct state.

## Next documents

- [Why RuleOak](why-ruleoak.md)
- [Architecture overview](architecture/OVERVIEW.md)
- [Concepts map](concepts-map.md)
- [Use cases](use-cases.md)
- [Integration recipes](integration-recipes.md)
- [Security boundary](security-boundary.md)
- [Threat model](threat-model.md)
- [Troubleshooting](troubleshooting.md)
