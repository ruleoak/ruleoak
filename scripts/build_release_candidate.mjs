/* SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
 * SPDX-License-Identifier: Apache-2.0 */
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

function arg(name, fallback) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : fallback
}
function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}
function json(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

const outDir = resolve(arg('--out-dir', 'release-candidate'))
mkdirSync(outDir, { recursive: true })
const root = json('package.json')
const createdAtArg=arg('--created-at',null)
const createdAt=createdAtArg || (process.env.SOURCE_DATE_EPOCH ? new Date(Number(process.env.SOURCE_DATE_EPOCH)*1000).toISOString() : '2000-01-01T00:00:00.000Z')
const core=await import(pathToFileURL(resolve('packages/core/src/index.js')).href)
const packages = []
for (const workspace of ['@ruleoak/protocol', '@ruleoak/core', '@ruleoak/cli']) {
  const packed = JSON.parse(execFileSync('npm', ['pack', '--json', '--workspace', workspace, '--pack-destination', outDir], { encoding: 'utf8' }))
  const item = packed.at(-1)
  const path = resolve(outDir, item.filename)
  packages.push({
    name: item.name,
    version: item.version,
    filename: basename(path),
    size: item.size,
    unpacked_size: item.unpackedSize,
    integrity: item.integrity,
    sha256: sha256(path)
  })
}

const sbomPath = resolve(outDir, 'sbom.cdx.json')
execFileSync(process.execPath, ['scripts/generate_sbom.mjs', '--out', sbomPath], { stdio: 'inherit' })
const sbom = {
  filename: basename(sbomPath),
  format: 'CycloneDX',
  spec_version: '1.7',
  sha256: sha256(sbomPath)
}

const manifest = {
  manifest_version: '1.0',
  project: 'RuleOak',
  version: root.version,
  created_at: createdAt,
  repository: 'https://github.com/ruleoak/ruleoak',
  website: 'https://ruleoak.com',
  node: root.engines?.node,
  contracts:{adapter_contract:core.ADAPTER_CONTRACT_VERSION,execution_lease:'1.0',effect_receipt:'1.0',authority_envelope:'1.0'},
  supported_mcp_protocols:[...(core.SUPPORTED_MCP_PROTOCOLS||[])],
  source_digests:{package_lock:sha256(resolve('package-lock.json')),public_product_truth:sha256(resolve('docs/project/PUBLIC_PRODUCT_TRUTH.md')),security_boundary:sha256(resolve('docs/security/BOUNDARY.md'))},
  packages,
  sbom,
  provenance: {
    workflow: '.github/workflows/release-candidate.yml',
    attestation_expected: true,
    slsa_level_claim: null
  }
}
const manifestPath = resolve(outDir, 'release-manifest.json')
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
const publishPlan = {
  publish_plan_version: '1.0',
  project: 'RuleOak Community',
  version: root.version,
  exact_tag: `v${root.version}`,
  package_order: packages.map(item => ({ name: item.name, filename: item.filename, sha256: item.sha256 })),
  modes: {
    initial_direct: {
      workflow_input: 'initial-direct',
      use_only_when_packages_do_not_exist: true,
      mechanism: 'GitHub Actions trusted publishing (OIDC) using npm publish',
      human_review_before_workflow: true
    },
    subsequent_staged: {
      workflow_input: 'stage-existing',
      requires_packages_to_exist: true,
      mechanism: 'GitHub Actions trusted publishing (OIDC) using npm stage publish',
      human_2fa_approval_after_staging: true,
      approval_order: ['@ruleoak/protocol', '@ruleoak/core', '@ruleoak/cli']
    }
  },
  external_prerequisites: [
    'GitHub exact release tag and protected repository settings',
    'npm trusted-publisher relationship for publish.yml and environment npm',
    'owner review of release candidate, SBOM, manifest and hashes',
    'registry/provenance verification after actual publication'
  ],
  external_adoption_proven: false
}
const publishPlanPath = resolve(outDir, 'publish-plan.json')
writeFileSync(publishPlanPath, JSON.stringify(publishPlan, null, 2) + '\n')
writeFileSync(resolve(outDir, 'SHA256SUMS.txt'), [
  ...packages.map(item => `${item.sha256}  ${item.filename}`),
  `${sha256(manifestPath)}  release-manifest.json`,
  `${sbom.sha256}  ${sbom.filename}`,
  `${sha256(publishPlanPath)}  publish-plan.json`
].join('\n') + '\n')
console.log(`release candidate created: ${outDir}`)
