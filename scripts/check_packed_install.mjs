/*
 * Copyright © 2026 RuleOak Pte. Ltd.
 * SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const temp = mkdtempSync(join(tmpdir(), 'ruleoak-packed-install-'))
const packs = join(temp, 'packs')
const consumer = join(temp, 'consumer')
mkdirSync(packs, { recursive: true })
mkdirSync(consumer, { recursive: true })

function npmExecutable() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm'
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', ...options.env }
  })
  if (result.status !== 0) {
    throw new Error([
      `${command} ${args.join(' ')} failed with status ${result.status}`,
      result.stdout,
      result.stderr
    ].filter(Boolean).join('\n'))
  }
  return result.stdout
}

function packWorkspace(name) {
  const raw = execFileSync(npmExecutable(), [
    'pack', '--workspace', name, '--pack-destination', packs, '--json'
  ], { cwd: root, encoding: 'utf8' })
  const parsed = JSON.parse(raw)
  assert.equal(parsed.length, 1)
  return join(packs, parsed[0].filename)
}

try {
  const protocol = packWorkspace('@ruleoak/protocol')
  const core = packWorkspace('@ruleoak/core')
  const cli = packWorkspace('@ruleoak/cli')

  writeFileSync(join(consumer, 'package.json'), JSON.stringify({
    name: 'ruleoak-packed-install-smoke',
    private: true,
    type: 'module',
    version: '0.0.0',
    dependencies: {
      '@ruleoak/protocol': `file:${protocol}`,
      '@ruleoak/core': `file:${core}`,
      '@ruleoak/cli': `file:${cli}`
    }
  }, null, 2) + '\n')

  run(npmExecutable(), ['install', '--ignore-scripts', '--offline', '--no-audit', '--no-fund'], { cwd: consumer })

  const expectedVersion = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version
  const cliBin = join(consumer, 'node_modules', '@ruleoak', 'cli', 'bin', 'ruleoak.js')

  const version = run(process.execPath, [cliBin, '--version'], { cwd: consumer }).trim()
  assert.equal(version, expectedVersion)

  const policyPacks = run(process.execPath, [cliBin, 'policy', 'packs'], { cwd: consumer })
  assert.match(policyPacks, /cautious/)
  assert.match(policyPacks, /mcp-server-safe/)

  run(process.execPath, ['--input-type=module', '-e', "import('@ruleoak/protocol').then(m=>{if(typeof m.validatePolicy!=='function')process.exit(2)})"], { cwd: consumer })
  run(process.execPath, ['--input-type=module', '-e', "import('@ruleoak/protocol').then(m=>{for(const k of ['AUTHORITY_ENVELOPE_VERSIONS','EXECUTION_LEASE_VERSIONS','validateAuthorityGrant','validateCrashLabScenario'])if(!(k in m))process.exit(2)})"], { cwd: consumer })
  run(process.execPath, ['--input-type=module', '-e', "import { createRequire } from 'node:module'; import { readFileSync } from 'node:fs'; const require=createRequire(import.meta.url); const p=require.resolve('@ruleoak/protocol/stability/api-maturity.json'); const m=JSON.parse(readFileSync(p,'utf8')); if(m.ruleoak_release!==process.env.EXPECTED_RULEOAK_VERSION||m.one_point_zero?.declared!==false)process.exit(2)"], { cwd: consumer, env: { EXPECTED_RULEOAK_VERSION: expectedVersion } })
  run(process.execPath, ['--input-type=module', '-e', "import { createRequire } from 'node:module'; const require=createRequire(import.meta.url); const path=require.resolve('@ruleoak/protocol/schemas/policy.schema.json'); if(!path.endsWith('policy.schema.json'))process.exit(2)"], { cwd: consumer })
  run(process.execPath, ['--input-type=module', '-e', "import('@ruleoak/core').then(m=>{if(typeof m.createRuleOak!=='function'||typeof m.RuleOakExtensionRegistry!=='function'||typeof m.canonicalStringify!=='function')process.exit(2)})"], { cwd: consumer })

  const demo = run(process.execPath, [cliBin, 'demo', 'quickstart'], { cwd: consumer })
  assert.match(demo, /RuleOak demo: permission-manager/)
  assert.match(demo, /Evidence:/)

  console.log('packed-package install smoke test passed')
} finally {
  rmSync(temp, { recursive: true, force: true })
}
