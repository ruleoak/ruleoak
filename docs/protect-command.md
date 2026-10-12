# Guided protect command

`ruleoak protect` is the default low-friction path for guarding a local agent or MCP-style stdio process

```bash
npx @ruleoak/cli protect -- node agent.js
```

RuleOak automatically:

1. creates `.ruleoak/` with the `cautious` policy pack when no workspace exists
2. preserves an existing policy
3. runs workspace diagnostics
4. starts the child through the existing JSON-RPC gate
5. surfaces approval-required actions according to the selected approval mode
6. issues and atomically consumes one-time receipts for allowed tool calls
7. appends redacted hash-chained evidence
8. creates `.ruleoak/report.html` at exit

## Approval modes

```bash
ruleoak protect --approval-mode tui -- node agent.js
ruleoak protect --approval-mode prompt -- node agent.js
ruleoak protect --approval-mode queue -- node agent.js
ruleoak protect --approval-mode none -- node agent.js
```

- `tui` and `prompt` show the complete action and decision choices in a terminal
- `queue` writes pending records and returns an approval-required JSON-RPC error
- `none` rejects approval-required actions
- the default is interactive when a terminal is available and queue mode otherwise

The protocol stream remains on stdin/stdout. Interactive approvals read from the controlling terminal and write human-facing output to stderr so JSON-RPC stdout is not contaminated

## Learning mode

```bash
ruleoak protect --learn -- node agent.js
```

Learning mode records equivalent action groups and creates review-only suggestions. It never changes active policy automatically

## Signing

`protect` uses `RULEOAK_RECEIPT_SECRET` when set. Otherwise it looks for a RuleOak secret in the OS credential store. If neither is available, local one-time receipts are still consumed with replay markers but are unsigned

Initialize secure local signing:

```bash
ruleoak secrets init
```

## Output

The final summary reports:

- workspace and policy locations
- approval mode
- receipt handling mode
- child exit code
- evidence path
- report path
- learning summary when enabled

`protect` returns the child exit code after the guarded process exits. Authorization failures emitted through JSON-RPC continue to use the existing RuleOak decision semantics

## Boundary

`protect` inspects actions that cross its supported stream or SDK boundaries. It is not kernel-level process containment. A child that performs hidden in-process or direct system calls outside a RuleOak adapter can bypass the decision point
