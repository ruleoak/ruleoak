#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const readme = readFileSync("README.md", "utf8");
const checks = [];
function check(name, ok, value = null) { checks.push({ name, ok, value }); }
check("package.json version is 2.2.0", pkg.version === "2.2.0", pkg.version);
check("README headline uses v2.2.0", readme.includes("RuleOak Core v2.2.0"));
check("README uses Agent Firewall + Flight Recorder", readme.includes("Agent Firewall + Flight Recorder"));
check("commercial licensing text present", readme.includes("hello@ruleoak.com"));
check("v2.2.0 demo GIF exists", existsSync("docs/assets/demo/ruleoak-v2.2.0-demo.gif"));
check("agentic stack diagram exists", existsSync("docs/assets/agentic-diagrams/agentic-stack.svg"));
const ok = checks.every((c) => c.ok);
const report = { ok, latestPublicCoreRelease: "v2.2.0", packageVersion: pkg.version, checks };
console.log(JSON.stringify(report, null, 2));
if (!ok) process.exit(1);
