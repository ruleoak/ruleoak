# Five-minute adoption path

This path is intentionally narrower than RuleOak's full governance surface.

## Minute 0–1: reproduce the problem

```bash
npm install
npm run demo:effect-boundary
```

You should see a lost response independently resolved to `confirmed_success → do_not_retry`.

## Minute 1–2: inspect without mutation

```bash
node packages/cli/bin/ruleoak.js protect --setup --dry-run
```

## Minute 2–4: activate a supported route

```bash
node packages/cli/bin/ruleoak.js protect --setup --apply
node packages/cli/bin/ruleoak.js protect check
```

Do not treat `READY_POLICY_ONLY` as full effect verification. Use:

```bash
node packages/cli/bin/ruleoak.js protect check --require-effect-boundary
```

when the workflow requires postcondition certainty.

## Minute 4–5: observe real value

After real MCP `tools/call` traffic crosses the boundary:

```bash
node packages/cli/bin/ruleoak.js protect value
node packages/cli/bin/ruleoak.js effect pending
```

Route probes are excluded from first-value metrics. No RuleOak account or hosted service is required.
