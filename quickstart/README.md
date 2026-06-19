# RuleOak Developer Adoption Quickstarts

These examples are intentionally small. They help a new developer understand RuleOak before reading the full documentation.

Run everything:

```bash
npm run quickstart:all
```

Or run one step at a time:

```bash
npm run quickstart:01   # govern one tool call
npm run quickstart:02   # block a dangerous command
npm run quickstart:03   # require approval
npm run quickstart:04   # generate JSON/HTML audit report
npm run quickstart:05   # replay evidence bundle and audit chain
```

What the sequence proves:

1. RuleOak can be added at the tool-call boundary.
2. Policy is outside the prompt.
3. Dangerous actions can be blocked before execution.
4. Risky actions can require approval.
5. Audit records and evidence bundles are replayable.

Public-release note: the latest public GitHub release remains **v2.1.0**. These quickstarts are RuleOak Core v2.1.0 adoption assets for a future release.
