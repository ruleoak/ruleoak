/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
/** Experimental, transport-only family contracts. No authority or trust is inferred. */
export const FAMILY_CONTRACT_VERSION = '1.0';
export const VERIFICATION_DIMENSIONS = Object.freeze([
  'binding', 'semantic_support', 'workload_qualification', 'effect_confirmation', 'human_review'
]);
const hash = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const name = x => typeof x === 'string' && x.length > 0 && x.length <= 256;
const time = x => typeof x === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)
  && Number.isFinite(Date.parse(x)) && new Date(x).toISOString() === x;
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const keys = (x, expected) => object(x) && Object.keys(x).sort().join('|') === [...expected].sort().join('|');
const list = (x, fn, max=1000) => Array.isArray(x) && x.length <= max && x.every(fn);
const unique = xs => new Set(xs).size === xs.length;
const ref = x => keys(x, ['product','releaseId','sourceSha256']) && name(x.product) && name(x.releaseId) && hash(x.sourceSha256);
const subject = x => keys(x,['kind','id','sha256']) && name(x.kind) && name(x.id) && hash(x.sha256);
const schema = x => keys(x,['id','version']) && name(x.id) && name(x.version);

/** Reject lossy JSON, getters, cycles, exotic objects and excessive resource use before hashing. */
export function canonicalFamilyJson(value) {
  let nodes=0, chars=0;
  const active=new Set();
  function visit(x,depth) {
    if (++nodes > 50000 || depth > 32) throw new TypeError('family JSON limit exceeded');
    if (x === null || typeof x === 'boolean') return JSON.stringify(x);
    if (typeof x === 'number') {
      if (!Number.isFinite(x) || Object.is(x,-0)) throw new TypeError('non-canonical number');
      return JSON.stringify(x);
    }
    if (typeof x === 'string') {
      chars += x.length;
      if (chars > 1000000 || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(x)) throw new TypeError('invalid or excessive string');
      return JSON.stringify(x);
    }
    if (typeof x !== 'object' || active.has(x)) throw new TypeError('not a JSON tree');
    const array=Array.isArray(x), proto=Object.getPrototypeOf(x);
    if (array ? proto !== Array.prototype : proto !== Object.prototype && proto !== null) throw new TypeError('non-plain JSON');
    const all=Reflect.ownKeys(x), names=Object.keys(x);
    if (all.some(k=>typeof k !== 'string') || all.length !== names.length+(array?1:0)) throw new TypeError('hidden JSON properties');
    for (const k of names) {
      chars += k.length;
      if (chars > 1000000 || !('value' in Object.getOwnPropertyDescriptor(x,k))) throw new TypeError('invalid JSON property');
    }
    if (array && (names.length !== x.length || names.some((k,i)=>k !== String(i)))) throw new TypeError('sparse or decorated array');
    active.add(x);
    const result=array ? '['+x.map(v=>visit(v,depth+1)).join(',')+']'
      : '{'+names.sort().map(k=>visit(k,depth+1)+':'+visit(x[k],depth+1)).join(',')+'}';
    active.delete(x); return result;
  }
  return visit(value,0);
}
function validate(input, check) {
  try { canonicalFamilyJson(input); return check(input) ? {valid:true,errors:[]} : {valid:false,errors:['invalid family contract shape or values']}; }
  catch(e) { return {valid:false,errors:[e.message]}; }
}
export function validateEvidenceEnvelope(input) {
  return validate(input, e => keys(e,['schemaVersion','id','producer','subject','scope','payloadSchema','payload','payloadSha256','sources','createdAt','expiresAt','claims','envelopeSha256'])
    && e.schemaVersion === FAMILY_CONTRACT_VERSION && name(e.id) && ref(e.producer) && subject(e.subject)
    && name(e.scope) && schema(e.payloadSchema) && hash(e.payloadSha256) && hash(e.envelopeSha256)
    && time(e.createdAt) && time(e.expiresAt) && Date.parse(e.createdAt) < Date.parse(e.expiresAt)
    && list(e.sources,s=>keys(s,['id','originalSha256','extractionSha256']) && name(s.id) && hash(s.originalSha256) && (s.extractionSha256 === null || hash(s.extractionSha256)),100)
    && unique(e.sources.map(s=>s.id))
    && list(e.claims,c=>keys(c,['dimension','assertion','verifierId','evidenceSha256']) && VERIFICATION_DIMENSIONS.includes(c.dimension)
      && ['supported','contradicted','unknown'].includes(c.assertion) && name(c.verifierId) && hash(c.evidenceSha256),5)
    && unique(e.claims.map(c=>c.dimension)));
}
const qualification = q => keys(q,['kind','platform','sourceSha256','artifactSha256','checkedAt','expiresAt','verifierId'])
  && ['source_tests','native_runtime'].includes(q.kind) && name(q.platform) && hash(q.sourceSha256) && hash(q.artifactSha256)
  && time(q.checkedAt) && time(q.expiresAt) && Date.parse(q.checkedAt)<Date.parse(q.expiresAt) && name(q.verifierId);
export function validateFamilyRegistry(input) {
  return validate(input,r => keys(r,['schemaVersion','releases']) && r.schemaVersion === FAMILY_CONTRACT_VERSION
    && list(r.releases,e=>keys(e,['ref','version','sourceArtifact','availability','packages','schemas','dependencies','qualification'])
      && ref(e.ref) && name(e.version) && name(e.sourceArtifact) && ['available','reference_only'].includes(e.availability)
      && list(e.packages,p=>keys(p,['name','version','artifactSha256']) && name(p.name) && name(p.version) && hash(p.artifactSha256),100)
      && unique(e.packages.map(p=>p.name)) && list(e.schemas,schema,200) && unique(e.schemas.map(s=>s.id+'@'+s.version))
      && list(e.dependencies,ref,100) && unique(e.dependencies.map(d=>d.product))
      && list(e.qualification,qualification,100) && e.qualification.every(q=>q.sourceSha256 === e.ref.sourceSha256))
    && unique(r.releases.map(e=>e.ref.product+'@'+e.ref.releaseId))
    && r.releases.every(e=>e.dependencies.every(d=>r.releases.some(t=>canonicalFamilyJson(t.ref) === canonicalFamilyJson(d)))));
}
export function validateCompatibilityRecord(input) {
  return validate(input,c=>keys(c,['schemaVersion','consumer','dependency','adapterVersion','platform','suiteSha256','resultSha256','checkedAt','expiresAt','verifierId','outcome'])
    && c.schemaVersion === FAMILY_CONTRACT_VERSION && ref(c.consumer) && ref(c.dependency) && name(c.adapterVersion)
    && name(c.platform) && hash(c.suiteSha256) && hash(c.resultSha256) && time(c.checkedAt) && time(c.expiresAt)
    && Date.parse(c.checkedAt)<Date.parse(c.expiresAt) && name(c.verifierId) && ['pass','fail'].includes(c.outcome));
}
