# Deployment patterns

RuleOak is not a hosted control plane. v0.50.0 is designed around local or application-owned cooperating boundaries. Choose the narrowest pattern that actually intercepts the action you care about.

## Pattern 1: in-process Node.js SDK

Use the SDK when you own the tool/function registry and can require consequential calls to pass through a guarded wrapper.

```text
agent/workflow
    ↓
guarded function/tool
    ↓
RuleOak core
    ↓
your executor
```

This gives the application the clearest control over normalized identity, policy, approval, execution lease, result capture, and effect observation. The limitation is equally clear: a function called outside the wrapper is not governed.

## Pattern 2: MCP stdio wrapper

Use the managed stdio path when an MCP client launches a local MCP server and you can interpose RuleOak between them.

```text
MCP client ↔ RuleOak wrapper ↔ MCP server
```

This is useful for local agent tooling. Protection applies to traffic through the managed route only. Client built-ins, unrelated servers, or direct side channels remain outside the boundary.

## Pattern 3: MCP Streamable HTTP proxy

Use the HTTP path when the MCP server is reached over a supported Streamable HTTP route and the proxy assumptions match your deployment.

Important questions include:

- where authentication is terminated;
- whether the endpoint is loopback-only or network exposed;
- whether session/stream behavior matches the supported contract;
- whether effect semantics can be bound to the actual operation/resource rather than a generic tool name.

## Pattern 4: local REST authorization service

Use the loopback REST authorization API when another local runtime needs RuleOak policy/authority decisions but cannot embed the Node.js SDK.

Loopback is the conservative default. A non-loopback deployment changes the threat model and requires explicit transport authentication, authorization and network security outside RuleOak.

## Pattern 5: operator CLI

The CLI is the operator surface for setup, inspection, capability drift, approval workflows, effect reconciliation, evidence verification, CrashLab, and release diagnostics. It is not itself magical interception: the underlying execution path still has to cross a protected route.

## Pattern selection table

| Need | Recommended pattern |
|---|---|
| You own the Node.js executor | SDK |
| Local MCP server launched by client | MCP stdio wrapper |
| Supported MCP HTTP endpoint | Streamable HTTP proxy |
| Non-Node local runtime needs decisions | Loopback REST |
| Setup, diagnostics and reconciliation | CLI alongside one of the above |

## Production boundary checklist

Before calling a route protected, answer all of these:

1. Which exact execution path is intercepted?
2. How is the operation/resource normalized?
3. What can bypass the boundary?
4. What creates and consumes the one-use `ExecutionLease`?
5. What observation becomes the `EffectReceipt`?
6. Is there a reviewed `Effect Profile` for the actual route semantics?
7. What happens on timeout, restart, stale policy, revocation and concurrent retry?
8. Where is local evidence stored and how is it verified?

If any answer is unknown, expose that limitation instead of promoting the route to a stronger protection state.
