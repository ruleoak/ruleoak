# Local approval inbox

RuleOak can generate a read-only local HTML inbox for pending and decided approvals.

```bash
ruleoak approve inbox --dir ./workspace
```

The default output is:

```text
./workspace/.ruleoak/approval-inbox.html
```

Choose another path:

```bash
ruleoak approve inbox \
  --dir ./workspace \
  --html ./approval-inbox.html
```

The inbox shows pending requests, risk, reason, timestamps, and recent decisions. Each pending request provides copyable CLI commands for `allow_once`, `deny_once`, `allow_session`, `always_allow`, and `always_block`

The page is intentionally read-only. RuleOak does not expose a state-changing HTTP endpoint, so opening the file cannot approve an action by itself. Decisions remain explicit terminal operations

Machine-readable summary:

```bash
ruleoak approve inbox --dir ./workspace --json
```
