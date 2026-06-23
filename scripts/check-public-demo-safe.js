import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["examples/safedesk-demo", "examples/consumer-vertical-demos", "apps/safedesk/examples/public-demo"];
const banned = [
  /NRIC\b/i,
  /passport\s*number\s*[:=]/i,
  /\b[A-Z][0-9]{7}[A-Z]\b/,
  /hello@ruleoak\.com/i,
  /real\s+address/i,
  /api[_-]?key\s*[:=]/i,
  /bearer\s+[A-Za-z0-9._-]+/i,
  /private\s+key/i,
  /guarantee\s+(visa|claim|outcome|copyright)/i
];
const allow = new Set(["scripts/check-public-demo-safe.js"]);
function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (/\.(md|js|json|txt|html)$/i.test(p)) out.push(p);
  }
  return out;
}
const failures = [];
for (const root of roots) {
  if (!existsSync(root)) failures.push(`missing ${root}`);
  for (const file of walk(root)) {
    if (allow.has(file)) continue;
    const text = readFileSync(file, "utf8");
    for (const re of banned) if (re.test(text)) failures.push(`unsafe public demo content in ${file}: ${re}`);
  }
}
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log("Public demo safety check passed");
