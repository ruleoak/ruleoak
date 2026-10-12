# RuleOak developer templates

These templates are intentionally small and fail closed. Copy the nearest use case and change only the policy/resource/verifier pieces you understand.

| Template | Use case | Outcome proof |
|---|---|---|
| `filesystem-write-effect-boundary.mjs` | local file create/write | canonical root + expected content digest |
| `http-idempotency-effect-boundary.mjs` | REST/API mutation | explicit idempotency-key/postcondition probe |
| `git-commit-effect-boundary.mjs` | local Git commit | explicit Git postcondition |
| `custom-tool-fail-closed.mjs` | unsupported/custom mutation | intentionally `UNKNOWN`; never infer certainty |
| `mcp-stdio-local-filesystem.sh` | supported local filesystem MCP | reviewed effect profile + bounded root |
| `operator-recovery.sh` | unresolved-effect operations | reverify/reconcile only; never automatic retry |

For consequential operations, do not treat an HTTP status, process exit code, tool name, localhost endpoint, or missing response as proof of the external effect. Supply a trustworthy postcondition or remain `UNKNOWN`.
