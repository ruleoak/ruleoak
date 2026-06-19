#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function readJson(rel) { return JSON.parse(read(rel)); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function check(condition, name, details = '') { return { ok: Boolean(condition), name, details }; }

function walk(dir, files = []) {
  if (!fs.existsSync(path.join(root, dir))) return files;
  for (const name of fs.readdirSync(path.join(root, dir))) {
    if (['node_modules', '.git', 'reports', 'out', '__pycache__'].includes(name)) continue;
    const rel = path.join(dir, name);
    const abs = path.join(root, rel);
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) walk(rel, files);
    else if (/\.(md|html|js|json|yml|yaml|toml)$/i.test(name)) files.push(rel);
  }
  return files;
}

export function collectPublicReleaseHardening() {
  const pkg = readJson('package.json');
  const readme = read('README.md');
  const searchableFiles = ['README.md', 'RELEASE_NOTES.md', 'SECURITY.md', 'CONTRIBUTING.md', ...walk('docs'), ...walk('.github')];
  const text = searchableFiles.filter(exists).map((rel) => `
--- ${rel} ---
${read(rel)}`).join('\n');
  const required = [
    'README.md',
    'RELEASE_NOTES.md',
    'SECURITY.md',
    'CONTRIBUTING.md',
    '.github/ISSUE_TEMPLATE/bug_report.yml',
    '.github/ISSUE_TEMPLATE/question.yml',
    '.github/ISSUE_TEMPLATE/feedback.yml',
    '.github/workflows/ci.yml',
    'docs/assets/demo/ruleoak-v2.1.0-demo.gif',
    'docs/launch/README.md',
    'docs/launch/public-launch-checklist.md',
    'docs/launch/github-release-guidance.md',
    'docs/launch/package-publish-guardrails.md',
    'docs/launch/demo-sequence.md',
    'scripts/public-release-hardening-check.js',
    'tests/public-release-hardening.test.js',
    'scripts/install-packed-smoke.js',
    'tests/install-packed-smoke.test.js'
  ];
  const checks = [
    check(pkg.version === '2.1.0', 'package.json version is 2.1.0', pkg.version),
    ...required.map((rel) => check(exists(rel), `Required external release asset exists: ${rel}`)),
    check(readme.includes('RuleOak Core v2.1.0'), 'README headline uses v2.1.0'),
    check(readme.includes('Start in 10 minutes'), 'README exposes Start in 10 minutes'),
    check(readme.includes('docs/assets/demo/ruleoak-v2.1.0-demo.gif'), 'README embeds v2.1.0 demo GIF'),
    check(readme.includes('Governance Protocol v1'), 'README explains Governance Protocol v1'),
    check(readme.includes('RuleOak is not an agent orchestrator'), 'README states what RuleOak is not'),
    check(Boolean(pkg.scripts?.['release:install-smoke']), 'release install-smoke script exists'),
    check(text.includes('RuleOak adds governance to AI tool calls'), 'Launch copy includes the core message'),
    check(text.includes('Policy outside prompts') || text.includes('policy outside prompts'), 'External docs mention policy outside prompts'),
    check(text.includes('Do not say'), 'External docs include claim boundaries'),
    check(!/post-v2\.0\.3/i.test(text), 'External docs do not describe this release as post-v2.0.3'),
    check(!/development[- ]snapshot/i.test(text), 'External docs do not describe this release as development snapshot'),
    check(!/public v3\.x release/i.test(text), 'External docs do not imply public v3.x'),
    check(!/RuleOak makes agents safe/i.test(text), 'External docs avoid broad safety claim'),
    check(!/RuleOak\s+(is|provides|offers|delivers|guarantees).{0,80}compliance certified/i.test(text), 'External docs avoid affirmative certification claim'),
    check(!/production hardened for regulated use/i.test(text), 'External docs avoid production regulated-use overclaim')
  ];
  const failed = checks.filter((item) => !item.ok);
  return {
    protocol: 'ruleoak.public_release_hardening.v1',
    packageName: pkg.name,
    packageVersion: pkg.version,
    latestPublicCoreRelease: 'v2.1.0',
    previousPublicRelease: 'v2.0.3',
    earlierPublicBaseline: 'v1.0.1',
    checkedAt: new Date().toISOString(),
    summary: { total: checks.length, passed: checks.length - failed.length, failed: failed.length },
    checks
  };
}

function printHuman(report) {
  console.log('RuleOak public release hardening');
  console.log(`Package: ${report.packageName}@${report.packageVersion}`);
  console.log(`Latest public release: ${report.latestPublicCoreRelease}`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.total} passed`);
  for (const item of report.checks) console.log(`${item.ok ? '✓' : '✗'} ${item.name}${item.details ? ` — ${item.details}` : ''}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = collectPublicReleaseHardening();
  if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else printHuman(report);
  if (report.summary.failed > 0) process.exitCode = 1;
}
