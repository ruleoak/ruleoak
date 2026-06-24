#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";

const files = [
  "agentic-stack.svg",
  "flight-recorder-lifecycle.svg",
  "mcp-permission-gateway.svg",
  "approval-dry-run-flow.svg",
  "agentic-skill-integration.svg",
  "license-boundary.svg",
  "manifest-safety-ci-flow.svg"
];

const failures = [];
function num(value) {
  return Number(String(value).replace(/\.0$/, ""));
}

for (const file of files) {
  const full = path.join("docs", "assets", "agentic-diagrams", file);
  const svg = readFileSync(full, "utf8");
  const rects = [...svg.matchAll(/<rect x="([0-9.]+)" y="([0-9.]+)" width="([0-9.]+)" height="([0-9.]+)"/g)].map((m) => ({
    x: num(m[1]),
    y: num(m[2]),
    w: num(m[3]),
    h: num(m[4])
  }));
  const paths = [...svg.matchAll(/<path d="M ([0-9.]+) ([0-9.]+) L ([0-9.]+) ([0-9.]+)"/g)].map((m) => ({
    x1: num(m[1]),
    y1: num(m[2]),
    x2: num(m[3]),
    y2: num(m[4])
  }));

  if (rects.length < 2) failures.push(`${file}: expected at least two diagram boxes`);
  if (paths.length < 1) failures.push(`${file}: expected at least one connector path`);

  for (const p of paths) {
    if (p.y2 > p.y1 && Math.abs(p.x1 - p.x2) < 2) {
      const target = rects.find((r) => p.x2 >= r.x && p.x2 <= r.x + r.w && p.y2 <= r.y && r.y - p.y2 <= 28);
      if (!target) failures.push(`${file}: vertical arrow at x=${p.x2} y=${p.y1}->${p.y2} does not point to a box top`);
    }
  }

  if (svg.includes('<path d="M 930.0 143 L 930.0 176"') && svg.includes('<rect x="55" y="182"')) {
    failures.push(`${file}: old broken public-launch layout remains: top-right vertical arrow points toward empty left-row layout`);
  }
}

const readme = readFileSync("README.md", "utf8");
for (const src of ["agentic-stack.svg", "flight-recorder-lifecycle.svg", "mcp-permission-gateway.svg"]) {
  if (!readme.includes(`docs/assets/agentic-diagrams/${src}`)) failures.push(`README.md missing ${src}`);
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, checked: files.length, note: "developer-adoption-loop.svg is checked by release readiness for existence only" }, null, 2));
