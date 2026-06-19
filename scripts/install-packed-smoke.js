#!/usr/bin/env node
import { mkdtempSync, rmSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
let tarball = null;
const temp = mkdtempSync(join(tmpdir(), 'ruleoak-install-smoke-'));
try {
  const packOutput = execFileSync('npm', ['pack', '--silent'], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  tarball = resolve(root, packOutput[packOutput.length - 1]);
  if (!existsSync(tarball)) throw new Error(`npm pack did not create tarball: ${tarball}`);
  writeFileSync(join(temp, 'package.json'), JSON.stringify({ type: 'module', dependencies: {} }, null, 2));
  execFileSync('npm', ['install', '--ignore-scripts', tarball], { cwd: temp, stdio: 'pipe' });
  const check = `
    import * as core from '@ruleoak/core';
    import { getGovernanceProtocolStatus } from '@ruleoak/core/protocol';
    const status = getGovernanceProtocolStatus();
    if (status.schemaVersion !== 'ruleoak.governance.v1') throw new Error('bad protocol');
    console.log(JSON.stringify({ ok: true, protocol: status.schemaVersion, coreType: typeof core }));
  `;
  const output = execFileSync('node', ['--input-type=module', '-e', check], { cwd: temp, encoding: 'utf8' });
  console.log(JSON.stringify({ ok: true, tarball: tarball.split('/').pop(), installDir: temp, importCheck: JSON.parse(output) }, null, 2));
} finally {
  if (tarball && existsSync(tarball)) unlinkSync(tarball);
  rmSync(temp, { recursive: true, force: true });
}
