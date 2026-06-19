#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

execFileSync(process.execPath, [join(process.cwd(), "examples", "approval-ux-v2", "run.js")], { stdio: "pipe" });
const outDir = join(process.cwd(), "examples", "approval-ux-v2", "out");
const required = [
  "approvals.json",
  "index.html",
  "approval-rag-sensitive-document.packet.json",
  "approval-decisions.jsonl",
  "summary.json"
];
const missing = required.filter((file) => !existsSync(join(outDir, file)));
const summary = JSON.parse(readFileSync(join(outDir, "summary.json"), "utf8"));
const ok = missing.length === 0 && summary.summary.total === 3 && summary.summary.approved === 1 && summary.summary.rejected === 1 && summary.summary.evidenceRequested === 1;
if (!ok) {
  console.error(JSON.stringify({ ok: false, missing, summary }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, checked: required.length, summary: summary.summary }, null, 2));
