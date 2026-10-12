/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { validateIntentManifest } from '@ruleoak/protocol/intent';
import { atomicWriteFileSync, readBoundedFileSync } from './io/durable-file.js';
import { appendEngineeringMemoryGraph } from './engineering-memory.js';

export const REPOSITORY_UNDERSTANDING_VERSION = '0.1';
export const SEMANTIC_INFERENCE_ADAPTER_VERSION = '0.1';
export const PROVENANCE_CLASSES = Object.freeze(['OBSERVED', 'DECLARED', 'INFERRED']);

const DEFAULT_IGNORED_DIRS = new Set([
  '.git', 'node_modules', 'release-candidate', '.ruleoak-demo-output', 'coverage', '.coverage',
  '.gradle', '.idea', '.vscode', '.venv', 'venv', '__pycache__', '.pytest_cache', '.mypy_cache',
  'DerivedData', '.next', '.turbo'
]);
const SOURCE_EXTENSIONS = new Set(['.js','.mjs','.cjs','.jsx','.ts','.tsx','.mts','.cts','.java','.kt','.kts','.swift','.py','.go','.rs','.cs','.c','.cc','.cpp','.h','.hpp','.rb','.php','.scala','.sh','.bash','.zsh','.ps1']);
const CONFIG_EXTENSIONS = new Set(['.json','.yaml','.yml','.toml','.ini','.properties','.xml']);
const DOC_EXTENSIONS = new Set(['.md','.mdx','.rst','.txt']);
const MAX_FILES_DEFAULT = 20000;
const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
const MAX_JSON_BYTES = 4 * 1024 * 1024;

function sha256(value) { return createHash('sha256').update(value).digest('hex'); }
function norm(path) { return path.replaceAll('\\', '/').replace(/^\.\//, ''); }
function stableId(prefix, value) { return `${prefix}:${sha256(String(value)).slice(0, 20)}`; }
function provenance(kind, method, source, confidence = kind === 'INFERRED' ? 0.5 : 1) {
  if (!PROVENANCE_CLASSES.includes(kind)) throw new Error(`invalid provenance class: ${kind}`);
  if (kind !== 'INFERRED' && confidence !== 1) throw new Error(`${kind} provenance confidence must be 1`);
  if (kind === 'INFERRED' && !(confidence >= 0 && confidence < 1)) throw new Error('INFERRED confidence must be >= 0 and < 1');
  return { class: kind, method, source, confidence };
}
function fileKind(rel) {
  const lower = rel.toLowerCase(), base = basename(lower), ext = extname(lower);
  if (/(^|\/)(test|tests|spec|specs|__tests__)(\/|$)/.test(lower) || /(?:\.test|\.spec|_test)\.[^.]+$/.test(base) || /^test_.*\.[^.]+$/.test(base)) return 'test';
  if (base === 'package.json' || base === 'pyproject.toml' || base === 'cargo.toml' || base === 'go.mod' || base.endsWith('.gradle') || base.endsWith('.gradle.kts') || base === 'pom.xml') return 'package_manifest';
  if (SOURCE_EXTENSIONS.has(ext)) return 'implementation';
  if (DOC_EXTENSIONS.has(ext)) return 'documentation';
  if (CONFIG_EXTENSIONS.has(ext) || /^\.?[^/]*(config|rc)(\.|$)/.test(base)) return 'configuration';
  return 'other';
}
function walkFiles(root, options = {}) {
  const ignored = new Set([...DEFAULT_IGNORED_DIRS, ...(options.ignoreDirs || [])]);
  const out = [], maxFiles = options.maxFiles || MAX_FILES_DEFAULT;
  function walk(dir, relBase = '') {
    for (const name of readdirSync(dir).sort()) {
      if (ignored.has(name)) continue;
      const abs = join(dir, name), rel = norm(join(relBase, name));
      let st;
      try { st = lstatSync(abs); } catch { continue; }
      if (st.isSymbolicLink()) { out.push({ rel, abs, kind: 'symlink', bytes: st.size }); continue; }
      if (st.isDirectory()) { walk(abs, rel); continue; }
      if (!st.isFile()) continue;
      out.push({ rel, abs, kind: fileKind(rel), bytes: st.size });
      if (out.length > maxFiles) throw new Error(`repository exceeds maxFiles (${maxFiles}); narrow the repository or raise the explicit limit`);
    }
  }
  walk(root);
  return out;
}
function readJsonBounded(path, label = 'JSON file') {
  const text = readBoundedFileSync(path, { maxBytes: MAX_JSON_BYTES, label });
  return JSON.parse(text);
}
function node(id, kind, label, prov, attributes = {}) { return { id, kind, label, provenance: prov, attributes }; }
function edge(from, to, relation, prov, attributes = {}) { return { id: stableId('edge', `${from}\n${relation}\n${to}\n${prov.class}\n${prov.method}`), from, to, relation, provenance: prov, attributes }; }
function unknown(code, subject, statement, method = 'conservative-analysis') { return { id: stableId('unknown', `${code}\n${subject}\n${statement}`), code, subject, statement, status: 'UNKNOWN', method }; }
function packageNodeId(name, relDir) { return `package:${name || relDir || 'root'}`; }
function fileNodeId(rel) { return `file:${rel}`; }
function intentNodeId(id) { return `intent:${id}`; }
function declaredIntentAttributes(entity) {
  const out = { intent_id: entity.id };
  for (const key of ['summary','statement','tags','metric','operator','value','min_value','max_value','unit','authority_kind','source','severity','status','evidence_types','constraint_type','dependency_type']) {
    if (entity[key] !== undefined) out[key] = entity[key];
  }
  return out;
}
function packageManifests(files) { return files.filter(file => basename(file.rel) === 'package.json'); }

function parsePackage(path) {
  try {
    const value = readJsonBounded(path, 'package.json');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch { return null; }
}
function workspacePatterns(rootPackage) {
  if (Array.isArray(rootPackage?.workspaces)) return rootPackage.workspaces.filter(x => typeof x === 'string');
  if (Array.isArray(rootPackage?.workspaces?.packages)) return rootPackage.workspaces.packages.filter(x => typeof x === 'string');
  return [];
}
function simpleWorkspaceMatch(relDir, pattern) {
  const p = norm(pattern).replace(/\/$/, '');
  if (!p.includes('*')) return relDir === p;
  const [before, after = ''] = p.split('*', 2);
  return relDir.startsWith(before) && relDir.endsWith(after) && relDir.length >= before.length + after.length;
}
function nearestPackageForFile(rel, packages) {
  let best = null;
  for (const pkg of packages) {
    if (!pkg.relDir) { if (!best) best = pkg; continue; }
    if (rel === pkg.relDir || rel.startsWith(`${pkg.relDir}/`)) {
      if (!best || pkg.relDir.length > best.relDir.length) best = pkg;
    }
  }
  return best;
}
function importSpecifiers(text) {
  // Deliberately conservative: only statement-leading static import/export/require forms are observed.
  // This avoids treating fixture strings/comments as source dependencies. Anything not recognized remains unmodeled.
  const specs = new Set();
  for (const line of String(text).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
    let match = trimmed.match(/^(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/);
    if (match) { specs.add(match[1]); continue; }
    match = trimmed.match(/^(?:(?:const|let|var)\s+[^=]+?=\s*)?require\(\s*['"]([^'"]+)['"]\s*\)/);
    if (match) { specs.add(match[1]); continue; }
    match = trimmed.match(/^import\(\s*['"]([^'"]+)['"]\s*\)/);
    if (match) specs.add(match[1]);
  }
  return [...specs].sort();
}
function resolveRelativeImport(importerRel, spec, fileSet) {
  if (!spec.startsWith('.')) return null;
  const base = norm(join(dirname(importerRel), spec));
  const candidates = [base, ...[...SOURCE_EXTENSIONS, '.json'].map(ext => `${base}${ext}`), ...[...SOURCE_EXTENSIONS, '.json'].map(ext => `${base}/index${ext}`)];
  return candidates.find(candidate => fileSet.has(candidate)) || null;
}
function exportedEntrypoints(pkg, pkgNode, nodes, edges, fileSet) {
  if (pkg.value?.exports === undefined) return;
  const rows = [];
  const visit = (key, value) => {
    if (typeof value === 'string') rows.push([key, value]);
    else if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [condition, target] of Object.entries(value)) {
        if (typeof target === 'string') rows.push([`${key}#${condition}`, target]);
      }
    }
  };
  if (typeof pkg.value.exports === 'string') visit('.', pkg.value.exports);
  else if (pkg.value.exports && typeof pkg.value.exports === 'object') for (const [key, value] of Object.entries(pkg.value.exports)) visit(key, value);
  for (const [entrypoint, target] of rows.sort((a,b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]))) {
    const iid = `interface:${pkgNode.id}:${entrypoint}`;
    nodes.push(node(iid, 'interface', `${pkg.name || pkg.relDir}:${entrypoint}`, provenance('OBSERVED', 'package-exports', norm(join(pkg.relDir, 'package.json'))), { entrypoint, target }));
    edges.push(edge(pkgNode.id, iid, 'declares_interface', provenance('OBSERVED', 'package-exports', norm(join(pkg.relDir, 'package.json')))));
    const targetRel = norm(join(pkg.relDir, target.replace(/^\.\//, '')));
    if (fileSet.has(targetRel)) edges.push(edge(iid, fileNodeId(targetRel), 'implemented_by', provenance('OBSERVED', 'package-export-target', norm(join(pkg.relDir, 'package.json')))));
  }
}
function intentCollectionKind(collection) {
  const singular = { capabilities:'capability',goals:'goal',scenarios:'scenario',invariants:'invariant',constraints:'constraint',budgets:'budget',authorities:'authority',dependencies:'dependency',risks:'risk',failure_modes:'failure_mode',fallbacks:'fallback',evidence_requirements:'evidence_requirement',claims:'claim',decisions:'decision',incidents:'incident' };
  return singular[collection] || collection.replace(/s$/, '');
}
const INTENT_REF_FIELDS = Object.freeze({
  capability: ['goal_ids','scenario_ids','invariant_ids','constraint_ids','budget_ids','authority_ids','dependency_ids','risk_ids','failure_mode_ids','fallback_ids','evidence_requirement_ids','claim_ids','decision_ids','incident_ids'],
  goal: ['capability_ids'], scenario: ['capability_ids','invariant_ids'], invariant: ['capability_ids'], constraint: ['capability_ids'], budget: ['capability_ids'], authority: ['capability_ids'], risk: ['capability_ids'], failure_mode: ['capability_ids','fallback_ids'], fallback: ['capability_ids'], evidence_requirement: ['capability_ids','claim_ids'], claim: ['capability_ids','evidence_requirement_ids'], decision: ['capability_ids'], incident: ['capability_ids','invariant_ids','decision_ids']
});
function loadIntentArtifacts(root, options = {}) {
  const explicitIntent = options.intentFile ? resolve(root, options.intentFile) : null;
  const intentDir = resolve(root, '.ruleoak/intent');
  let manifestPath = explicitIntent;
  if (!manifestPath && existsSync(intentDir)) {
    const candidates = readdirSync(intentDir).filter(name => name.endsWith('.intent.json')).sort().map(name => join(intentDir, name));
    if (candidates.length === 1) manifestPath = candidates[0];
    else if (candidates.length > 1) throw new Error('multiple .ruleoak/intent/*.intent.json manifests found; select one with --intent');
  }
  let manifest = null;
  if (manifestPath) {
    manifest = readJsonBounded(manifestPath, 'Intent manifest');
    const validation = validateIntentManifest(manifest);
    if (!validation.valid) throw new Error(`Intent manifest is invalid: ${validation.errorMessage}`);
  }
  const bindingPaths = (options.bindingFiles || []).map(path => resolve(root, path));
  if (manifest && bindingPaths.length === 0 && existsSync(intentDir)) {
    for (const name of readdirSync(intentDir).filter(name => name.endsWith('.binding.json')).sort()) bindingPaths.push(join(intentDir, name));
  }
  const bindings = bindingPaths.map(path => ({ path, value: readJsonBounded(path, 'Intent implementation binding') }));
  return { manifestPath, manifest, bindings };
}
function addIntentGraph(root, artifacts, fileSet, nodes, edges, unknowns) {
  if (!artifacts.manifest) {
    unknowns.push(unknown('intent_manifest_missing', 'repository', 'No Intent manifest was supplied or uniquely discovered; capability mapping is unavailable.'));
    return;
  }
  const manifestSource = norm(relative(root, artifacts.manifestPath));
  const registry = new Map();
  const productId = intentNodeId(artifacts.manifest.product.id);
  nodes.push(node(productId, 'product', artifacts.manifest.product.name, provenance('DECLARED', 'intent-manifest', manifestSource), { intent_id: artifacts.manifest.product.id, version: artifacts.manifest.product.version || null, summary: artifacts.manifest.product.summary || null, tags: artifacts.manifest.product.tags || [] }));
  registry.set(artifacts.manifest.product.id, productId);
  for (const [collection, rows] of Object.entries(artifacts.manifest)) {
    if (!Array.isArray(rows)) continue;
    const kind = intentCollectionKind(collection);
    for (const entity of rows) {
      if (!entity || typeof entity.id !== 'string') continue;
      const id = intentNodeId(entity.id), label = entity.name || entity.statement || entity.id;
      nodes.push(node(id, kind, label, provenance('DECLARED', 'intent-manifest', manifestSource), declaredIntentAttributes(entity)));
      registry.set(entity.id, id);
    }
  }
  for (const [collection, rows] of Object.entries(artifacts.manifest)) {
    if (!Array.isArray(rows)) continue;
    const kind = intentCollectionKind(collection);
    for (const entity of rows) {
      const from = registry.get(entity?.id); if (!from) continue;
      for (const field of INTENT_REF_FIELDS[kind] || []) {
        for (const ref of entity[field] || []) {
          const to = registry.get(ref);
          if (to) edges.push(edge(from, to, `intent_ref:${field.replace(/_ids$/, '')}`, provenance('DECLARED', 'intent-manifest-reference', manifestSource), { field }));
        }
      }
      if (kind === 'dependency') {
        const fromCap = registry.get(entity.from_capability_id), toCap = registry.get(entity.to_capability_id);
        if (fromCap && toCap) edges.push(edge(fromCap, toCap, `depends_on:${entity.dependency_type}`, provenance('DECLARED', 'intent-dependency', manifestSource), { dependency_id: entity.id }));
      }
    }
  }
  const capabilityIds = new Set((artifacts.manifest.capabilities || []).map(x => x.id));
  const boundCapabilities = new Set();
  for (const binding of artifacts.bindings) {
    const source = norm(relative(root, binding.path)), value = binding.value;
    if (!value || value.intent_manifest_id !== artifacts.manifest.manifest_id) {
      unknowns.push(unknown('binding_manifest_mismatch', source, `Binding does not target Intent manifest ${artifacts.manifest.manifest_id}.`, 'binding-validation'));
      continue;
    }
    for (const row of value.capability_bindings || []) {
      if (!capabilityIds.has(row.capability_id)) { unknowns.push(unknown('binding_unknown_capability', source, `Binding references unknown capability ${row.capability_id}.`, 'binding-validation')); continue; }
      const capabilityNode = registry.get(row.capability_id); boundCapabilities.add(row.capability_id);
      for (const modulePath of row.modules || []) {
        const rel = norm(modulePath);
        if (fileSet.has(rel)) edges.push(edge(capabilityNode, fileNodeId(rel), 'implemented_by', provenance('DECLARED', 'implementation-binding', source), { implementation_id: value.implementation_id || null, language: value.language || null }));
        else unknowns.push(unknown('bound_module_missing', row.capability_id, `Declared implementation module is not present in the repository scan: ${rel}`, 'implementation-binding'));
      }
    }
  }
  for (const capabilityId of [...capabilityIds].sort()) if (!boundCapabilities.has(capabilityId)) unknowns.push(unknown('capability_implementation_unknown', capabilityId, 'No explicit implementation binding was found for this capability.'));
}

export function createNoopSemanticInferenceAdapter() {
  return Object.freeze({ adapter_version: SEMANTIC_INFERENCE_ADAPTER_VERSION, name: 'none', infer() { return { nodes: [], edges: [], unknowns: [] }; } });
}
export function applySemanticInference(graph, adapter = createNoopSemanticInferenceAdapter()) {
  if (!adapter || adapter.adapter_version !== SEMANTIC_INFERENCE_ADAPTER_VERSION || typeof adapter.infer !== 'function') throw new Error(`semantic inference adapter must implement version ${SEMANTIC_INFERENCE_ADAPTER_VERSION}`);
  const proposal = adapter.infer(structuredClone(graph)) || {};
  for (const item of proposal.nodes || []) if (item?.provenance?.class !== 'INFERRED') throw new Error('semantic inference adapter nodes must use INFERRED provenance');
  for (const item of proposal.edges || []) if (item?.provenance?.class !== 'INFERRED') throw new Error('semantic inference adapter edges must use INFERRED provenance');
  return {
    ...graph,
    nodes: [...graph.nodes, ...(proposal.nodes || [])],
    edges: [...graph.edges, ...(proposal.edges || [])],
    unknowns: [...graph.unknowns, ...(proposal.unknowns || [])],
    inference: { adapter_version: adapter.adapter_version, adapter: adapter.name || 'unnamed', enabled: adapter.name !== 'none' }
  };
}
function dedupeSortGraph(graph) {
  const nodeMap = new Map(); for (const n of graph.nodes) if (!nodeMap.has(n.id)) nodeMap.set(n.id, n);
  const edgeMap = new Map(); for (const e of graph.edges) if (!edgeMap.has(e.id)) edgeMap.set(e.id, e);
  const unknownMap = new Map(); for (const u of graph.unknowns) if (!unknownMap.has(u.id)) unknownMap.set(u.id, u);
  return {
    ...graph,
    nodes: [...nodeMap.values()].sort((a,b) => a.id.localeCompare(b.id)),
    edges: [...edgeMap.values()].sort((a,b) => a.from.localeCompare(b.from) || a.relation.localeCompare(b.relation) || a.to.localeCompare(b.to) || a.id.localeCompare(b.id)),
    unknowns: [...unknownMap.values()].sort((a,b) => a.subject.localeCompare(b.subject) || a.code.localeCompare(b.code) || a.id.localeCompare(b.id))
  };
}
function graphSummary(graph) {
  const byKind = {}, byProvenance = { OBSERVED:0, DECLARED:0, INFERRED:0 };
  for (const n of graph.nodes) { byKind[n.kind] = (byKind[n.kind] || 0) + 1; byProvenance[n.provenance.class] = (byProvenance[n.provenance.class] || 0) + 1; }
  for (const e of graph.edges) byProvenance[e.provenance.class] = (byProvenance[e.provenance.class] || 0) + 1;
  return { nodes: graph.nodes.length, edges: graph.edges.length, unknowns: graph.unknowns.length, by_kind: Object.fromEntries(Object.entries(byKind).sort()), provenance_records: byProvenance };
}

export function buildRepositoryUnderstanding(rootDir, options = {}) {
  const root = resolve(rootDir || process.cwd()), files = walkFiles(root, options), fileSet = new Set(files.filter(f => f.kind !== 'symlink').map(f => f.rel));
  const nodes = [], edges = [], unknowns = [];
  const rootPackagePath = resolve(root, 'package.json'), rootPackageValue = existsSync(rootPackagePath) ? parsePackage(rootPackagePath) : null;
  const repositoryId = `repository:${rootPackageValue?.name || basename(root)}`;
  nodes.push(node(repositoryId, 'repository', rootPackageValue?.name || basename(root), provenance('OBSERVED', 'filesystem-root', '.'), { root: '.', version: rootPackageValue?.version || null }));

  for (const file of files) {
    if (file.kind === 'symlink') { unknowns.push(unknown('symlink_not_followed', file.rel, 'Symbolic link was not followed during conservative repository analysis.', 'filesystem-scan')); continue; }
    let digest = null;
    if (file.bytes <= MAX_SOURCE_BYTES) { try { digest = sha256(readFileSync(file.abs)); } catch {} }
    nodes.push(node(fileNodeId(file.rel), file.kind, file.rel, provenance('OBSERVED', 'filesystem-scan', file.rel), { relative_path: file.rel, bytes: file.bytes, sha256: digest, extension: extname(file.rel).toLowerCase() || null }));
    edges.push(edge(repositoryId, fileNodeId(file.rel), 'contains', provenance('OBSERVED', 'filesystem-scan', file.rel)));
  }

  const manifests = packageManifests(files).map(file => ({ file, relDir: norm(dirname(file.rel)) === '.' ? '' : norm(dirname(file.rel)), value: parsePackage(file.abs) })).filter(x => x.value);
  const patterns = workspacePatterns(rootPackageValue);
  const packages = [];
  for (const manifest of manifests) {
    if (manifest.relDir && patterns.length && !patterns.some(pattern => simpleWorkspaceMatch(manifest.relDir, pattern))) continue;
    const name = manifest.value.name || manifest.relDir || rootPackageValue?.name || 'root';
    const id = packageNodeId(name, manifest.relDir), pkg = { ...manifest, name, id };
    packages.push(pkg);
    nodes.push(node(id, 'package', name, provenance('OBSERVED', 'package-manifest', manifest.file.rel), { relative_dir: manifest.relDir || '.', version: manifest.value.version || null, private: manifest.value.private === true }));
    edges.push(edge(repositoryId, id, 'contains_package', provenance('OBSERVED', 'package-manifest', manifest.file.rel)));
    edges.push(edge(id, fileNodeId(manifest.file.rel), 'declared_by', provenance('OBSERVED', 'package-manifest', manifest.file.rel)));
  }
  if (!packages.length && rootPackageValue) {
    const id = packageNodeId(rootPackageValue.name, '');
    packages.push({ file: { rel:'package.json', abs:rootPackagePath }, relDir:'', value:rootPackageValue, name:rootPackageValue.name || 'root', id });
  }
  for (const file of files.filter(f => f.kind !== 'symlink')) {
    const pkg = nearestPackageForFile(file.rel, packages); if (!pkg) continue;
    edges.push(edge(pkg.id, fileNodeId(file.rel), 'contains_file', provenance('OBSERVED', 'workspace-membership', file.rel)));
  }
  for (const pkg of packages) exportedEntrypoints(pkg, nodes.find(n => n.id === pkg.id) || {id:pkg.id}, nodes, edges, fileSet);

  const importEdges = [];
  for (const file of files.filter(f => ['implementation','test'].includes(f.kind) && ['.js','.mjs','.cjs','.jsx','.ts','.tsx','.mts','.cts'].includes(extname(f.rel).toLowerCase()))) {
    if (file.bytes > MAX_SOURCE_BYTES) { unknowns.push(unknown('source_too_large_for_import_scan', file.rel, `Source exceeds import scan bound (${MAX_SOURCE_BYTES} bytes).`, 'static-import-scan')); continue; }
    let text; try { text = readFileSync(file.abs, 'utf8'); } catch { continue; }
    for (const spec of importSpecifiers(text)) {
      const targetRel = resolveRelativeImport(file.rel, spec, fileSet);
      if (spec.startsWith('.') && !targetRel) { unknowns.push(unknown('relative_import_unresolved', file.rel, `Relative import could not be resolved conservatively: ${spec}`, 'static-import-scan')); continue; }
      if (!targetRel) continue;
      const e = edge(fileNodeId(file.rel), fileNodeId(targetRel), 'imports', provenance('OBSERVED', 'static-import-scan', file.rel), { specifier: spec });
      edges.push(e); importEdges.push({ file, targetRel, edge:e });
    }
  }
  for (const item of importEdges.filter(x => x.file.kind === 'test')) {
    const target = files.find(f => f.rel === item.targetRel); if (!target || target.kind !== 'implementation') continue;
    edges.push(edge(fileNodeId(item.file.rel), fileNodeId(item.targetRel), 'candidate_tests', provenance('INFERRED', 'test-import-derivation', item.file.rel, 0.85), { basis_edge: item.edge.id, semantics: 'candidate coverage only; not proof that a behavior is verified' }));
  }

  const intentArtifacts = loadIntentArtifacts(root, options);
  addIntentGraph(root, intentArtifacts, fileSet, nodes, edges, unknowns);
  if (!options.inferenceAdapter || options.inferenceAdapter.name === 'none') unknowns.push(unknown('semantic_inference_not_run', repositoryId, 'Model-assisted semantic inference was not run; semantic relationships not derivable from observed or declared data remain UNKNOWN.', 'semantic-inference-boundary'));
  let graph = { understanding_version: REPOSITORY_UNDERSTANDING_VERSION, repository: { id: repositoryId, root: '.', intent_manifest: intentArtifacts.manifestPath ? norm(relative(root, intentArtifacts.manifestPath)) : null }, nodes, edges, unknowns, inference: { adapter_version: SEMANTIC_INFERENCE_ADAPTER_VERSION, adapter: 'none', enabled: false } };

  // A declared implementation binding plus an observed test import can identify a candidate capability test,
  // but remains explicitly INFERRED because import presence alone does not prove behavioral coverage.
  const implByCapability = graph.edges.filter(e => e.relation === 'implemented_by' && e.from.startsWith('intent:cap.'));
  const candidateTestEdges = graph.edges.filter(e => e.relation === 'candidate_tests');
  for (const impl of implByCapability) for (const testEdge of candidateTestEdges) if (testEdge.to === impl.to) edges.push(edge(impl.from, testEdge.from, 'candidate_test', provenance('INFERRED', 'binding-plus-test-import', testEdge.provenance.source, 0.7), { implementation_edge: impl.id, test_basis_edge: testEdge.id, semantics: 'candidate only; independent evidence is not established' }));

  graph = applySemanticInference(graph, options.inferenceAdapter || createNoopSemanticInferenceAdapter());
  graph = appendEngineeringMemoryGraph(graph, root, { memoryFiles: options.memoryFiles || [] });
  graph = dedupeSortGraph(graph);
  graph.summary = graphSummary(graph);
  graph.summary.engineering_memory_records = graph.engineering_memory?.records || 0;
  return graph;
}

export function validateRepositoryUnderstanding(graph) {
  const errors = [];
  if (!graph || typeof graph !== 'object' || Array.isArray(graph)) errors.push('understanding graph must be an object');
  if (graph?.understanding_version !== REPOSITORY_UNDERSTANDING_VERSION) errors.push(`understanding_version must be ${REPOSITORY_UNDERSTANDING_VERSION}`);
  if (!Array.isArray(graph?.nodes) || !Array.isArray(graph?.edges) || !Array.isArray(graph?.unknowns)) errors.push('nodes, edges, and unknowns must be arrays');
  const nodeIds = new Set();
  for (const [index, n] of (graph?.nodes || []).entries()) {
    if (!n || typeof n.id !== 'string' || !n.id) errors.push(`nodes[${index}].id is required`); else if (nodeIds.has(n.id)) errors.push(`duplicate node id: ${n.id}`); else nodeIds.add(n.id);
    if (!PROVENANCE_CLASSES.includes(n?.provenance?.class)) errors.push(`nodes[${index}].provenance.class is invalid`);
    if (n?.provenance?.class === 'INFERRED' && !(n.provenance.confidence >= 0 && n.provenance.confidence < 1)) errors.push(`nodes[${index}] INFERRED confidence must be >= 0 and < 1`);
  }
  const edgeIds = new Set();
  for (const [index, e] of (graph?.edges || []).entries()) {
    if (!e || typeof e.id !== 'string' || !e.id) errors.push(`edges[${index}].id is required`); else if (edgeIds.has(e.id)) errors.push(`duplicate edge id: ${e.id}`); else edgeIds.add(e.id);
    if (!nodeIds.has(e?.from)) errors.push(`edges[${index}].from is unknown: ${e?.from}`);
    if (!nodeIds.has(e?.to)) errors.push(`edges[${index}].to is unknown: ${e?.to}`);
    if (!PROVENANCE_CLASSES.includes(e?.provenance?.class)) errors.push(`edges[${index}].provenance.class is invalid`);
    if (e?.provenance?.class === 'INFERRED' && !(e.provenance.confidence >= 0 && e.provenance.confidence < 1)) errors.push(`edges[${index}] INFERRED confidence must be >= 0 and < 1`);
  }
  for (const [index, u] of (graph?.unknowns || []).entries()) if (u?.status !== 'UNKNOWN') errors.push(`unknowns[${index}].status must be UNKNOWN`);
  return { valid: errors.length === 0, errors, errorMessage: errors.join('; ') };
}

export function writeRepositoryUnderstanding(graph, outPath) {
  const validation = validateRepositoryUnderstanding(graph); if (!validation.valid) throw new Error(`refusing to write invalid repository understanding: ${validation.errorMessage}`);
  const path = resolve(outPath); atomicWriteFileSync(path, `${JSON.stringify(graph, null, 2)}\n`, { mode: 0o600, maxBytes: 64 * 1024 * 1024, label: 'repository understanding graph' }); return path;
}
export function loadRepositoryUnderstanding(path) {
  const absolute = resolve(path), graph = readJsonBounded(absolute, 'repository understanding graph'), validation = validateRepositoryUnderstanding(graph);
  if (!validation.valid) throw new Error(`repository understanding graph is invalid: ${validation.errorMessage}`);
  return { path: absolute, graph };
}
export function renderRepositoryUnderstanding(graph, outPath = null) {
  const s = graph.summary || graphSummary(graph);
  const kinds = Object.entries(s.by_kind || {}).map(([kind,count]) => `${kind}=${count}`).join(' · ');
  return [
    'RuleOak Brownfield Understanding v0.1',
    `Repository: ${graph.repository.id}`,
    `Intent: ${graph.repository.intent_manifest || 'UNKNOWN'}`,
    `Graph: ${s.nodes} nodes · ${s.edges} edges · ${s.unknowns} UNKNOWN`,
    `Provenance: OBSERVED=${s.provenance_records.OBSERVED || 0} · DECLARED=${s.provenance_records.DECLARED || 0} · INFERRED=${s.provenance_records.INFERRED || 0}`,
    `Kinds: ${kinds || 'none'}`,
    `Engineering memory: ${graph.engineering_memory?.records||0} record(s)`,
    `Semantic inference adapter: ${graph.inference.adapter} (${graph.inference.enabled ? 'enabled' : 'disabled'})`,
    ...(outPath ? [`Saved: ${resolve(outPath)}`] : []),
    ...(graph.unknowns.length ? [`Unknown relationships: ${graph.unknowns.length} (inspect with --json; RuleOak does not guess them)`] : [])
  ].join('\n');
}
function normalizeQuery(query) { return norm(String(query || '').trim()); }
export function resolveUnderstandingNode(graph, query) {
  const q = normalizeQuery(query); if (!q) throw new Error('an entity id or repository-relative path is required');
  const exact = graph.nodes.filter(n => n.id === q || n.attributes?.relative_path === q || n.attributes?.intent_id === q || n.label === q);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) throw new Error(`query is ambiguous: ${q} matched ${exact.length} nodes`);
  const folded = q.toLowerCase(), fuzzy = graph.nodes.filter(n => n.id.toLowerCase().includes(folded) || String(n.label).toLowerCase().includes(folded) || String(n.attributes?.relative_path || '').toLowerCase().includes(folded));
  if (fuzzy.length === 1) return fuzzy[0];
  if (fuzzy.length === 0) throw new Error(`no understanding node matched: ${q}`);
  throw new Error(`query is ambiguous: ${q} matched ${fuzzy.length} nodes; use an exact node id or path`);
}
export function explainUnderstandingNode(graph, query) {
  const n = resolveUnderstandingNode(graph, query), incoming = graph.edges.filter(e => e.to === n.id), outgoing = graph.edges.filter(e => e.from === n.id), relatedUnknowns = graph.unknowns.filter(u => u.subject === n.attributes?.intent_id || u.subject === n.attributes?.relative_path || u.subject === n.id || u.statement.includes(n.attributes?.intent_id || '\u0000'));
  return { node: n, incoming, outgoing, unknowns: relatedUnknowns };
}
export function renderUnderstandingExplanation(explanation) {
  const n = explanation.node;
  const lines = [
    `Understanding node: ${n.id}`,
    `Kind: ${n.kind}`,
    `Label: ${n.label}`,
    `Provenance: ${n.provenance.class} · ${n.provenance.method} · confidence=${n.provenance.confidence}`,
    `Source: ${n.provenance.source}`,
    `Incoming relationships: ${explanation.incoming.length}`,
    ...explanation.incoming.slice(0, 30).map(e => `  <- ${e.relation} — ${e.from} [${e.provenance.class}${e.provenance.class === 'INFERRED' ? ` ${e.provenance.confidence}` : ''}]`),
    `Outgoing relationships: ${explanation.outgoing.length}`,
    ...explanation.outgoing.slice(0, 30).map(e => `  -> ${e.relation} — ${e.to} [${e.provenance.class}${e.provenance.class === 'INFERRED' ? ` ${e.provenance.confidence}` : ''}]`),
    ...(explanation.unknowns.length ? ['UNKNOWN:', ...explanation.unknowns.map(u => `  - ${u.statement}`)] : [])
  ];
  return lines.join('\n');
}
export function traceUnderstanding(graph, query, options = {}) {
  const start = resolveUnderstandingNode(graph, query), maxDepth = Number.isInteger(options.maxDepth) ? Math.max(0, Math.min(options.maxDepth, 12)) : 3, direction = options.direction || 'both';
  if (!['in','out','both'].includes(direction)) throw new Error('trace direction must be in, out, or both');
  const visited = new Map([[start.id, 0]]), queue = [start.id], tracedEdges = [];
  while (queue.length) {
    const current = queue.shift(), depth = visited.get(current); if (depth >= maxDepth) continue;
    const candidates = graph.edges.filter(e => (direction !== 'in' && e.from === current) || (direction !== 'out' && e.to === current));
    for (const e of candidates) {
      tracedEdges.push(e); const next = e.from === current ? e.to : e.from;
      if (!visited.has(next)) { visited.set(next, depth + 1); queue.push(next); }
    }
  }
  const nodeIds = new Set(visited.keys());
  return { start: start.id, max_depth: maxDepth, direction, nodes: graph.nodes.filter(n => nodeIds.has(n.id)), edges: [...new Map(tracedEdges.map(e => [e.id,e])).values()].sort((a,b) => a.id.localeCompare(b.id)), unknowns: graph.unknowns.filter(u => [...nodeIds].some(id => u.subject === id || u.statement.includes(id))) };
}
export function renderUnderstandingTrace(trace) {
  const lines = [`Understanding trace: ${trace.start}`, `Depth: ${trace.max_depth} · Direction: ${trace.direction}`, `Nodes: ${trace.nodes.length} · Relationships: ${trace.edges.length}`];
  for (const e of trace.edges) lines.push(`${e.from} --${e.relation}--> ${e.to} [${e.provenance.class}${e.provenance.class === 'INFERRED' ? ` ${e.provenance.confidence}` : ''}]`);
  if (trace.unknowns.length) lines.push('UNKNOWN:', ...trace.unknowns.map(u => `- ${u.statement}`));
  return lines.join('\n');
}
