# RuleOak Roadmap

## Built in this Phase 1-4 package

- three-package npm workspace
- protocol standalone package
- specificity-based policy evaluator
- hash-chained evidence recorder
- `ruleoak init`
- `ruleoak replay --verify`
- `ruleoak run -- <command>` with honest Node shim scope
- deterministic non-interactive `ruleoak demo agent-delete`
- launch README and homepage

## Next major feature, not built in this sprint

MCP server gateway interception: proxy JSON-RPC traffic over stdio/SSE and evaluate tool calls at protocol level. This fits RuleOak's Agent Action Control Plane positioning, but it is deliberately post-30-day roadmap work.
