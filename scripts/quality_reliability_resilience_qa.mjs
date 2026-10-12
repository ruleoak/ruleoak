/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { readFileSync,existsSync } from 'node:fs';
import { resolve } from 'node:path';
const root=process.cwd();const errors=[];
const text=(p)=>readFileSync(resolve(root,p),'utf8');
const requireFile=(p)=>{if(!existsSync(resolve(root,p)))errors.push(`missing ${p}`);};
for(const p of ['packages/core/src/io/durable-file.js','packages/core/tests/quality-reliability-resilience.test.js','packages/cli/tests/quality-reliability-resilience.test.js','docs/quality-reliability-resilience.md'])requireFile(p);
const must=(p,needle,msg)=>{const s=text(p);if(!s.includes(needle))errors.push(`${p}: ${msg}`);};
const forbid=(p,re,msg)=>{const s=text(p);if(re.test(s))errors.push(`${p}: ${msg}`);};
for(const p of ['packages/core/src/authority/revocation.js','packages/core/src/authority/budget.js','packages/core/src/inspector/capability-history.js']){forbid(p,/appendFileSync/, 'authority/history persistence must not use appendFileSync');must(p,'atomicWriteFileSync','must use atomic durable replacement');}
for(const p of ['packages/core/src/approval/contract.js','packages/core/src/execution/lease.js','packages/core/src/decision/consumer.js'])must(p,'durableExclusiveCreateSync','one-use replay markers must be durably created');
must('packages/core/src/io/file-lock.js','holder?.host === hostname()','file locks must preserve a live local holder even after stale mtime');must('packages/core/src/io/file-lock.js','holder.token !== token','lock release must be ownership-token guarded');
must('packages/core/src/approval/provider.js','timed out after','ApprovalProvider must have a bounded callback deadline');
must('packages/core/src/protocol/recorder.js','maxEvents','evidence logs must have event bounds');must('packages/core/src/protocol/recorder.js','maxBytes','evidence logs must have byte bounds');
must('packages/core/src/authority/budget.js','Number.MAX_SAFE_INTEGER','authority budgets must reject unsafe numeric precision');
must('packages/core/src/inspector/mcp-registry.js','maxResponseBytes','Registry responses must be bounded');must('packages/core/src/inspector/mcp-registry.js','AbortSignal.timeout','Registry fetches must have deadlines');
must('packages/cli/src/inspector.js','MAX_INSPECTION_RESPONSE_BYTES','Inspector responses must be bounded');must('packages/cli/src/inspector.js','MCP endpoint URL must not contain credentials','Inspector URLs must reject credentials');
must('packages/cli/src/http-gateway.js','upstreamTimeoutMs','MCP upstream must have a deadline');must('packages/cli/src/http-gateway.js','handlerTimeoutMs','injected HTTP handlers must have a deadline');must('packages/cli/src/http-gateway.js','MAX_UPSTREAM_JSON_BYTES','mixed-batch upstream JSON must be bounded');{const gateway=text('packages/cli/src/http-gateway.js');const dispatches=(gateway.match(/await\s+proxyFetch\s*\(/g)||[]).length;if(dispatches!==1)errors.push(`packages/cli/src/http-gateway.js: MCP gateway must have exactly one awaited upstream POST dispatch path, found ${dispatches}`);if(/retryFetch|fetchWithRetry|retryRequest|automaticRetry/i.test(gateway))errors.push('packages/cli/src/http-gateway.js: MCP gateway must not introduce an automatic side-effecting POST retry helper');}
must('packages/cli/src/crashlab.js','maxScenarioBytes','CrashLab scenario inputs must be byte bounded');must('packages/cli/src/crashlab.js','maxDirectoryDepth','CrashLab recursive discovery must be depth bounded');must('packages/cli/src/inspector-registry.js','readBoundedFileSync','Registry snapshot files must be bounded');must('packages/cli/src/learning.js','readBoundedFileSync','learning state files must be bounded');must('packages/cli/src/workstation.js','512*1024*1024','bundle verification must cap input bytes before materialization');
must('packages/cli/src/secrets.js','atomicWriteFileSync','encrypted fallback secret persistence must be atomic');must('packages/cli/src/flight-control/store.js','warnings','Flight state corruption must be observable');must('packages/cli/src/flight-control/server.js','callbackTimeoutMs','Flight Control callbacks must be deadline bounded');must('packages/cli/src/flight-control/server.js','AbortController','Flight Control browser requests must be deadline bounded');
for(const p of ['packages/core/src','packages/cli/src']){}
if(errors.length){console.error(`QUALITY_RELIABILITY_RESILIENCE_QA_FAILED (${errors.length})`);for(const e of errors)console.error(`- ${e}`);process.exit(1);}console.log('QUALITY_RELIABILITY_RESILIENCE_QA_PASS');
