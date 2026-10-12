/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function arg(name, fallback) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : fallback; }
const out = resolve(arg('--out', 'release-candidate/sbom.cdx.json'));
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const root = JSON.parse(readFileSync('package.json', 'utf8'));
const components = [];
for (const [path, item] of Object.entries(lock.packages || {})) {
  if (!item?.name || path.startsWith('node_modules/')) continue;
  components.push({
    type: 'library',
    'bom-ref': `pkg:npm/${encodeURIComponent(item.name)}@${item.version}`,
    name: item.name,
    version: item.version,
    licenses: item.license ? [{ license: { id: item.license } }] : undefined,
    purl: `pkg:npm/${encodeURIComponent(item.name)}@${item.version}`
  });
}
components.sort((a,b) => a.name.localeCompare(b.name));
const serialSeed = JSON.stringify({ version: root.version, components: components.map(c => [c.name,c.version]) });
const serial = createHash('sha256').update(serialSeed).digest('hex');
const sbom = {
  bomFormat: 'CycloneDX',
  specVersion: '1.7',
  serialNumber: `urn:uuid:${serial.slice(0,8)}-${serial.slice(8,12)}-${serial.slice(12,16)}-${serial.slice(16,20)}-${serial.slice(20,32)}`,
  version: 1,
  metadata: {
    component: { type: 'application', name: root.name, version: root.version, licenses: [{ license: { id: 'Apache-2.0' } }] },
    tools: { components: [{ type: 'application', name: 'RuleOak deterministic SBOM generator', version: '1.0' }] }
  },
  components
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(sbom, null, 2) + '\n');
console.log(out);
