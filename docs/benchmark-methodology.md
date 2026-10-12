# Benchmark methodology

RuleOak benchmarks are intended to expose performance characteristics of the public implementation, not to create universal performance claims.

## What is measured

The repository includes local benchmarks for areas such as:

- Policy v2 decision latency and rule-count scaling;
- receipt issuance/verification;
- one-use replay rejection;
- evidence append latency;
- stdio JSON-RPC throughput;
- Streamable HTTP loopback throughput;
- malformed fragment handling;
- memory change during sustained evidence append.

Run:

```bash
npm run benchmark
npm run benchmark:policy
npm run benchmark:mcp
npm run benchmark:evidence
```

## Record the environment

A benchmark result is meaningful only with its environment. Record Node.js version, OS/platform, architecture, CPU, memory, filesystem/storage characteristics, sample count, benchmark options, and whether durability features such as `fsync` were enabled.

## Interpret percentiles correctly

p50 describes the middle observed result. p95 and p99 describe the slower tail in that run. None of them automatically predicts production latency when remote services, real filesystems, network contention or different policies are involved.

## Distinguish microbenchmarks from end-to-end performance

A policy decision microbenchmark isolates a narrow implementation cost. It does not include provider latency, approval latency, external API execution, or postcondition checks unless the benchmark explicitly says so.

## Regression use

Benchmarks are most useful for comparing the same workload and environment across revisions. Treat large regressions as investigation triggers, not proof of a user-visible defect without additional evidence.

## Publication rule

Do not advertise a benchmark number as a general product promise unless the measurement method, environment, workload and limitations are published with it.
