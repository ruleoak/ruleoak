# Compatibility matrix

RuleOak is pre-1.0 software. This matrix distinguishes behavior verified in automated tests from behavior reported by independent users.

## Runtime support

| Environment | Status | Validation |
|---|---|---|
| Node.js 22 LTS | Tested | Full publish-readiness suite on Linux CI |
| Node.js 24 LTS | Tested | Full Linux suite plus macOS and Windows smoke tests |
| Node.js 26 Current | Compatibility signal | Full Linux publish-readiness suite; production use should prefer an LTS line |
| ESM projects | Tested | Public packages expose ESM entry points |
| CommonJS `require()` | Not supported | Use ESM or dynamic `import()` |

## Integration paths

| Integration path | Status | Boundary |
|---|---|---|
| Node.js `createRuleOak()` SDK | Tested | Calls explicitly routed through guarded functions or tools |
| CLI `protect` | Tested for supported stdio traffic | Does not inspect arbitrary internal subprocess behavior |
| MCP stdio | Fixture-tested | JSON-RPC `tools/call`, lifecycle messages, notifications, and batches |
| MCP Streamable HTTP | Fixture-tested | Authorized requests and supported SSE responses |
| REST authorization API | Tested locally | Loopback by default; non-loopback mode requires explicit authentication |
| OpenAI-style tool-call adapter | Unit-tested | Normalization and authorization only; it is not an OpenAI network client |
| Shell, filesystem, and HTTP adapters | Unit-tested | Application-layer normalization and policy checks |

## Security properties exercised in tests

- deny and approval decisions stop guarded execution
- malformed supported protocol input fails closed
- one-time execution grants reject replay
- policy changes invalidate bound receipts
- evidence events form a verifiable hash chain
- evidence bundles verify declared file digests
- persistent approval choices require explicit review
- built-in policy packs are present after npm installation

## Not claimed

RuleOak does not currently claim:

- universal MCP client or server compatibility
- operating-system containment
- compatibility with actions that bypass RuleOak
- complete prompt-injection detection
- tamper-proof evidence against a privileged local attacker
- independent security certification

## Report an integration

Use the GitHub **Compatibility report** issue form. Include:

- RuleOak and Node.js versions
- client, server, or framework version
- integration path and transport
- sanitized reproduction steps
- expected and observed authorization behavior

Do not include secrets, raw private evidence, access tokens, or customer data.
