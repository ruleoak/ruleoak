/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { resolve } from 'node:path';
import { canonicalIntentJson, normalizeIntentManifest, summarizeIntentManifest, validateIntentManifest } from '@ruleoak/protocol/intent';
import { readBoundedFileSync } from './io/durable-file.js';

export function loadIntentManifestFile(path) {
  if (!path) throw new Error('intent manifest file is required');
  const absolute = resolve(path);
  let manifest;
  try { manifest = JSON.parse(readBoundedFileSync(absolute, { maxBytes: 4 * 1024 * 1024, label: 'RuleOak Intent manifest' })); }
  catch (error) { throw new Error(`unable to read Intent manifest ${absolute}: ${error.message}`); }
  return { path: absolute, manifest };
}

export function validateIntentManifestFile(path) {
  const loaded = loadIntentManifestFile(path);
  const validation = validateIntentManifest(loaded.manifest);
  return { path: loaded.path, manifest: loaded.manifest, ...validation, summary: summarizeIntentManifest(loaded.manifest) };
}

export function renderIntentValidation(result) {
  const lines = [
    `Intent manifest: ${result.path}`,
    `Schema: ${result.summary.intent_manifest_version || 'unknown'}`,
    `Manifest: ${result.summary.manifest_id || 'unknown'}`,
    `Product: ${result.summary.product_name || result.summary.product_id || 'unknown'}`,
    `Validation: ${result.valid ? 'PASS' : 'FAIL'}`
  ];
  if (!result.valid) for (const error of result.errors) lines.push(`- ${error}`);
  return lines.join('\n');
}

export function renderIntentSummary(manifest, path = null) {
  const summary = summarizeIntentManifest(manifest);
  const nonZero = Object.entries(summary.counts).filter(([, count]) => count > 0).map(([kind, count]) => `${kind}=${count}`).join(' · ');
  return [
    'RuleOak Intent IR v0.1',
    ...(path ? [`File: ${path}`] : []),
    `Manifest: ${summary.manifest_id || 'unknown'}`,
    `Product: ${summary.product_name || 'unknown'}${summary.product_id ? ` (${summary.product_id})` : ''}`,
    `Validation: ${summary.valid ? 'PASS' : 'FAIL'}`,
    `Entities: ${nonZero || 'none'}`,
    ...(summary.errors.length ? ['Errors:', ...summary.errors.map(error => `- ${error}`)] : [])
  ].join('\n');
}

export function showIntentManifestFile(path, options = {}) {
  const { path: absolute, manifest } = loadIntentManifestFile(path);
  const validation = validateIntentManifest(manifest);
  const normalized = normalizeIntentManifest(manifest);
  if (options.canonical) return { path: absolute, manifest, validation, output: canonicalIntentJson(manifest) };
  if (options.json) return { path: absolute, manifest, validation, output: JSON.stringify(normalized, null, 2) };
  return { path: absolute, manifest, validation, output: renderIntentSummary(manifest, absolute) };
}
