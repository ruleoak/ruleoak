/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const bin=resolve(fileURLToPath(new URL('../bin/ruleoak.js',import.meta.url)));const help=spawnSync(process.execPath,[bin,'--help'],{encoding:'utf8'});assert.equal(help.status,0);assert.match(help.stdout,/evidence-bound execution safety/);assert.match(help.stdout,/protect check\|verify\|status\|value\|rollback/);assert.match(help.stdout,/effect pending/);assert.match(help.stdout,/reconcile/);assert.match(help.stdout,/--help --advanced/);assert.equal(help.stdout.includes('authority delegate'),false);const advanced=spawnSync(process.execPath,[bin,'--help','--advanced'],{encoding:'utf8'});assert.match(advanced.stdout,/authority delegate/);const demo=spawnSync(process.execPath,[bin,'demo','effect-boundary'],{encoding:'utf8'});assert.equal(demo.status,0);assert.match(demo.stdout,/confirmed_success/);assert.match(demo.stdout,/do_not_retry/);assert.match(demo.stdout,/Duplicate retry prevented: YES/);console.log('public front-door help/demo tests passed');
