/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { URL } from 'node:url';
import { isLoopbackHost, parseListenAddress } from '../http-gateway.js';
import { readFlightState, revokeWorkspaceAuthority } from './store.js';

const SESSION = 'ruleoak_flight_session';
const MAX_REQUEST_BYTES = 1024 * 1024;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const DEFAULT_CALLBACK_TIMEOUT_MS = 5000;

function send(res, status, body, type = 'application/json; charset=utf-8', extra = {}) {
  if (res.headersSent) { res.destroy(); return; }
  const payload=type.startsWith('application/json') ? JSON.stringify(body) : String(body ?? '');
  if(Buffer.byteLength(payload)>MAX_RESPONSE_BYTES)throw Object.assign(new Error(`Flight Control response exceeds maxBytes (${MAX_RESPONSE_BYTES})`),{statusCode:500});
  res.writeHead(status, {
    'content-type': type,
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    ...extra
  });
  res.end(payload);
}
function boundedCallbackTimeout(value){const n=Number(value??DEFAULT_CALLBACK_TIMEOUT_MS);if(!Number.isFinite(n)||n<50||n>60000)throw new Error('callbackTimeoutMs must be between 50 and 60000');return Math.floor(n);}
async function invokeBounded(fn,args,timeoutMs,label){const controller=new AbortController();let timer;try{return await Promise.race([Promise.resolve().then(()=>fn(...args,{signal:controller.signal})),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Object.assign(new Error(`${label} timed out after ${timeoutMs}ms`),{statusCode:504}));},timeoutMs);})]);}finally{if(timer)clearTimeout(timer);controller.abort();}}
function cookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map(x => x.trim()).filter(Boolean).map(x => {
    const i = x.indexOf('='); return [decodeURIComponent(x.slice(0, i)), decodeURIComponent(x.slice(i + 1))];
  }));
}
async function body(req) {
  const chunks=[];let bytes=0;
  for await (const c of req) {const b=Buffer.from(c);bytes+=b.length;if(bytes>MAX_REQUEST_BYTES)throw Object.assign(new Error('request too large'),{statusCode:413});chunks.push(b);}
  const s=Buffer.concat(chunks).toString('utf8');return s ? JSON.parse(s) : {};
}
function positiveInt(value, name, { min = 1, max = Number.MAX_SAFE_INTEGER, optional = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (optional) return undefined;
    throw new Error(`${name} is required`);
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${name} must be an integer from ${min} to ${max}`);
  return n;
}
export function normalizeBoundedEnvelopeRequest(input = {}, now = new Date()) {
  const grantId = String(input.grant_id || '').trim();
  const action = String(input.action || '').trim();
  const resource = String(input.resource || '').trim();
  if (!grantId) throw new Error('grant_id is required');
  if (!action) throw new Error('action is required');
  if (!resource) throw new Error('resource is required');
  const ttlMinutes = positiveInt(input.ttl_minutes, 'ttl_minutes', { min: 1, max: 1440, optional: false });
  const maxExecutions = positiveInt(input.max_executions, 'max_executions', { min: 1, max: 100000 });
  const maxObjects = positiveInt(input.max_objects, 'max_objects', { min: 1, max: 100000000 });
  const network = ['inherit', 'allow', 'deny'].includes(input.network) ? input.network : 'deny';
  return {
    grant_id: grantId,
    capabilities: [{ id: 'flight_control_bounded', actions: [action], resources: [resource] }],
    constraints: {
      ...(maxExecutions !== undefined ? { max_executions: maxExecutions } : {}),
      ...(maxObjects !== undefined ? { max_objects: maxObjects } : {}),
      network,
      delegation_allowed: input.delegation_allowed === true
    },
    obligations: [{ type: 'require_effect_receipt' }],
    expires_at: new Date(now.getTime() + ttlMinutes * 60_000).toISOString()
  };
}

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RuleOak Flight Control</title><link rel="stylesheet" href="/app.css"></head><body><header><h1>RuleOak Flight Control</h1><p>Local agent action control</p></header><main><section><h2>Pending actions</h2><div id="pending"></div></section><section><h2>Bounded authority</h2><form id="authorityForm" class="card"><label>Parent grant<select id="grant" required></select></label><label>Action<input id="action" required placeholder="resource.write"></label><label>Resource<input id="resource" required placeholder="ruleoak://file/project/**"></label><div class="row"><label>TTL minutes<input id="ttl" type="number" min="1" max="1440" value="15" required></label><label>Max executions<input id="maxExecutions" type="number" min="1" value="1"></label><label>Max objects<input id="maxObjects" type="number" min="1" placeholder="optional"></label></div><label>Network<select id="network"><option value="deny">Deny</option><option value="inherit">Inherit parent</option><option value="allow">Allow</option></select></label><label><input id="delegation" type="checkbox"> Allow delegation</label><button type="button" id="previewAuthority">Preview</button><button type="submit">Create bounded authority</button><p class="muted">The envelope must be narrower than the signed parent grant. RuleOak never stores the signing secret in this workspace.</p><p id="authorityMessage" role="status"></p></form><div id="authority"></div></section><section><h2>Capabilities</h2><div id="caps"></div></section><section><h2>Flight Recorder</h2><div id="events"></div></section></main><script src="/app.js" defer></script></body></html>`;
const css = `:root{font-family:system-ui,sans-serif;color-scheme:light dark}body{max-width:1100px;margin:auto;padding:1rem}header{border-bottom:1px solid #888;padding-bottom:1rem}section{margin:2rem 0}.card{border:1px solid #888;border-radius:10px;padding:1rem;margin:.7rem 0}button,input,select{padding:.55rem .65rem;margin:.2rem}button:focus,input:focus,select:focus{outline:3px solid currentColor}.danger{font-weight:700}code{word-break:break-all}.muted{opacity:.75}label{display:block;margin:.5rem 0}.row{display:flex;gap:.7rem;flex-wrap:wrap}.row label{flex:1;min-width:160px}`;
const js = `let csrf='',refreshing=false;async function api(path,opt={}){const c=new AbortController(),t=setTimeout(()=>c.abort(),5000);try{const r=await fetch(path,{...opt,signal:c.signal,headers:{'content-type':'application/json','x-ruleoak-csrf':csrf,...(opt.headers||{})}});const text=await r.text();let parsed={};try{parsed=text?JSON.parse(text):{}}catch{parsed={error:text}}if(!r.ok)throw new Error(parsed.error||text||('HTTP '+r.status));return parsed}finally{clearTimeout(t)}}function esc(v){return String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}function grantLabel(g){return (g.subject?.id||g.grant_id)+' · '+g.grant_id}async function refresh(){if(refreshing)return;refreshing=true;try{const s=await api('/api/state');csrf=s.csrf;pending.innerHTML=s.pending.length?s.pending.map(p=>\`<div class=card><strong>\${esc(p.summary||p.action?.type||p.approval_id)}</strong><p>\${esc(p.action?.target||p.normalized_call?.target?.resource||'')}</p><button data-id="\${esc(p.approval_id)}" data-d="deny_once">Block</button><button data-id="\${esc(p.approval_id)}" data-d="allow_once">Allow once</button></div>\`).join(''):'<p class=muted>No pending actions.</p>';const old=grant.value;grant.innerHTML=s.authority.grants.map(g=>\`<option value="\${esc(g.grant_id)}">\${esc(grantLabel(g))}</option>\`).join('');if(old&&[...grant.options].some(o=>o.value===old))grant.value=old;authorityForm.querySelector('button').disabled=!s.authority.grants.length;authority.innerHTML=\`<p>Grants: \${s.authority.grants.length} · Envelopes: \${s.authority.envelopes.length} · Leases: \${s.authority.leases.length} · Revocations: \${s.authority.revocations.length}</p>\`+[...s.authority.envelopes,...s.authority.leases].map(a=>\`<div class=card><code>\${esc(a.envelope_id||a.lease_id)}</code><p>\${esc((a.capabilities||[]).flatMap(c=>c.actions||[]).join(', '))}</p><button data-rtype="\${a.envelope_id?'authority_envelope':'execution_lease'}" data-rid="\${esc(a.envelope_id||a.lease_id)}">Revoke</button></div>\`).join('');caps.innerHTML=s.capability_manifests.length?s.capability_manifests.map(m=>\`<div class=card><strong>\${esc(m.identity?.name)}</strong><p>\${m.summary?.total||0} tools · \${m.summary?.state_changing||0} state-changing · \${m.summary?.destructive||0} destructive</p></div>\`).join(''):'<p class=muted>No saved capability manifests.</p>';events.innerHTML=s.events.slice().reverse().slice(0,40).map(e=>\`<div class=card><strong>\${esc(e.event_type||e.action?.type)}</strong><p>\${esc(e.decision?.action)} — \${esc(e.decision?.reason)}</p><code>\${esc(e.event_id)}</code></div>\`).join('');document.querySelectorAll('button[data-id]').forEach(b=>b.onclick=async()=>{try{await api('/api/approve',{method:'POST',body:JSON.stringify({id:b.dataset.id,decision:b.dataset.d})});await refresh()}catch(e){console.error(e)}});document.querySelectorAll('button[data-rid]').forEach(b=>b.onclick=async()=>{try{await api('/api/revoke',{method:'POST',body:JSON.stringify({type:b.dataset.rtype,id:b.dataset.rid})});await refresh()}catch(e){console.error(e)}})}finally{refreshing=false}}function envelopePayload(){return{grant_id:grant.value,action:action.value,resource:resource.value,ttl_minutes:ttl.value,max_executions:maxExecutions.value,max_objects:maxObjects.value,network:network.value,delegation_allowed:delegation.checked}}previewAuthority.onclick=async()=>{authorityMessage.textContent='';try{const r=await api('/api/envelope/preview',{method:'POST',body:JSON.stringify(envelopePayload())});authorityMessage.textContent=r.preview.ok?'Preview valid: '+r.preview.envelope.capabilities[0].actions.join(', ')+' → '+r.preview.envelope.capabilities[0].resources.join(', '):r.preview.errors.join('; ')}catch(err){authorityMessage.textContent=err.message}};authorityForm.onsubmit=async(e)=>{e.preventDefault();authorityMessage.textContent='';try{const result=await api('/api/envelope',{method:'POST',body:JSON.stringify(envelopePayload())});authorityMessage.textContent='Created '+result.envelope.envelope_id;await refresh()}catch(err){authorityMessage.textContent=err.message}};refresh().catch(e=>document.body.insertAdjacentHTML('beforeend','<pre>'+esc(e.message)+'</pre>'));setInterval(()=>refresh().catch(()=>{}),3000);`;

export function createFlightControlServer(baseDir, options = {}) {
  const listen = parseListenAddress(options.listen || '127.0.0.1:0');
  if (!isLoopbackHost(listen.host)) throw new Error('Flight Control is loopback-only');
  const token = options.token || randomBytes(24).toString('base64url');
  const csrf = options.csrf || randomBytes(24).toString('base64url');
  const callbackTimeoutMs=boundedCallbackTimeout(options.callbackTimeoutMs);
  let origin = null;
  const server = createServer(async (req, res) => {
    try {
      const host = String(req.headers.host || '');
      if (origin && host !== new URL(origin).host) { send(res, 400, { error: 'invalid host' }); return; }
      const url = new URL(req.url || '/', origin || `http://${host || '127.0.0.1'}`);
      if (url.pathname === '/' && url.searchParams.get('token') === token) {
        send(res, 302, '', 'text/plain', { 'set-cookie': `${SESSION}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/`, location: '/' }); return;
      }
      if (url.pathname === '/app.css') { send(res, 200, css, 'text/css; charset=utf-8'); return; }
      if (url.pathname === '/app.js') { send(res, 200, js, 'application/javascript; charset=utf-8'); return; }
      const authed = cookies(req)[SESSION] === token;
      if (!authed) { send(res, 401, { error: 'local Flight Control session required' }); return; }
      if (req.method === 'POST') {
        if (origin && req.headers.origin && req.headers.origin !== origin) { send(res, 403, { error: 'origin rejected' }); return; }
        if (req.headers['x-ruleoak-csrf'] !== csrf) { send(res, 403, { error: 'CSRF token rejected' }); return; }
      }
      if (url.pathname === '/' && req.method === 'GET') { send(res, 200, html, 'text/html; charset=utf-8'); return; }
      if (url.pathname === '/api/state' && req.method === 'GET') { send(res, 200, { ...readFlightState(baseDir), csrf }); return; }
      if (url.pathname === '/api/approve' && req.method === 'POST') {
        const b = await body(req); if (!options.decideApproval) throw new Error('approval callback unavailable');
        send(res, 200, { ok: true, result: await invokeBounded(options.decideApproval,[b.id,b.decision],callbackTimeoutMs,'approval callback') }); return;
      }
      if (url.pathname === '/api/envelope/preview' && req.method === 'POST') {
        if (!options.previewEnvelope) throw new Error('bounded authority preview is unavailable; configure a local authority signing secret');
        const spec = normalizeBoundedEnvelopeRequest(await body(req), options.now ? new Date(options.now) : new Date());
        const preview = await invokeBounded(options.previewEnvelope,[spec],callbackTimeoutMs,'authority preview callback'); send(res, preview.ok ? 200 : 400, { ok: preview.ok, preview, errors: preview.errors }); return;
      }
      if (url.pathname === '/api/envelope' && req.method === 'POST') {
        if (!options.createEnvelope) throw new Error('bounded authority authoring is unavailable; configure a local authority signing secret');
        const spec = normalizeBoundedEnvelopeRequest(await body(req), options.now ? new Date(options.now) : new Date());
        const result = await invokeBounded(options.createEnvelope,[spec],callbackTimeoutMs,'authority create callback'); send(res, 200, { ok: true, ...result }); return;
      }
      if (url.pathname === '/api/revoke' && req.method === 'POST') {
        const b = await body(req); const record = revokeWorkspaceAuthority(baseDir, b.type, b.id, { reason: 'revoked from Flight Control' });
        let warning=null;if(options.onRevocation)try{await invokeBounded(options.onRevocation,[record],callbackTimeoutMs,'revocation callback');}catch(error){warning=`revocation persisted but callback failed: ${error.message}`;}send(res,200,{ok:true,record,...(warning?{warning}:{})});return;
      }
      send(res, 404, { error: 'not found' });
    } catch (e) { if(res.headersSent){res.destroy(e);return;}send(res,e.statusCode||400,{error:e.message}); }
  });
  return {
    server, token, csrf,
    async start() { await new Promise((ok, no) => { server.once('error', no); server.listen(listen.port, listen.host, ok); }); const a = server.address(); origin = `http://${listen.host}:${a.port}`; return { host: listen.host, port: a.port, url: `${origin}/?token=${encodeURIComponent(token)}` }; },
    async close() { if (!server.listening) return; await new Promise((ok, no) => server.close(e => e ? no(e) : ok())); }
  };
}
