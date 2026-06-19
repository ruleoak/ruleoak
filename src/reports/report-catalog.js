import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, basename } from 'node:path';

export function summarizeReport(report, sourcePath = '') {
  const run = report.run || {};
  const summary = report.summary || {};
  return {
    id: run.id || report.id || basename(sourcePath || 'report'),
    title: summary.title || summary.question || run.app || report.title || basename(sourcePath || 'report'),
    sourcePath,
    runtimeVersion: report.runtimeVersion || report.version || 'unknown',
    runtimeStage: report.runtimeStage || report.stage || 'unknown',
    app: run.app || report.app || 'unknown',
    status: run.status || report.status || 'unknown',
    policyDecision: summary.policyDecision || summary.publishDecision || report.policyDecision || 'unknown',
    counts: {
      evidence: Array.isArray(report.evidence) ? report.evidence.length : 0,
      auditEvents: Array.isArray(report.auditEvents) ? report.auditEvents.length : 0,
      toolDecisions: Array.isArray(report.toolDecisions) ? report.toolDecisions.length : Array.isArray(report.policyDecisions) ? report.policyDecisions.length : 0,
      approvals: Array.isArray(report.approvals) ? report.approvals.length : 0
    }
  };
}

export function buildReportCatalog(reportPaths = []) {
  const reports = [];
  for (const sourcePath of reportPaths) {
    const report = JSON.parse(readFileSync(sourcePath, 'utf8'));
    reports.push(summarizeReport(report, sourcePath));
  }
  return {
    schema: 'ruleoak.report_catalog.v1',
    generatedAt: new Date().toISOString(),
    reportCount: reports.length,
    reports
  };
}

export function writeReportCatalog(reportPaths = [], outputPath = 'reports/html/catalog.json') {
  const catalog = buildReportCatalog(reportPaths);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`);
  return catalog;
}
