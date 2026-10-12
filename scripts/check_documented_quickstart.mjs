/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)))
const cli = join(repo, 'packages/cli/bin/ruleoak.js')
const workspace = mkdtempSync(join(tmpdir(), 'ruleoak-quickstart-'))

try {
  const run = spawnSync(process.execPath, [cli, 'demo', 'quickstart'], {
    cwd: workspace,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' }
  })
  assert.equal(run.status, 0, `quickstart failed\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`)
  const output = `${run.stdout}\n${run.stderr}`
  assert.match(output, /RuleOak demo: permission-manager/)
  assert.match(output, /allow/i)
  assert.match(output, /needs_approval/i)
  assert.match(output, /deny/i)

  const demo = join(workspace, '.ruleoak-demo-output/permission-manager/.ruleoak')
  const evidence = join(demo, 'evidence.jsonl')
  assert.ok(existsSync(evidence), 'quickstart must create evidence.jsonl')
  assert.ok(existsSync(join(demo, 'pending')), 'quickstart must create the approval queue')
  const events = readFileSync(evidence, 'utf8').trim().split(/\r?\n/).filter(Boolean)
  assert.ok(events.length >= 3, 'quickstart must write multiple evidence events')
  for (const line of events) JSON.parse(line)
  console.log('documented quickstart check passed')
} finally {
  rmSync(workspace, { recursive: true, force: true })
}
