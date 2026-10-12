# Standards and benchmarks

RuleOak distinguishes three things that are often incorrectly collapsed into one marketing claim:

1. **implemented/tested protocol behavior**;
2. **security-framework crosswalks**;
3. **external certifications or repository settings**.

Only the first can be proven completely from source and tests. The second documents relevant controls. The third requires evidence outside this archive.

The machine-readable source is [`../standards/security-crosswalk.json`](../standards/security-crosswalk.json).

## MCP 2026-07-28

RuleOak recognizes the modern stateless MCP `2026-07-28` generation on the surfaces it inspects/intercepts and retains compatibility behavior for earlier `2025-06-18` deployments. Tests cover protocol parsing, self-describing method/tool header consistency, capability identity/pins, HTTP/stdio interception and fail-closed mismatch handling.

This is not a claim that RuleOak implements every MCP client/server feature.

## OWASP Top 10 for Agentic Applications 2026

The Effect Boundary most directly addresses the consequences of tool misuse, privilege/authority abuse, cascading failures and rogue action execution. It partially contributes to supply-chain and unexpected-code-execution controls through capability drift, policy and bounded adapters.

RuleOak does **not** claim to solve memory poisoning, prompt/goal hijack, human trust exploitation or secure inter-agent communications by itself.

## OWASP Agent Control Standard (ACS)

ACS was announced in public preview on 2026-09-01. RuleOak has conceptually related middleware/interception, policy and observability/evidence surfaces, but **does not claim ACS conformance** in this release. A formal conformance claim requires a stable target plus explicit adapter/schema/conformance tests.

## OpenSSF OSPS Baseline

The source tree is prepared for OSPS Baseline `2026.08.28` the exact 24 Level-1 controls: open-source licensing, vulnerability process, contribution policy, automated security analysis, dependency review, CODEOWNERS, REUSE metadata, release/SBOM preparation and least-privilege workflows.

Several OSPS controls are hosted-repository properties. The fresh GitHub repository owner must enable MFA, branch rules, secret scanning/push protection, private vulnerability reporting and appropriate security settings before claiming repository-level conformance. See [`security/OPEN_SOURCE_SECURITY_BASELINE.md`](security/OPEN_SOURCE_SECURITY_BASELINE.md).

## SLSA and build provenance

The release-candidate workflow generates deterministic package artifacts, a release manifest, checksums and a deterministic CycloneDX 1.7 SBOM. The GitHub release workflow is configured for both package provenance and SBOM attestations, using immutable commit-pinned Actions.

Do not claim a SLSA Build level until a real artifact is produced on the authoritative GitHub workflow and its attestation verifies. The source configuration is preparation, not proof.

## OpenSSF Security Insights 2.2.0

`security-insights.yml` exposes machine-readable project/repository security metadata using the current 2.2.0 schema shape. Live URLs, hosted settings and released attestations remain external evidence.

## REUSE 3.3

Current first-party source is Apache-2.0. REUSE/SPDX metadata and CI lint are present. Historical release license terms are documented separately and are not retroactively changed.

## NIST SSDF

RuleOak's automated testing, vulnerability process, dependency controls, secure-release preparation and remediation policy map to SSDF practices. SSDF is process guidance; this is a crosswalk, not certification.

## Performance benchmarks

`npm run benchmark` prints machine-readable local microbenchmark results for policy/receipt/evidence and MCP boundaries. Environment details and limitations are always included.

```bash
npm run benchmark
npm run benchmark:release
```

Do not publish one machine's numbers as universal performance claims.

## Release-blocking standards checks

```bash
npm run check:workflow-security
npm run check:security-insights
npm run check:standards
npm run check:performance-budget
npm run check:release-reproducibility
npm run check:launch
```

These checks validate that the repository does not accidentally publish stale license/version/product positioning or unsupported external-framework claims.


## Official references

- MCP 2026-07-28: <https://blog.modelcontextprotocol.io/posts/2026-07-28/>
- OWASP Top 10 for Agentic Applications 2026: <https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/>
- OWASP Agent Control Standard: <https://genai.owasp.org/resource/agent-control-standard-acs/>
- OpenSSF OSPS Baseline 2026.08.28: <https://baseline.openssf.org/versions/2026-08-28>
- OpenSSF Security Insights v2.2.0: <https://github.com/ossf/security-insights/blob/main/docs/schema.md>
- SLSA v1.2: <https://slsa.dev/spec/v1.2/>
- GitHub artifact attestations: <https://docs.github.com/en/actions/concepts/security/artifact-attestations>
- REUSE 3.3: <https://reuse.software/spec/>
- NIST SSDF 1.1: <https://csrc.nist.gov/pubs/sp/800/218/final>
- npm trusted publishing: <https://docs.npmjs.com/trusted-publishers/>

The machine-readable launch benchmark is [`../standards/public-launch-readiness.json`](../standards/public-launch-readiness.json).
