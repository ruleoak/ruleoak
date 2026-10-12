# Compatibility

## Runtime matrix

| Runtime | Status |
|---|---|
| Node.js 24 | Tested |
| Node.js 22 | Tested |
| Node.js 20 and earlier | Unsupported |
| Bun and Deno | Not currently claimed |
| Browser runtime | Not currently claimed |

## Operating systems

Linux is used for the full publish-readiness suite. macOS and Windows run smoke tests in CI

Filesystem permission checks are strongest on POSIX platforms. Windows uses the operating system's ACL model rather than POSIX mode bits

## Protocol compatibility

Policy v1 remains accepted during the pre-1.0 migration period. Policy v2 is recommended for new integrations

Evidence schema v2 adds identifiers and receipt digests while retaining the core action, decision, previous-hash, and hash structure

## API stability

RuleOak is pre-1.0. Documented root exports are the supported integration surface. Internal file paths, undocumented fields, and CLI text formatting can change before v1.0

Machine integrations should prefer JSON output, documented exit codes, schemas, and TypeScript declarations
