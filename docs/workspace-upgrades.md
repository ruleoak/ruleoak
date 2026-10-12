# Workspace installation and upgrades

RuleOak records local workspace metadata in `.ruleoak/workspace.json`.

Inspect a workspace:

```bash
ruleoak workspace status --dir ./workspace
```

Machine-readable status:

```bash
ruleoak workspace status --dir ./workspace --json
```

Preview an upgrade:

```bash
ruleoak workspace upgrade --dir ./workspace
```

Apply after review:

```bash
ruleoak workspace upgrade --dir ./workspace --yes
```

The upgrade command:

- creates missing RuleOak directories
- creates a backup of policy and workspace metadata
- migrates a valid legacy policy to Policy v2
- refreshes restrictive local permissions where supported
- updates the recorded RuleOak version

Backups are stored under:

```text
.ruleoak/backups/upgrade_<timestamp>/
```

The command does not delete approval, evidence, receipt-consumption, or policy-history records
