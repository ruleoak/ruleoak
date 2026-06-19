# Build a Vertical Workflow

RuleOak Core is designed to help developers build governed vertical workflows without starting from a blank project.

The core pattern stays the same across domains:

```text
policy → evidence → approval → audit
```

## 1. Choose a workflow shape

Start from one of the included templates:

```bash
npm run roak:init -- my-consultant --template=consultant-workflow
npm run roak:init -- my-research --template=research-workflow
npm run roak:init -- my-minimal --template=minimal-governed-workflow
```

## 2. Define policy boundaries

A good first policy answers four questions:

```text
What can the workflow read?
What can it write?
What actions are blocked?
What actions require approval?
```

Example:

```json
{
  "tools": {
    "evidence.read": "allow",
    "report.export": "allow",
    "external.send": "approval_required",
    "shell.exec": "deny"
  }
}
```

## 3. Define evidence inputs

Useful evidence can include:

- logs;
- metrics;
- documents;
- notes;
- runbooks;
- tickets;
- source references;
- structured case files.

The workflow should separate evidence from recommendation. Unsupported claims should be marked as uncertain.

## 4. Add approval gates

Risky, irreversible, external, or user-impacting actions should require explicit approval. RuleOak treats approval as a runtime state, not a prompt instruction.

## 5. Export a report

Every useful vertical workflow should generate a report that explains:

```text
what was reviewed
what evidence was used
what action was proposed
what policy decision was made
what approval was requested or recorded
what limitations remain
```

## 6. Test the workflow

Add tests that check the important guarantees:

```bash
npm test
```

Minimum test expectations:

- evidence is recorded;
- policy decisions are made outside the model;
- blocked actions are blocked;
- risky actions require approval;
- reports are generated;
- sandbox checks are enforced.

## 7. Improve the user path

Make the first run simple:

```bash
npm run launch
npm run demo
npm run report:view
```

A good RuleOak vertical workflow should be easy to run, easy to inspect, and honest about its limits.
