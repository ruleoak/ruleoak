# Test Output Hygiene Patch

This patch keeps the expected fail-closed policy-validation tests, but suppresses their production-style `CRITICAL CONFIGURATION ERROR` console output during `npm test`.

Why this matters:

- The negative tests are correct: invalid policy configuration must fail closed before the child process starts.
- The previous test run passed, but printed scary error banners that looked like a broken release.
- The patched tests capture `console.error` only inside the expected-negative assertions and still verify that the critical error path was exercised.

Validation commands:

```bash
npm install --ignore-scripts
npm test
python3 scripts/check_ruleoak_licensing.py
npm run check:phase1-4
npm run check:phase5
```

Expected output now includes:

```text
protocol tests passed
core evaluator tests passed
core recorder tests passed
core performance tests passed
cli tests passed
stream gate tests passed
root tests passed
RuleOak licensing check PASSED.
phase 1-4 structural check passed
phase 5 structural check passed
```

It should not print `CRITICAL CONFIGURATION ERROR` during a normal test run.
