# RuleOak Inspector for VS Code

The public `extensions/vscode-ruleoak` extension is a thin local distribution layer over RuleOak CLI. It is intentionally not a second authority engine.

## Trust boundary

- detects likely MCP/config files by filename/path only until the user chooses one to inspect;
- invokes a local RuleOak CLI using `spawn()` with an argument array and `shell: false`;
- performs no HTTP/network request in extension code;
- does not auto-install RuleOak;
- does not upload prompts, source, configuration contents, credentials, or evidence;
- opens Flight Control by starting the local CLI in a visible terminal.

## Marketplace owner flow

Create the `ruleoak` publisher, package with the current official `@vscode/vsce` tooling, inspect the resulting VSIX, then publish. Validate that `package.json` repository/homepage/license links point to the canonical public repository before publication.
