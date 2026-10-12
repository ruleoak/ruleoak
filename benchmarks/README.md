# RuleOak reproducible benchmarks

The benchmark suite measures authorization and evidence overhead on the machine where it runs. It is not an independent audit and does not claim production performance across other hardware.

```bash
npm run benchmark
npm run benchmark:policy
npm run benchmark:mcp
npm run benchmark:evidence
```

Use quick mode during development:

```bash
RULEOAK_BENCHMARK_QUICK=1 npm run benchmark
```

Every command prints machine-readable JSON containing Node.js version, operating system, architecture, CPU count, memory, sample sizes, percentile latencies, throughput and limitations. Redirect output when a dated local result is needed:

```bash
npm run benchmark > benchmarks/results/local-$(date -u +%Y%m%dT%H%M%SZ).json
```

Do not commit a result as a universal performance claim. A published result must identify its exact environment and command.
