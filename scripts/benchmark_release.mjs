/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { execFileSync } from 'node:child_process';
const standards = execFileSync(process.execPath, ['scripts/check_standards_baseline.mjs'], { encoding: 'utf8' }).trim();
const performance = JSON.parse(execFileSync(process.execPath, ['benchmarks/run.mjs', 'all', '--quick'], { encoding: 'utf8', env: { ...process.env, RULEOAK_BENCHMARK_QUICK: '1' } }));
console.log(JSON.stringify({
  benchmark_suite: 'ruleoak-release-readiness',
  benchmark_version: '1.0',
  standards_check: standards,
  performance,
  non_claim: 'Local microbenchmarks and source-level standards checks are not independent certification or universal production performance claims.'
}, null, 2));
