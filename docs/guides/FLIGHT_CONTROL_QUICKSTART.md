# Flight Control Quickstart

Run `ruleoak flight`. RuleOak binds to loopback only and prints a one-time local session URL. The console shows pending approvals, persisted authority artifacts, saved capability manifests, and recent Flight Recorder events.


## Create bounded authority

Initialize a local signing secret first:

```bash
ruleoak secrets init --dir .
```

Then either use the **Bounded authority** form in `ruleoak flight`, or create an envelope explicitly:

```bash
ruleoak authority create-envelope \
  --grant <grant-id> \
  --action resource.write \
  --resource 'ruleoak://file/project/src/**' \
  --ttl-minutes 15 \
  --max-executions 3 \
  --network deny
```

The requested capability must be within the signed parent grant. RuleOak stores the signed envelope in the workspace but not the signing secret.
