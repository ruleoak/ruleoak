# RuleOak Core v2.1.0 Public Release

RuleOak Core v2.1.0 should stay narrow, developer-first, and evidence-backed.

## Launch message

> RuleOak adds governance to AI tool calls: policy before execution, approval for risky actions, evidence records, replayable audit trails, and local-first reports.

Avoid broad claims such as "complete AI governance platform", "compliance certified", "agents are safe", or "enterprise ready" unless a specific deployment has validated those claims.

## Recommended external user path

1. Read the top of `README.md`.
2. Run `npm install`.
3. Run `npm run quickstart:all`.
4. Run `npm run adoption:real-frameworks`.
5. Open the generated reports.
6. Run `npm run protocol:kit` or `npm run integrity:verify` for verification-oriented use cases.

## Commands

```bash
npm install
npm run launch:check
npm run release:public-check
npm run quickstart:all
npm run adoption:check
npm run protocol:kit
npm run integrity:verify
npm test
```

## Output to show users

The launch demo should show three decisions:

- safe read action → allowed;
- risky external action → approval required;
- destructive action → denied before execution.
