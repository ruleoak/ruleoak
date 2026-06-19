import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function parseListArg(name, fallback = []) {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (!found) return fallback;
  const value = found.slice(prefix.length).trim();
  if (!value) return fallback;
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function parseStringArg(name, fallback = null) {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (!found) return fallback;
  return found.slice(prefix.length).trim() || fallback;
}

export function loadScenario(rootDir, fallbackPath = "configs/policy-test-scenarios.example.json") {
  const scenarioPath = parseStringArg("scenario", fallbackPath);
  return JSON.parse(readFileSync(join(rootDir, scenarioPath), "utf8"));
}

export function writeJsonReport(rootDir, relativePath, report) {
  const fullPath = join(rootDir, relativePath);
  mkdirSync(join(fullPath, ".."), { recursive: true });
  writeFileSync(fullPath, JSON.stringify(report, null, 2));
  return fullPath;
}

export function printDecisionTable(decisions = []) {
  for (const item of decisions) {
    const expectation = item.expectedDecision ? ` expected=${item.expectedDecision} ${item.expectationMet ? "✓" : "✗"}` : "";
    console.log(`${item.toolId}: ${item.decision} — ${item.reason}${expectation}`);
  }
}
