# Guided policy authoring

RuleOak provides a preview-first command for adding Policy v2 rules.

```bash
ruleoak policy author \
  --id allow-local-public-read \
  --effect allow \
  --action filesystem.read \
  --resource './public/**' \
  --risk-at-most low \
  --data-flow local \
  --side-effect read_only \
  --sensitivity public \
  --dir ./workspace
```

The first run prints the exact rule and does not change the policy. Apply only after review:

```bash
ruleoak policy author \
  --id allow-local-public-read \
  --effect allow \
  --action filesystem.read \
  --resource './public/**' \
  --risk-at-most low \
  --data-flow local \
  --side-effect read_only \
  --sensitivity public \
  --dir ./workspace \
  --yes
```

Supported repeatable condition flags include:

```text
--category
--operation
--sensitivity
--data-flow
--side-effect
--actor-type
--scope
```

`block` is accepted as an alias for `deny`, and `approval_required` as an alias for `needs_approval`

Critical-risk permission still requires explicit `--allow-critical`
