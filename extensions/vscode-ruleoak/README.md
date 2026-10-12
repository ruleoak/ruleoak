# RuleOak Inspector for VS Code

Local-first developer distribution surface for RuleOak. It detects likely MCP configuration files by path, then invokes the locally installed `ruleoak` CLI with argument-array process execution. It does not install software automatically, send telemetry, or upload source/configuration content.

## Commands

- **RuleOak: Inspect Workspace Capability Files**
- **RuleOak: Inspect Capability Manifest**
- **RuleOak: Run Doctor**
- **RuleOak: Open Flight Control**

Install the matching CLI first:

```bash
npm install -g @ruleoak/cli@0.50.0
```

Marketplace packaging/publishing is an owner action using Microsoft's supported VS Code extension publisher tooling. The repository release gate validates the extension manifest, pure model tests and source security contract; it does not claim a Marketplace publication occurred.
