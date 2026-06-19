# MCP proxy safety checks

RuleOak Core includes safety checks around MCP-style tool calls.

The expected behavior remains:

- safe read-only tools are forwarded
- external communication is approval-required
- destructive tools are blocked
- unsupported JSON-RPC methods are rejected
- the local proxy server exposes only local test endpoints in the demo

This is a local developer-preview proxy, not a production network gateway.
