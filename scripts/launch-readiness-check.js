#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function check(condition, name, details = '') {
  return { ok: Boolean(condition), name, details };
}

export function collectLaunchReadiness() {
  const pkg = readJson('package.json');
  const readme = read('README.md');
  const requiredDocs = [
    'docs/launch/README.md',
    'docs/launch/public-launch-checklist.md',
    'docs/launch/demo-sequence.md',
    'docs/launch/github-release-guidance.md',
    'docs/launch/github-repo-settings.md',
    'docs/launch/package-publish-guardrails.md',
    'docs/launch/post-launch-feedback-loop.md',
    'docs/launch/launch-copy.md',
    'docs/adoption/10-minute-quickstart.md',
    'docs/protocol/conformance-kit.md',
    'docs/trust/security-model.md',
    'docs/trust/claims-language.md',
    'SECURITY.md',
    'RELEASE_NOTES.md',
    'CONTRIBUTING.md'
  ];
  const requiredScripts = [
    'quickstart:all',
    'adoption:check',
    'protocol:kit',
    'integrity:verify',
    'audit:viewer:v2:check',
    'release:consistency',
    'trust:check',
    'launch:check',
    'launch:summary'
  ];
  const requiredFiles = [
    ...requiredDocs,
    'scripts/launch-readiness-check.js',
    'tests/launch-readiness.test.js',
    'protocol-conformance-kit/conformance-manifest.json',
    'configs/trust/ruleoak-local-trust-root.json'
  ];
  const docsText = requiredDocs.filter(exists).map(read).join('\n');
  const checks = [
    ...requiredFiles.map((rel) => check(exists(rel), `Required launch asset exists: ${rel}`)),
    ...requiredScripts.map((scriptName) => check(Boolean(pkg.scripts?.[scriptName]), `Required launch script exists: ${scriptName}`)),
    check(readme.includes('Latest public release: **v2.1.0**'), 'README states v2.1.0 as latest public release'),
    check(readme.includes('RuleOak Core v2.1.0'), 'README labels this package as RuleOak Core v2.1.0'),
    check(readme.includes('Start in 10 minutes'), 'README exposes a 10-minute first-run path'),
    check(readme.includes('Governance Protocol v1'), 'README links protocol value clearly'),
    check(docsText.includes('RuleOak adds governance to AI tool calls'), 'Launch docs include the core launch message'),
    check(docsText.includes('Policy outside prompts') || docsText.includes('policy outside prompts'), 'Launch docs include policy-outside-prompts message'),
    check(docsText.includes('Do not say'), 'Launch docs include claim boundaries'),
    check(docsText.includes('npm run quickstart:all'), 'Launch docs include quickstart command'),
    check(!/RuleOak is compliance certified/i.test(docsText), 'Launch docs avoid affirmative certification claims'),
    check(!/RuleOak makes agents safe/i.test(docsText), 'Launch docs avoid broad safety claims'),
    check(!/RuleOak is production hardened for regulated use/i.test(docsText), 'Launch docs avoid production regulated-use overclaim')
  ];
  const failed = checks.filter((item) => !item.ok);
  return {
    protocol: 'ruleoak.public_launch_readiness.v1',
    packageName: pkg.name,
    packageVersion: pkg.version,
    latestPublicCoreRelease: 'v2.1.0',
    previousPublicBaseline: 'v1.0.1',
    releaseStatus: 'RuleOak Core v2.1.0 public release readiness',
    checkedAt: new Date().toISOString(),
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length
    },
    checks
  };
}

function printHuman(report) {
  console.log('RuleOak public launch readiness');
  console.log(`Package: ${report.packageName}@${report.packageVersion}`);
  console.log(`Public release line: ${report.latestPublicCoreRelease} (baseline ${report.previousPublicBaseline})`);
  console.log(`Checks: ${report.summary.passed}/${report.summary.total} passed`);
  for (const item of report.checks) {
    console.log(`${item.ok ? '✓' : '✗'} ${item.name}${item.details ? ` — ${item.details}` : ''}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const asJson = process.argv.includes('--json');
  const report = collectLaunchReadiness();
  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHuman(report);
  }
  if (report.summary.failed > 0) {
    process.exitCode = 1;
  }
}
