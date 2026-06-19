# Protocol v1 Hardening Example

This example creates a realistic SRE monitoring threshold-change evidence bundle:

1. run record;
2. Jira-style evidence record;
3. policy decision requiring approval;
4. approval record;
5. append-only audit chain;
6. redaction manifest;
7. replay-verifiable evidence bundle.

Run:

```bash
node examples/protocol-v1-hardening/run.js
npm run protocol:replay examples/protocol-v1-hardening/out/evidence-bundle.json
npm run protocol:replay examples/protocol-v1-hardening/out/audit-log.json
```
