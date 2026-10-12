# MCP runtime integrity

RuleOak v0.50.0 validates supported MCP protocol generation and modern `Mcp-Method` / `Mcp-Name` header/body consistency before the Streamable HTTP gateway authorizes or forwards a request. Allowed tool calls receive a one-use RuleOak ExecutionLease which is consumed before forwarding.

An optional MCP Capability Pin can bind the gateway to an Inspector Capability Manifest. Pinned mode rejects tool names outside that inspected surface and can reject a supplied current manifest when its fingerprint differs. A pin does not magically prove that a remote server has not changed unless current capability evidence is refreshed and compared.

The HTTP gateway records only a `partial` EffectReceipt for the upstream request/response boundary: an HTTP response does not independently prove every remote business side effect.
