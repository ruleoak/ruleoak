/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const raw=execFileSync(process.execPath,['benchmarks/run.mjs','all','--quick'],{encoding:'utf8',env:{...process.env,RULEOAK_BENCHMARK_QUICK:'1'}});
const data=JSON.parse(raw);
const r=data.results;
const limits={policy_p99_ms:5,policy_1000_p99_ms:10,receipt_issue_p99_ms:5,receipt_verify_p99_ms:5,evidence_append_p99_ms:10,stdio_min_mps:250,http_p99_ms:300};
assert.ok(r.policy.decision_latency.p99_ms < limits.policy_p99_ms,`policy p99 ${r.policy.decision_latency.p99_ms}ms exceeds regression envelope`);
assert.ok(r.policy.policy_size_scaling['1000'].p99_ms < limits.policy_1000_p99_ms,`1000-rule p99 exceeds regression envelope`);
assert.ok(r.receipts.issuance_latency.p99_ms < limits.receipt_issue_p99_ms);
assert.ok(r.receipts.verification_latency.p99_ms < limits.receipt_verify_p99_ms);
assert.equal(r.receipts.replay_prevention.first_consumed,true); assert.equal(r.receipts.replay_prevention.second_rejected,true);
assert.ok(r.evidence.append_latency.p99_ms < limits.evidence_append_p99_ms);
assert.ok(r.mcp_stdio.messages_per_second > limits.stdio_min_mps,`stdio throughput ${r.mcp_stdio.messages_per_second} below regression envelope`);
assert.ok(r.mcp_streamable_http.request_latency.p99_ms < limits.http_p99_ms,`loopback HTTP p99 ${r.mcp_streamable_http.request_latency.p99_ms}ms exceeds regression envelope`);
console.log(JSON.stringify({status:'PASS',kind:'local_regression_envelope_not_universal_SLO',limits,observed:{policy_p99_ms:r.policy.decision_latency.p99_ms,policy_1000_p99_ms:r.policy.policy_size_scaling['1000'].p99_ms,receipt_issue_p99_ms:r.receipts.issuance_latency.p99_ms,receipt_verify_p99_ms:r.receipts.verification_latency.p99_ms,evidence_append_p99_ms:r.evidence.append_latency.p99_ms,stdio_mps:r.mcp_stdio.messages_per_second,http_p99_ms:r.mcp_streamable_http.request_latency.p99_ms}},null,2));
