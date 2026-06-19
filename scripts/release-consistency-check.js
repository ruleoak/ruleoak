#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['README.md', 'docs', 'examples', 'quickstart', 'protocol-conformance-kit', 'RELEASE_NOTES.md', 'SECURITY.md', 'CONTRIBUTING.md'];
const banned = [
  /RuleOak Core v1\.(?:1|2|3|4|5|6|7|8|9)/i,
  /RuleOak v1\.(?:1|2|3|4|5|6|7|8|9)/i,
  /RuleOak Core v2\.(?:2|3|4|5|6|7|8|9|10)/i,
  /RuleOak v2\.(?:2|3|4|5|6|7|8|9|10)/i,
  /v3\.1 is the latest public/i,
  /v3\.x is the latest public/i,
  /post-v2\.0\.3/i,
  /development[- ]snapshot/i,
  /public[- ]roadmap/i
];
const allow = [/^docs\/compatibility-matrix\.md$/, /^docs\/release-versioning\.md$/, /^examples\/basic-domain-pack\//];
function walk(target, files = []) {
  const stat = statSync(target);
  if (!stat.isDirectory()) return [target];
  for (const name of readdirSync(target)) {
    if (['node_modules', '.git', 'reports', 'out', '__pycache__'].includes(name)) continue;
    const path = join(target, name);
    const s = statSync(path);
    if (s.isDirectory()) walk(path, files);
    else if (/\.(md|js|json|yml|yaml)$/.test(path)) files.push(path);
  }
  return files;
}
const files = roots.flatMap((root) => walk(root)).filter((file) => !allow.some((rule) => rule.test(file)));
const violations = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const pattern of banned) if (pattern.test(text)) violations.push({ file, pattern: String(pattern) });
}
if (violations.length) {
  console.error(JSON.stringify({ ok: false, violations }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, checkedFiles: files.length, latestPublicRelease: 'v2.1.0' }, null, 2));
