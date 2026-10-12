/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('./index.mjs', import.meta.url))
const run = spawnSync(process.execPath, [script], { encoding: 'utf8' })
assert.equal(run.status, 0, `minimal SDK example failed\n${run.stdout}\n${run.stderr}`)
assert.match(run.stdout, /hello from a guarded function/)
assert.match(run.stdout, /decision: allow/)
assert.match(run.stdout, /grant consumed: yes/)
console.log('minimal Node.js SDK example passed')
