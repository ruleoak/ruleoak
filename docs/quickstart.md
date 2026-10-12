# RuleOak quickstart

This quickstart demonstrates the public package without requiring an existing agent or hosted service.

## Requirements

- Node.js 22 or later
- a local terminal

## 1. Run the safe demo

```bash
npx @ruleoak/cli@0.50.0 demo quickstart
```

The demo creates a temporary local workspace under `.ruleoak-demo-output/`, evaluates representative actions, and produces:

- allow, approval-required, and deny decisions
- a redacted evidence log
- an offline HTML report

The demo does not make destructive or external calls.

## 2. Get an activation plan for your project

```bash
npx @ruleoak/cli@0.50.0 onboard --init
```

Onboarding reads file/directory presence only for project detection. It reports an activation stage and the next command without reading source, prompts, or credentials.

## 3. Protect a real process

```bash
npx @ruleoak/cli@latest protect -- node agent.js
```

For an MCP server:

```bash
npx @ruleoak/cli@latest protect \
  --policy-pack mcp-server-safe \
  -- node mcp-server.js
```

RuleOak protects only supported tool-call traffic routed through the process boundary. It does not inspect arbitrary internal behavior inside the child process and is not an operating-system sandbox.

## 4. Inspect the local workspace

```bash
ruleoak doctor
ruleoak workspace status
ruleoak policy lint
ruleoak replay --verify
```

RuleOak stores local runtime state under `.ruleoak/`.

## 5. Review approvals

```bash
ruleoak approve
```

The interactive flow avoids copying approval identifiers. Persistent choices create reviewable policy suggestions rather than silently broadening policy.

## 6. Create verifiable evidence

```bash
ruleoak audit bundle --out ruleoak-evidence.zip
ruleoak audit verify-bundle --file ruleoak-evidence.zip
```

Add signing only after configuring a protected local signing secret.

## 7. Capture privacy-safe adoption evidence

```bash
ruleoak feedback snapshot --out ruleoak-adoption-snapshot.json
```

This writes aggregate activation/safety signals only. It excludes project paths, prompts, tool arguments, credentials, raw evidence, usernames, hostnames, and evidence hashes. Nothing is uploaded automatically. Review the JSON before sharing it.

## Next steps

- [Integrate with a Node.js agent](integrate-with-node-agent.md)
- [Guard MCP stdio](mcp-stdio-firewall.md)
- [Guard MCP Streamable HTTP](mcp-streamable-http.md)
- [Understand Policy v2](policy-v2.md)
- [Check tested compatibility](compatibility-matrix.md)
- [Send adoption feedback](adoption-feedback.md)
- [Read the security boundary](security-boundary.md)
