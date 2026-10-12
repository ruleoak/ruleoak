# Performance and limits

Run the public benchmark suite on the target host:

```bash
npm run benchmark
npm run benchmark:policy
npm run benchmark:mcp
npm run benchmark:evidence
```

The JSON output includes p50, p95 and p99 latency, throughput, sample count, Node.js version, platform, architecture, CPU count, memory and explicit limitations.

Measured areas:

- Policy v2 decision latency and rule-count scaling
- receipt issuance and verification
- one-time replay rejection
- evidence append latency
- stdio JSON-RPC throughput
- Streamable HTTP loopback throughput
- malformed fragment handling
- memory delta during sustained evidence append

These are local microbenchmarks. They are not an independent audit and must not be generalized across filesystems, CPUs, upstream services or network conditions. Production evidence uses `fsync` by default; the isolated evidence microbenchmark reports when it disables `fsync` to separate CPU and append overhead.
