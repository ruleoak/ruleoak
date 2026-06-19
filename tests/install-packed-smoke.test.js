import { execFileSync } from 'node:child_process';

const output = execFileSync('node', ['scripts/install-packed-smoke.js'], { encoding: 'utf8' });
const parsed = JSON.parse(output);
if (!parsed.ok) throw new Error('install smoke failed');
if (parsed.importCheck.protocol !== 'ruleoak.governance.v1') throw new Error('protocol import failed');
if (!parsed.tarball.includes('2.1.0')) throw new Error('tarball should be v2.1.0');
console.log('install-packed smoke test passed');
