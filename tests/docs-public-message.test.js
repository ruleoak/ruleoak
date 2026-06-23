import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";

const readme = readFileSync("README.md", "utf8");
assert.ok(readme.includes("RuleOak Core v2.2.0"), "README must label current release");
assert.ok(readme.includes("Agent Firewall + Flight Recorder"), "README must use current agentic message");
assert.ok(readme.includes("AGPL-3.0-or-later"), "README must include license");
assert.ok(readme.includes("hello@ruleoak.com"), "README must include commercial contact");
assert.equal(existsSync("docs/assets/demo/ruleoak-v2.2.0-demo.gif"), true, "current demo GIF should exist");
const gifs = readdirSync("docs/assets/demo").filter((name) => name.endsWith(".gif"));
assert.ok(gifs.includes("ruleoak-v2.2.0-demo.gif"), `v2.2.0 demo GIF should be present: ${gifs.join(", ")}`);
console.log("docs-public-message.test.js passed");
