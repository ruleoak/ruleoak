/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { atomicWriteFileSync } from './io/durable-file.js';
import { selectEngineeringMemoryFromGraph } from './engineering-memory.js';

export const SEMANTIC_IMPACT_VERSION = '0.1';
export const IMPACT_MATCHER_VERSION = 'deterministic-lexical-v0.1';

const STOPWORDS = new Set(['a','an','and','are','as','at','be','by','can','could','for','from','has','have','in','into','is','it','its','may','of','on','or','our','should','that','the','their','this','to','we','when','with','would','make','modify','update','change','changes','changing','add','new','improve']);
const TOKEN_ALIASES = new Map(Object.entries({
  authorise:'authorization',authorisation:'authorization',authorize:'authorization',authorized:'authorization',authorizing:'authorization',authority:'authorization',permission:'authorization',permissions:'authorization',
  effects:'effect',sideeffect:'effect',sideeffects:'effect',
  retries:'retry',retrying:'retry',retried:'retry',
  verified:'verify',verifier:'verify',verification:'verify',verifying:'verify',
  evidential:'evidence',proof:'evidence',proofs:'evidence',prove:'evidence',claims:'claim',observations:'observation',
  repositories:'repository',repo:'repository',repos:'repository',codebase:'repository',brownfield:'brownfield',
  impacts:'impact',impacted:'impact',affects:'impact',affected:'impact',semantic:'semantic',
  dependencies:'dependency',dependent:'dependency',dependents:'dependency',
  protocols:'protocol',gateways:'gateway',tools:'tool',
  latencies:'latency',milliseconds:'ms',millisecond:'ms',
  files:'file',
  assertions:'assertion'
}));
const DESTRUCTIVE_TERMS = new Set(['allow','bypass','skip','disable','remove','ignore','without','relax','weaken','exceed']);
const STRONG_DESTRUCTIVE_TERMS = new Set(['bypass','disable','remove','ignore','relax','weaken','exceed']);
const STRENGTHENING_TERMS = new Set(['prevent','prohibit','block','avoid','disallow','reject','forbid','require','enforce','preserve']);
const SEVERITY_SCORE = Object.freeze({ low:1, medium:2, high:3, critical:4 });

function sha256(value) { return createHash('sha256').update(String(value)).digest('hex'); }
function impactId(prefix, value) { return `${prefix}:${sha256(value).slice(0,20)}`; }
function normalizeToken(raw) {
  let t = String(raw).toLowerCase().replace(/^[-_.:]+|[-_.:]+$/g,'');
  if (!t) return '';
  if (TOKEN_ALIASES.has(t)) return TOKEN_ALIASES.get(t);
  if (t.length > 5 && t.endsWith('ing')) t = t.slice(0,-3);
  else if (t.length > 4 && t.endsWith('ed')) t = t.slice(0,-2);
  else if (t.length > 4 && t.endsWith('s')) t = t.slice(0,-1);
  return TOKEN_ALIASES.get(t) || t;
}
export function tokenizeImpactText(text) {
  const raw = String(text || '').toLowerCase().replace(/p\s*99/g,'p99').replace(/side[ -]effects?/g,'sideeffect').match(/[a-z0-9]+(?:[._:-][a-z0-9]+)*/g) || [];
  const out = new Set();
  for (const part of raw) {
    for (const piece of part.split(/[._:-]+/)) {
      const token = normalizeToken(piece);
      if (token && token.length > 1 && !STOPWORDS.has(token)) out.add(token);
    }
  }
  return [...out].sort();
}
function nodeText(node) {
  const a = node?.attributes || {};
  return [node?.label, a.summary, a.statement, a.metric, a.source, ...(a.tags || [])].filter(Boolean).join(' ');
}
function intentNode(graph, intentId) { return graph.nodes.find(n => n.id === `intent:${intentId}`) || null; }
function relatedDeclaredNodes(graph, capabilityNode) {
  const ids = new Set();
  for (const e of graph.edges) if (e.from === capabilityNode.id && e.relation.startsWith('intent_ref:')) ids.add(e.to);
  return [...ids].map(id => graph.nodes.find(n => n.id === id)).filter(Boolean);
}
function capabilitySignature(graph, capabilityNode) {
  const weighted = new Map();
  const add = (text, weight) => { for (const token of tokenizeImpactText(text)) weighted.set(token, Math.max(weighted.get(token) || 0, weight)); };
  add(capabilityNode.label, 2);
  add((capabilityNode.attributes?.tags || []).join(' '), 5);
  add(capabilityNode.attributes?.summary || '', 2);
  add(capabilityNode.attributes?.intent_id || '', 2);
  for (const n of relatedDeclaredNodes(graph, capabilityNode)) {
    const weight = n.kind === 'goal' ? 1.25 : n.kind === 'scenario' ? 1 : 0.5;
    add(nodeText(n), weight);
  }
  return weighted;
}
function directCapabilityMatches(graph, requestTokens) {
  const requestSet = new Set(requestTokens), rows = [];
  for (const cap of graph.nodes.filter(n => n.kind === 'capability')) {
    const sig = capabilitySignature(graph, cap), matches = [];
    let score = 0;
    for (const token of requestSet) if (sig.has(token)) { const weight = sig.get(token); score += weight; matches.push({ token, weight }); }
    if (score >= 5) rows.push({ capability_id: cap.attributes?.intent_id || cap.id.replace(/^intent:/,''), node_id: cap.id, score: Number(score.toFixed(2)), matched_terms: matches.sort((a,b) => b.weight-a.weight || a.token.localeCompare(b.token)), confidence: Number(Math.min(0.98, 0.55 + score / 30).toFixed(3)), provenance: 'INFERRED', method: IMPACT_MATCHER_VERSION });
  }
  const ranked=rows.sort((a,b) => b.score-a.score || a.capability_id.localeCompare(b.capability_id));
  if (!ranked.length) return ranked;
  const secondaryFloor=Math.max(6, ranked[0].score*0.6);
  return ranked.filter((row,index)=>index===0 || row.score>=secondaryFloor);
}
function transitiveDependentCapabilities(graph, directRows) {
  const direct = new Set(directRows.map(r => r.node_id)), seen = new Set(direct), queue = [...direct].map(id => ({id,depth:0,path:[id]})), out = [];
  const reverse = new Map();
  for (const e of graph.edges.filter(e => e.relation.startsWith('depends_on:'))) {
    if (!reverse.has(e.to)) reverse.set(e.to, []);
    reverse.get(e.to).push(e);
  }
  for (const rows of reverse.values()) rows.sort((a,b)=>a.from.localeCompare(b.from));
  while (queue.length) {
    const cur = queue.shift();
    for (const e of reverse.get(cur.id) || []) {
      if (seen.has(e.from)) continue;
      seen.add(e.from);
      const n=graph.nodes.find(x=>x.id===e.from); if(!n) continue;
      const row={ capability_id:n.attributes?.intent_id || n.id.replace(/^intent:/,''), node_id:n.id, depth:cur.depth+1, via_capability_id:(graph.nodes.find(x=>x.id===cur.id)?.attributes?.intent_id || cur.id.replace(/^intent:/,'')), dependency_relation:e.relation, basis_edge:e.id, basis_provenance:e.provenance.class, confidence:Number(Math.max(0.4,0.8-(cur.depth*0.1)).toFixed(3)), provenance:'INFERRED', method:'reverse-dependency-impact-v0.1' };
      out.push(row); queue.push({id:e.from,depth:cur.depth+1,path:[...cur.path,e.from]});
    }
  }
  return out.sort((a,b)=>a.depth-b.depth || a.capability_id.localeCompare(b.capability_id));
}
function refsForCapabilities(graph, capabilityNodeIds, kind) {
  const wanted=new Set(capabilityNodeIds), rows=new Map();
  for (const e of graph.edges) {
    if (!e.relation.startsWith('intent_ref:')) continue;
    let candidate=null;
    if (wanted.has(e.from)) candidate=graph.nodes.find(x=>x.id===e.to);
    else if (wanted.has(e.to)) candidate=graph.nodes.find(x=>x.id===e.from);
    if (!candidate || candidate.kind!==kind) continue;
    rows.set(candidate.id,{ id:candidate.attributes?.intent_id || candidate.id.replace(/^intent:/,''), node_id:candidate.id, kind:candidate.kind, label:candidate.label, attributes:candidate.attributes, provenance:candidate.provenance, basis_edge:e.id });
  }
  return [...rows.values()].sort((a,b)=>a.id.localeCompare(b.id));
}
function implementationSurfaces(graph, capabilityNodeIds) {
  const wanted=new Set(capabilityNodeIds), map=new Map();
  for(const e of graph.edges) if(wanted.has(e.from)&&e.relation==='implemented_by') {
    const n=graph.nodes.find(x=>x.id===e.to); if(n) map.set(n.id,{node_id:n.id,relative_path:n.attributes?.relative_path || n.label,kind:n.kind,provenance:e.provenance,basis_edge:e.id});
  }
  return [...map.values()].sort((a,b)=>a.relative_path.localeCompare(b.relative_path));
}
function candidateTests(graph, capabilityNodeIds) {
  const wanted=new Set(capabilityNodeIds), map=new Map();
  for(const e of graph.edges) if(wanted.has(e.from)&&e.relation==='candidate_test') {
    const n=graph.nodes.find(x=>x.id===e.to); if(n) map.set(n.id,{node_id:n.id,relative_path:n.attributes?.relative_path || n.label,provenance:e.provenance,basis_edge:e.id,semantics:e.attributes?.semantics || 'candidate only'});
  }
  return [...map.values()].sort((a,b)=>a.relative_path.localeCompare(b.relative_path));
}
function numericRequestValues(text) {
  const out=[]; const re=/(\d+(?:\.\d+)?)\s*(ms|milliseconds?|s|seconds?|files?)/gi; let m;
  while((m=re.exec(String(text)))) { let unit=normalizeToken(m[2]); if(unit==='second'||unit==='s') unit='s'; if(unit==='file') unit='files'; out.push({value:Number(m[1]),unit,index:m.index}); }
  return out;
}
function detectConflicts(requestText, requestTokens, relevant) {
  const hasStrengthener=requestTokens.some(t=>STRENGTHENING_TERMS.has(t));
  const hasStrongDestructive=requestTokens.some(t=>STRONG_DESTRUCTIVE_TERMS.has(t));
  const destructive=requestTokens.some(t=>DESTRUCTIVE_TERMS.has(t)) && (!hasStrengthener || hasStrongDestructive); const conflicts=[]; const rset=new Set(requestTokens);
  const addTextConflict=(row,type,severity='high')=>{
    const overlap=tokenizeImpactText(`${row.label||''} ${row.attributes?.statement||''}`).filter(t=>rset.has(t));
    if(destructive && overlap.length) conflicts.push({id:impactId('conflict',`${type}\n${row.id}\n${requestText}`),type,severity,protected_intent_id:row.id,statement:row.attributes?.statement || row.label,matched_terms:overlap,reason:`Requested wording may weaken or bypass protected ${type}.`,status:'POTENTIAL'});
  };
  for(const x of relevant.invariants) addTextConflict(x,'invariant','high');
  for(const x of relevant.constraints) addTextConflict(x,'constraint','high');
  for(const x of relevant.authorities) addTextConflict(x,'authority','critical');
  const nums=numericRequestValues(requestText);
  for(const b of relevant.budgets) {
    const metricTokens=tokenizeImpactText(`${b.label||''} ${b.attributes?.metric||''}`), overlap=metricTokens.some(t=>rset.has(t));
    if(!overlap) continue;
    const op=b.attributes?.operator, limit=b.attributes?.value, unit=normalizeToken(b.attributes?.unit||'');
    for(const n of nums) {
      const compatible=(unit==='ms' && (n.unit==='ms')) || (unit==='files' && n.unit==='files') || !unit;
      if(!compatible || typeof limit!=='number') continue;
      const violates=(op==='max'&&n.value>limit)||(op==='min'&&n.value<limit)||(op==='exact'&&n.value!==limit);
      if(violates) conflicts.push({id:impactId('conflict',`budget\n${b.id}\n${n.value}`),type:'budget',severity:'high',protected_intent_id:b.id,statement:`${b.attributes.metric} ${op} ${limit} ${b.attributes.unit||''}`.trim(),requested_value:n.value,requested_unit:n.unit,reason:'Requested numeric target conflicts with declared budget.',status:'CONFLICT'});
    }
  }
  return conflicts.sort((a,b)=>a.protected_intent_id.localeCompare(b.protected_intent_id)||a.type.localeCompare(b.type));
}
function riskAssessment(relevant, conflicts, direct, transitive, uncertainties) {
  if(!direct.length) return {level:'UNKNOWN',score:null,reasons:['No direct capability match was established; impact risk cannot be bounded.']};
  let score=1 + Math.min(2,transitive.length);
  const reasons=[];
  for(const r of relevant.risks) { const s=SEVERITY_SCORE[r.attributes?.severity]||1; score=Math.max(score,s+1); reasons.push(`${r.id}: ${r.attributes?.severity||'unknown'} declared risk`); }
  for(const c of conflicts) { const s=SEVERITY_SCORE[c.severity]||2; score += s; reasons.push(`${c.type} ${c.status}: ${c.protected_intent_id}`); }
  if(uncertainties.some(u=>u.code==='ambiguous_direct_match')) {score+=1;reasons.push('direct capability classification is ambiguous');}
  if(uncertainties.some(u=>u.code==='repository_understanding_unknowns')) {score+=1;reasons.push('repository understanding contains unresolved relationships');}
  const level=score>=9?'CRITICAL':score>=6?'HIGH':score>=3?'MEDIUM':'LOW';
  return {level,score,reasons:[...new Set(reasons)].sort()};
}
function impactGraph(requestText, direct, transitive, relevant, implementation, tests, conflicts, uncertainties) {
  const requestId=impactId('request',requestText), nodes=[{id:requestId,kind:'change_request',label:requestText,source_ref:null,provenance:{class:'OBSERVED',method:'user-request'}}], edges=[];
  const addNode=(id,kind,label,sourceRef,prov)=>{if(!nodes.some(n=>n.id===id))nodes.push({id,kind,label,source_ref:sourceRef,provenance:prov});};
  for(const r of direct){addNode(r.node_id,'capability',r.capability_id,r.node_id,{class:'INFERRED',method:r.method,confidence:r.confidence});edges.push({id:impactId('impact-edge',`${requestId}\ndirect\n${r.node_id}`),from:requestId,to:r.node_id,relation:'directly_impacts',provenance:{class:'INFERRED',method:r.method,confidence:r.confidence}});}
  for(const r of transitive){addNode(r.node_id,'capability',r.capability_id,r.node_id,{class:'INFERRED',method:r.method,confidence:r.confidence});edges.push({id:impactId('impact-edge',`${requestId}\ntransitive\n${r.node_id}`),from:requestId,to:r.node_id,relation:'transitively_impacts',provenance:{class:'INFERRED',method:r.method,confidence:r.confidence},basis_edge:r.basis_edge});}
  for(const [collection,rows] of Object.entries(relevant)) for(const r of rows){addNode(r.node_id,r.kind,r.label,r.node_id,r.provenance); for(const cap of [...direct,...transitive]) { /* source linkage is intentionally represented in detailed sections */ }}
  for(const r of implementation){addNode(r.node_id,r.kind,r.relative_path,r.node_id,r.provenance);}
  for(const r of tests){addNode(r.node_id,'test',r.relative_path,r.node_id,r.provenance);}
  for(const c of conflicts)addNode(c.id,'conflict',c.reason,c.protected_intent_id,{class:'INFERRED',method:'deterministic-conflict-check-v0.1'});
  for(const u of uncertainties)addNode(u.id,'uncertainty',u.statement,u.subject||null,{class:'INFERRED',method:u.method});
  nodes.sort((a,b)=>a.id.localeCompare(b.id)); edges.sort((a,b)=>a.from.localeCompare(b.from)||a.relation.localeCompare(b.relation)||a.to.localeCompare(b.to));
  return {nodes,edges};
}
function makeUncertainty(code,subject,statement,method='impact-analysis-v0.1'){return {id:impactId('uncertainty',`${code}\n${subject}\n${statement}`),code,subject,statement,status:'UNKNOWN',method};}

export function analyzeSemanticImpact(graph, requestText, options={}) {
  if(!graph || graph.understanding_version!=='0.1') throw new Error('semantic impact requires Repository Understanding v0.1');
  if(typeof requestText!=='string'||!requestText.trim()) throw new Error('impact request must be a non-empty string');
  const text=requestText.trim(), requestTokens=tokenizeImpactText(text), direct=directCapabilityMatches(graph,requestTokens), transitive=transitiveDependentCapabilities(graph,direct);
  const affectedNodeIds=[...new Set([...direct,...transitive].map(r=>r.node_id))];
  const relevant={
    goals:refsForCapabilities(graph,affectedNodeIds,'goal'), scenarios:refsForCapabilities(graph,affectedNodeIds,'scenario'), invariants:refsForCapabilities(graph,affectedNodeIds,'invariant'), constraints:refsForCapabilities(graph,affectedNodeIds,'constraint'), budgets:refsForCapabilities(graph,affectedNodeIds,'budget'), authorities:refsForCapabilities(graph,affectedNodeIds,'authority'), risks:refsForCapabilities(graph,affectedNodeIds,'risk'), evidence_requirements:refsForCapabilities(graph,affectedNodeIds,'evidence_requirement'), incidents:refsForCapabilities(graph,affectedNodeIds,'incident')
  };
  const implementation=implementationSurfaces(graph,affectedNodeIds), tests=candidateTests(graph,affectedNodeIds), uncertainties=[];
  if(!direct.length) uncertainties.push(makeUncertainty('requested_change_unresolved',graph.repository.id,'No direct capability match met the deterministic classification threshold.','deterministic-lexical-impact'));
  if(direct.length>1 && direct[0].score-direct[1].score<2) uncertainties.push(makeUncertainty('ambiguous_direct_match',graph.repository.id,`Top direct capability scores are close (${direct[0].capability_id}=${direct[0].score}, ${direct[1].capability_id}=${direct[1].score}).`,'deterministic-lexical-impact'));
  if(graph.unknowns?.length) uncertainties.push(makeUncertainty('repository_understanding_unknowns',graph.repository.id,`Repository Understanding contains ${graph.unknowns.length} unresolved relationship(s); these may hide additional impact.`,'repository-understanding-boundary'));
  const affected=[...new Set([...direct.map(r=>r.capability_id),...transitive.map(r=>r.capability_id)])].sort();
  const history=selectEngineeringMemoryFromGraph(graph,text,affected,{at:options.at});
  const evidenceTypes=[...new Set([...relevant.evidence_requirements.flatMap(r=>r.attributes?.evidence_types||[]),...history.required_evidence_types])].sort();
  const evidence={candidate_tests:tests,required_types:evidenceTypes,verified_types:[],missing_types:evidenceTypes,status:evidenceTypes.length?'UNKNOWN':'NOT_DECLARED',history_required_types:history.required_evidence_types,statement:evidenceTypes.length?'Candidate tests, impact analysis, and historical memory are planning inputs only; required evidence remains unverified until executed in Intent Evidence Authority or an existing evidence authority is explicitly bound.':'No evidence requirement is declared for the matched capabilities.'};
  const conflicts=detectConflicts(text,requestTokens,relevant), risk=riskAssessment(relevant,conflicts,direct,transitive,uncertainties);
  if(history.regressions.length){risk.reasons=[...new Set([...(risk.reasons||[]),...history.regressions.map(r=>`historical regression ${r.record_id}`)])].sort();if(risk.level==='LOW')risk.level='MEDIUM';}
  const graphView=impactGraph(text,direct,transitive,relevant,implementation,tests,conflicts,uncertainties);
  return {impact_version:SEMANTIC_IMPACT_VERSION,request:{text,normalized_tokens:requestTokens,matcher:IMPACT_MATCHER_VERSION},repository:{id:graph.repository.id,understanding_version:graph.understanding_version,intent_manifest:graph.repository.intent_manifest},direct_capabilities:direct,transitive_capabilities:transitive,affected_capability_ids:affected,relevant,engineering_memory:history,implementation_surfaces:implementation,evidence,conflicts,uncertainties,risk,impact_graph:graphView,summary:{direct_capabilities:direct.length,transitive_capabilities:transitive.length,affected_capabilities:affected.length,implementation_surfaces:implementation.length,candidate_tests:tests.length,evidence_requirements:relevant.evidence_requirements.length,historical_regressions:history.regressions.length,missing_evidence_types:evidence.missing_types.length,conflicts:conflicts.length,uncertainties:uncertainties.length,risk_level:risk.level}};
}

export function validateSemanticImpact(result) {
  const errors=[];
  if(!result||typeof result!=='object'||Array.isArray(result)) errors.push('impact result must be an object');
  if(result?.impact_version!==SEMANTIC_IMPACT_VERSION) errors.push(`impact_version must be ${SEMANTIC_IMPACT_VERSION}`);
  if(typeof result?.request?.text!=='string'||!result.request.text) errors.push('request.text is required');
  for(const key of ['direct_capabilities','transitive_capabilities','affected_capability_ids','implementation_surfaces','conflicts','uncertainties']) if(!Array.isArray(result?.[key])) errors.push(`${key} must be an array`);
  for(const key of ['goals','scenarios','invariants','constraints','budgets','authorities','risks','evidence_requirements','incidents']) if(!Array.isArray(result?.relevant?.[key])) errors.push(`relevant.${key} must be an array`);
  const affected=new Set(result?.affected_capability_ids||[]); for(const row of [...(result?.direct_capabilities||[]),...(result?.transitive_capabilities||[])]) if(!affected.has(row.capability_id)) errors.push(`affected_capability_ids missing ${row.capability_id}`);
  if(!['LOW','MEDIUM','HIGH','CRITICAL','UNKNOWN'].includes(result?.risk?.level)) errors.push('risk.level is invalid');
  if(!Array.isArray(result?.impact_graph?.nodes)||!Array.isArray(result?.impact_graph?.edges)) errors.push('impact_graph nodes/edges must be arrays');
  if(result?.engineering_memory!==undefined&&(!Array.isArray(result.engineering_memory.records)||!Array.isArray(result.engineering_memory.regressions))) errors.push('engineering_memory records/regressions must be arrays');
  return {valid:errors.length===0,errors,errorMessage:errors.join('; ')};
}
export function writeSemanticImpact(result,outPath){const v=validateSemanticImpact(result);if(!v.valid)throw new Error(`refusing to write invalid semantic impact: ${v.errorMessage}`);const p=resolve(outPath);atomicWriteFileSync(p,`${JSON.stringify(result,null,2)}\n`,{mode:0o600,maxBytes:64*1024*1024,label:'semantic impact'});return p;}
export function renderSemanticImpact(result,writtenPath=null){
  const lines=['RuleOak Semantic Impact v0.1',`Request: ${result.request.text}`,`Affected: ${result.affected_capability_ids.length?result.affected_capability_ids.join(', '):'UNKNOWN'}`,`Direct: ${result.direct_capabilities.map(x=>`${x.capability_id}(${x.score})`).join(', ')||'none'}`,`Transitive: ${result.transitive_capabilities.map(x=>`${x.capability_id}←${x.via_capability_id}`).join(', ')||'none'}`,`Implementation surfaces: ${result.implementation_surfaces.length}`,`Protected intent: invariants=${result.relevant.invariants.length} · constraints=${result.relevant.constraints.length} · budgets=${result.relevant.budgets.length} · authorities=${result.relevant.authorities.length}`,`Historical incidents: ${result.relevant.incidents.length}`,`Evidence: ${result.evidence.status}; missing=${result.evidence.missing_types.join(', ')||'none declared'}`,`Conflicts: ${result.conflicts.length}`,`Uncertainty: ${result.uncertainties.length}`,`Risk: ${result.risk.level}${result.risk.score===null?'':` (${result.risk.score})`}`];
  if(result.conflicts.length){lines.push('Potential conflicts:');for(const c of result.conflicts.slice(0,8))lines.push(`  - ${c.severity.toUpperCase()} ${c.type}: ${c.protected_intent_id} — ${c.reason}`);}
  if(result.uncertainties.length){lines.push('UNKNOWN:');for(const u of result.uncertainties.slice(0,8))lines.push(`  - ${u.code}: ${u.statement}`);}
  if(writtenPath)lines.push(`Written: ${writtenPath}`); return lines.join('\n');
}
