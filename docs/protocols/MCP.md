# MCP Adapter

MCP is a first-class RuleOak adapter, not the RuleOak authority model.

The current protocol path recognizes MCP `2026-07-28` as the modern stateless generation and validates self-describing `Mcp-Method` / `Mcp-Name` headers against request bodies where present. A compatibility codec remains for `2025-06-18` session-oriented deployments.

Protocol-specific behavior must remain isolated from canonical RuleOak principal, action, resource, authority, lease, and effect semantics.
