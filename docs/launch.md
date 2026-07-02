# Launch Copy

Your AI agent can delete files, run shell commands, and call tools now. Most people have no idea what it actually did until it is too late. RuleOak blocks dangerous JSON-RPC tool calls on the inbound stream before the child tool server sees them and gives you a black-box recording of every action.

```bash
npx @ruleoak/cli init
```

60 seconds, no signup.

## Tracking checklist

Track for 7 days:

- unique `init` runs from non-owner sources
- GitHub stars attributable to the launch window
- external issues/PRs/discussion
- inbound commercial interest

## Kill criteria

If by day 30 fewer than 50 external init runs, fewer than 20 launch-window stars, zero unsolicited external discussion, and zero commercial interest, stop building adapters or MCP support and re-examine the wedge.


## Pre-launch proof checks

Before posting publicly, run:

```bash
npm test
npm run check:phase5
npm run demo:agent-delete
npm run replay:demo:html
```

Manual external test to run before claiming broader MCP support:

1. Start a real third-party MCP server under `ruleoak run -- <server command>`.
2. Send a blocked `tools/call` request into its stdin.
3. Confirm the server-side tool effect does not happen.
4. Confirm RuleOak emits a JSON-RPC error response and writes hash-chained evidence.

Do not claim kernel-level syscall interception or full MCP gateway support until those are implemented and tested.
