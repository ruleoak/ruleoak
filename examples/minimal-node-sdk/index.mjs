/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRuleOak } from '../../packages/core/src/index.js'

const root = await mkdtemp(join(tmpdir(), 'ruleoak-minimal-sdk-'))
try {
  const publicFile = join(root, 'hello.txt')
  await writeFile(publicFile, 'hello from a guarded function\n')

  const ruleoak = await createRuleOak({
    workspace: root,
    fsyncEvidence: false,
    policy: {
      policyVersion: 2,
      defaultAction: 'needs_approval',
      rules: [{
        id: 'allow-public-local-read',
        effect: 'allow',
        priority: 100,
        actions: ['filesystem.read'],
        resources: [`${root}/**`],
        riskAtMost: 'low',
        conditions: {
          sensitivities: ['public'],
          dataFlows: ['local'],
          sideEffects: ['read_only']
        }
      }]
    }
  })

  const guardedRead = ruleoak.guardFunction({
    name: 'filesystem.read',
    category: 'file',
    operation: 'read',
    resource: ([path]) => path,
    scope: 'local',
    sensitivity: 'public',
    execute: readFile,
    resultMode: 'envelope'
  })

  const result = await guardedRead(publicFile, 'utf8')
  process.stdout.write(result.value)
  console.log(`decision: allow`)
  console.log(`evidence: ${ruleoak.evidenceFile}`)
  console.log(`grant consumed: ${result.ruleoak.consumed ? 'yes' : 'no'}`)
} finally {
  await rm(root, { recursive: true, force: true })
}
