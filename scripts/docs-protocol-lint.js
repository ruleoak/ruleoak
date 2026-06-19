#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["README.md", "CONTRIBUTING.md", "SECURITY.md", "docs", "examples"];
const banned = [
  { pattern: /early compatibility contract/i, reason: "use stable compatibility contract" },
  { pattern: /premature/i, reason: "avoid weak protocol wording in public docs/examples" },
  { pattern: /RuleOak Core v1\.0/i, reason: "avoid stale public Core version references" },
  { pattern: /RuleOak Core v1\.3/i, reason: "avoid stale public Core version references" },
  { pattern: /v1\.3 boundary/i, reason: "avoid stale trust boundary wording" },
  { pattern: /early runtime/i, reason: "avoid weak runtime positioning in public docs" },
  { pattern: /early-runtime/i, reason: "avoid weak runtime stage in public docs/examples" }
];

const allow = [
  /^docs\/compatibility-matrix\.md$/,
  /^reports\//,
  /\/out\//,
  /^examples\/basic-domain-pack\//
];

function walk(target, files = []) {
  if (!statSync(target).isDirectory()) return [target];
  for (const name of readdirSync(target)) {
    if (["node_modules", ".git", "reports", "out"].includes(name)) continue;
    const path = join(target, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, files);
    else if (/\.(md|js|ts|json|py|yml|yaml)$/.test(path)) files.push(path);
  }
  return files;
}

const files = roots.flatMap((root) => walk(root)).filter((file) => !allow.some((rule) => rule.test(file)));
const violations = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const { pattern, reason } of banned) {
    if (pattern.test(text)) violations.push({ file, pattern: pattern.toString(), reason });
  }
}

if (violations.length) {
  console.error(JSON.stringify({ ok: false, violations }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, checkedFiles: files.length, bannedPatterns: banned.length }, null, 2));
