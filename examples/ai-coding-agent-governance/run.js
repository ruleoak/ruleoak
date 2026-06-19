#!/usr/bin/env node
import { runGovernanceVertical } from '../reference-verticals/lib/run-governance-vertical.js';

const result = runGovernanceVertical(import.meta.url);
export const referenceReport = result.referenceReport;
export const evidenceBundle = result.evidenceBundle;
export const auditEvents = result.auditEvents;
export const governanceRecords = result.governanceRecords;
