#!/usr/bin/env node
import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const requiredFiles = [
  'docs/trust/README.md',
  'docs/trust/security-model.md',
  'docs/trust/agpl-commercial-boundary.md',
  'docs/trust/public-release-checklist.md',
  'docs/trust/demo-playbook.md',
  'docs/trust/claims-language.md',
  'docs/trust/validation-matrix.md',
  'RELEASE_NOTES.md',
  'SECURITY.md',
  'CONTRIBUTING.md',
  'README.md'
];

const bannedClaims = [
  /RuleOak\s+(is|provides|offers|delivers|guarantees|gives).{0,80}certified\s+compliance/i,
  /RuleOak\s+(is|provides|offers|delivers|guarantees|gives).{0,80}SOC\s*2\s+certified/i,
  /RuleOak\s+(is|provides|offers|delivers|guarantees|gives).{0,80}HIPAA\s+compliant/i,
  /RuleOak\s+(is|provides|offers|delivers|guarantees|gives).{0,80}GDPR\s+compliant/i,
  /RuleOak\s+(is|provides|offers|delivers|guarantees|gives).{0,80}EU\s+AI\s+Act\s+compliant/i,
  /RuleOak\s+(is|provides|offers|delivers|guarantees|gives).{0,80}complete\s+security\s+sandbox/i,
  /RuleOak\s+(prevents|blocks|stops).{0,80}all\s+unsafe\s+AI\s+behavior/i,
  /automatically\s+makes\s+an\s+agent\s+safe/i
];

const requiredPhrases = [
  ['README.md', 'Latest public release: **v2.1.0**'],
  ['README.md', 'RuleOak provides a tested governance boundary for tool calls'],
  ['SECURITY.md', 'application-level tool-call decision boundary'],
  ['docs/trust/README.md', 'latest public RuleOak Core release: **v2.1.0**'],
  ['docs/trust/security-model.md', 'tool calls that bypass RuleOak'],
  ['docs/trust/agpl-commercial-boundary.md', 'AGPL-3.0-or-later'],
  ['docs/trust/public-release-checklist.md', 'npm run trust:check'],
  ['docs/trust/demo-playbook.md', 'npm run coding:agent-governance'],
  ['docs/trust/claims-language.md', 'Claims to avoid'],
  ['docs/trust/validation-matrix.md', 'This matrix summarizes']
];

function walk(target, files = []) {
  const stat = statSync(target);
  if (!stat.isDirectory()) return [target];
  for (const name of readdirSync(target)) {
    if (['node_modules', '.git', 'reports', 'out'].includes(name)) continue;
    const p = join(target, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, files);
    else if (/\.(md|html|js|json)$/.test(p)) files.push(p);
  }
  return files;
}

const problems = [];
for (const file of requiredFiles) {
  if (!existsSync(file)) problems.push({ type: 'missing_required_file', file });
}

for (const [file, phrase] of requiredPhrases) {
  if (!existsSync(file)) continue;
  const text = readFileSync(file, 'utf8');
  if (!text.includes(phrase)) problems.push({ type: 'missing_required_phrase', file, phrase });
}

const scannedFiles = ['README.md', 'SECURITY.md', 'CONTRIBUTING.md', 'RELEASE_NOTES.md', 'docs']
  .filter((p) => existsSync(p))
  .flatMap((p) => walk(p));

const safeNegation = /(avoid|do not|does not|is not|not yet|not a|not an|no claim|without claiming|rather than|claims to avoid|what it does not claim|do not claim|should not be described|doesn't claim)/i;
for (const file of scannedFiles) {
  const text = readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const context = lines.slice(Math.max(0, i - 8), i + 1).join(' ');
    for (const pattern of bannedClaims) {
      if (pattern.test(line) && !safeNegation.test(context)) {
        problems.push({ type: 'banned_claim', file, line: i + 1, pattern: String(pattern) });
      }
    }
  }
}

if (problems.length) {
  console.error(JSON.stringify({ ok: false, problems }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, requiredFiles: requiredFiles.length, scannedFiles: scannedFiles.length }, null, 2));
