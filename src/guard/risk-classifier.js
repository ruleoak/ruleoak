const HIGH_RISK_PATTERNS = [
  /delete/i,
  /remove/i,
  /destroy/i,
  /drop/i,
  /wipe/i,
  /modify_original/i,
  /overwrite/i,
  /credential/i,
  /secret/i,
  /payment/i,
  /production/i
];

const MEDIUM_RISK_PATTERNS = [
  /send/i,
  /publish/i,
  /post/i,
  /email/i,
  /message/i,
  /update/i,
  /create/i,
  /write/i,
  /upload/i,
  /external/i,
  /cloud/i,
  /deploy/i,
  /ticket/i,
  /issue/i
];

const LOW_RISK_PATTERNS = [
  /read/i,
  /search/i,
  /list/i,
  /inspect/i,
  /summarize/i,
  /retrieve/i,
  /preview/i,
  /classify/i,
  /validate/i
];

export class ToolRiskClassifier {
  classify(tool = {}, call = {}) {
    if (["low", "medium", "high"].includes(tool.risk)) return tool.risk;
    const text = [tool.id, tool.name, tool.description, tool.kind, call.toolId, call.tool, call.name, call.action, call.subject]
      .filter(Boolean)
      .join(" ");
    if (HIGH_RISK_PATTERNS.some((pattern) => pattern.test(text))) return "high";
    if (MEDIUM_RISK_PATTERNS.some((pattern) => pattern.test(text))) return "medium";
    if (LOW_RISK_PATTERNS.some((pattern) => pattern.test(text))) return "low";
    return "unknown";
  }

  defaultEffectForRisk(risk) {
    if (risk === "high") return "deny";
    if (risk === "medium" || risk === "unknown") return "approval_required";
    return "allow";
  }
}
