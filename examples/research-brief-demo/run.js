#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RunManager, ReportExporter } from "../../src/runtime/index.js";

const here = dirname(fileURLToPath(import.meta.url));

function readJson(name) {
  return JSON.parse(readFileSync(join(here, "mock-data", name), "utf8"));
}

function readText(name) {
  return readFileSync(join(here, "mock-data", name), "utf8");
}

const policy = JSON.parse(readFileSync(join(here, "policy.json"), "utf8"));
const question = readJson("research-question.json");
const sources = readJson("sources.json");
const notes = readText("notes.md");

const runtime = new RunManager({
  app: "RuleOak Research Brief Demo",
  policy,
  metadata: { demo: "research-brief-demo", caseId: question.case_id }
}).start();

for (const source of sources) {
  runtime.addEvidence({
    id: source.id,
    source: source.type,
    claim: source.title,
    value: source.summary,
    metadata: { date: source.date, signals: source.signals, risks: source.risks }
  });
}

const claims = [
  {
    id: "CLM-001",
    claim: "A local-first research assistant is the lower-friction first product direction for this team.",
    source_ids: ["SRC-001", "SRC-002", "SRC-003"],
    confidence: "medium-high",
    evidence: [
      "Interview notes show privacy and local-first preferences.",
      "Prototype logs show higher completion for local import and summarization.",
      "Strategy note emphasizes quality before expansion."
    ]
  },
  {
    id: "CLM-002",
    claim: "Cloud collaboration should be deferred until repeated local use is proven.",
    source_ids: ["SRC-002", "SRC-003"],
    confidence: "medium",
    evidence: [
      "Drop-offs increased when remote setup or account configuration was required.",
      "Founder strategy note warns against overbuilding team and marketplace complexity."
    ]
  },
  {
    id: "CLM-003",
    claim: "The current evidence is not enough to decide enterprise readiness.",
    source_ids: ["SRC-002"],
    confidence: "high",
    evidence: [
      "The usage sample is small and may not represent enterprise buyers."
    ]
  }
];

for (const claim of claims) {
  runtime.addEvidence({
    id: claim.id,
    source: "claim",
    claim: claim.claim,
    value: claim.evidence.join(" "),
    sourceIds: claim.source_ids,
    confidence: claim.confidence
  });
}

const recommendation = {
  summary: "Start with a local-first research assistant. Delay cloud collaboration until the local workflow proves repeated use and quality.",
  rationale: [
    "This path matches user privacy concerns and reduces onboarding complexity.",
    "It keeps the first launch focused on quality and repeat use.",
    "It avoids too soon building team and cloud infrastructure before evidence supports it."
  ],
  known_unknowns: [
    "The evidence does not yet prove enterprise demand.",
    "Future users may request sync, mobile, or collaboration once local quality is proven.",
    "Security and compliance needs must be reviewed before real sensitive data is used."
  ]
};

const exportDecision = runtime.evaluateAction("brief.export", { proposedBy: "research-brief-demo", evidenceIds: claims.map((claim) => claim.id) });
const publishDecision = runtime.evaluateAction("brief.publish", { proposedBy: "research-brief-demo", evidenceIds: claims.map((claim) => claim.id) });

const output = {
  demo: "research-brief-demo",
  developer_preview: false,
  governance_runtime: true,
  question,
  sources,
  notes_summary: "General research demo showing sourced claims, confidence, approval boundary, and audit-style output.",
  claims,
  recommendation,
  policy_decisions: {
    export: exportDecision.decision,
    publish: publishDecision.decision
  },
  approval_status: {
    export: exportDecision.approval.status,
    publish: publishDecision.approval.status
  },
  boundary: "Synthetic demo only. Not a production research, legal, medical, financial, or compliance system."
};

const report = runtime.complete({
  summary: {
    question: question.question,
    recommendation: recommendation.summary,
    exportDecision: exportDecision.decision.decision,
    publishDecision: publishDecision.decision.decision,
    publishApprovalStatus: publishDecision.approval.status
  },
  output
});

const outPath = join(here, "out", "research-brief-report.json");
ReportExporter.writeJson(outPath, report);

console.log("RuleOak Research Brief Demo");
console.log("---------------------------");
console.log(`Runtime: ${report.runtimeVersion} (${report.runtimeStage})`);
console.log(`Case: ${question.case_id}`);
console.log(`Question: ${question.question}`);
console.log("");
console.log("Recommendation:");
console.log(`  ${recommendation.summary}`);
console.log("");
console.log("Claims:");
for (const claim of claims) {
  console.log(`  - ${claim.id}: ${claim.claim} [${claim.confidence}] sources=${claim.source_ids.join(",")}`);
}
console.log("");
console.log(`Export decision:  ${exportDecision.decision.decision}`);
console.log(`Publish decision: ${publishDecision.decision.decision}`);
console.log(`Publish approval: ${publishDecision.approval.status}`);
console.log("");
console.log(`Output written to ${outPath}`);
