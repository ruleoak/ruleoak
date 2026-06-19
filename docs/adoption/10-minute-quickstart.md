# 10-minute developer quickstart

Goal: show governance, approval, audit records, reports, and replay without reading the whole repository.

## 1. Install

```bash
npm install
```

## 2. Govern one tool call

```bash
npm run quickstart:01
```

Expected result: `search_docs` is allowed and evidence is recorded.

## 3. Block a dangerous command

```bash
npm run quickstart:02
```

Expected result: `delete_workspace` is blocked before execution.

## 4. Pause a risky action for approval

```bash
npm run quickstart:03
```

Expected result: `send_external_message` requires approval and receives an approval request id.

## 5. Generate an audit report

```bash
npm run quickstart:04
```

Outputs:

```text
quickstart/out/04-generate-audit-report/report.json
quickstart/out/04-generate-audit-report/report.html
```

## 6. Replay evidence

```bash
npm run quickstart:05
npm run protocol:replay quickstart/out/05-replay-evidence-bundle/evidence-bundle.json
npm run protocol:replay quickstart/out/05-replay-evidence-bundle/audit-chain.json
```

Expected result: both replay checks are valid.

## What this proves

RuleOak gives a developer a small integration surface:

```text
policy outside prompts
approval before risky execution
audit records created automatically
reports generated locally
replayable evidence bundle
```

RuleOak is an application-level tool-call governance boundary. It does not replace runtime sandboxing or claim certified compliance.
