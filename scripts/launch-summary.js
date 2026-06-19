#!/usr/bin/env node
import { collectLaunchReadiness } from './launch-readiness-check.js';

const report = collectLaunchReadiness();
console.log(JSON.stringify({
  protocol: report.protocol,
  status: report.summary.failed === 0 ? 'ready-for-human-launch-review' : 'blocked',
  latestPublicCoreRelease: report.latestPublicCoreRelease,
  previousPublicBaseline: report.previousPublicBaseline,
  releaseStatus: report.releaseStatus,
  firstRunCommands: [
    'npm install',
    'npm run quickstart:all',
    'npm run adoption:check',
    'npm run launch:check'
  ],
  demoOrder: [
    'AI Coding Agent Governance',
    'Enterprise RAG Answer Governance',
    'Personal Local-First Assistant Governance',
    'SRE Monitoring Change Governance'
  ],
  checkSummary: report.summary
}, null, 2));
if (report.summary.failed > 0) process.exitCode = 1;
