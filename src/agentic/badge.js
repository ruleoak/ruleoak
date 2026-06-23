import { validateRuleOakManifest } from "./ruleoak-yml-standard.js";

export const BADGE_LEVELS = Object.freeze({
  recorded: { label: "recorded", requires: ["evidence"] },
  "policy-checked": { label: "policy checked", requires: ["policy"] },
  "approval-gated": { label: "approval gated", requires: ["approval"] },
  replayable: { label: "replayable", requires: ["replay"] }
});

export function generateRuleOakBadgeMarkdown(level = "recorded", { label = "RuleOak", link = "https://github.com/ruleoak/ruleoak-core" } = {}) {
  const cfg = BADGE_LEVELS[level];
  if (!cfg) throw new Error(`unknown RuleOak badge level: ${level}`);
  const message = encodeURIComponent(cfg.label);
  const badgeUrl = `https://img.shields.io/badge/${encodeURIComponent(label)}-${message}-informational`;
  return `[![${label}: ${cfg.label}](${badgeUrl})](${link})`;
}

export function verifyRuleOakBadgeClaim(level = "recorded", manifest = {}) {
  const validation = validateRuleOakManifest(manifest);
  const normalized = validation.manifest;
  const errors = [...validation.errors];
  if (!BADGE_LEVELS[level]) errors.push(`unknown badge level: ${level}`);
  if (level === "recorded" && !normalized.evidence.enabled) errors.push("recorded badge requires evidence.enabled=true");
  if (level === "policy-checked") {
    const hasPolicy = normalized.permissions.allowedActions.length || normalized.permissions.blockedActions.length || normalized.permissions.approvalRequired.length || normalized.policyPacks.length;
    if (!hasPolicy) errors.push("policy-checked badge requires declared permissions or policy packs");
  }
  if (level === "approval-gated" && !normalized.permissions.approvalRequired.length && normalized.approval.requiredForHighRisk !== true) {
    errors.push("approval-gated badge requires approvalRequired actions or requiredForHighRisk=true");
  }
  if (level === "replayable" && normalized.evidence.replayable !== true) errors.push("replayable badge requires evidence.replayable=true");
  return { ok: errors.length === 0, errors, warnings: validation.warnings, level };
}

export function badgeLevelReport(manifest = {}) {
  return Object.keys(BADGE_LEVELS).map((level) => ({
    level,
    markdown: generateRuleOakBadgeMarkdown(level),
    verification: verifyRuleOakBadgeClaim(level, manifest)
  }));
}
