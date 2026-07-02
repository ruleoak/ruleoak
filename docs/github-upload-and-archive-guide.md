# RuleOak GitHub Upload and Archive Guide

This guide is written for the current RuleOak source split:

- active monorepo: `ruleoak`;
- website/static site repo: `ruleoak-site`;
- old adapter/proof repositories: archive or keep private unless explicitly revived.

## 1. Active monorepo upload

### 1.1 Create or update the GitHub repository

If the GitHub repository already exists:

```bash
cd /path/to/ruleoak
git status
git checkout main
git pull origin main
```

If the GitHub repository does not exist yet, create a new empty GitHub repo named `ruleoak`, then connect it:

```bash
cd /path/to/ruleoak
git init
git branch -M main
git remote add origin git@github.com:YOUR-GITHUB-USERNAME/ruleoak.git
```

### 1.2 Confirm local hygiene before push

```bash
npm install --ignore-scripts
npm test
python3 scripts/check_ruleoak_licensing.py
```

Expected result:

```text
root tests passed
RuleOak licensing check PASSED.
```

### 1.3 Commit and push

```bash
git add .
git commit -s -m "Clarify RuleOak package licensing and trademark policy"
git push -u origin main
```

If this is an update to an existing public repo, use a branch instead:

```bash
git checkout -b licensing-compliance-update
git add .
git commit -s -m "Clarify RuleOak package licensing and trademark policy"
git push -u origin licensing-compliance-update
```

Then open a pull request using the PR text in `github-text-fields/pull_request_body.md`.

## 2. Active monorepo GitHub text fields

Repository **About** description:

```text
RuleOak — evidence-governed AI tool-call runtime with policy gates, approvals, audit records, and protocol-first integration.
```

Repository **Website**:

```text
https://ruleoak.com
```

Repository **Topics**:

```text
ai-governance, ai-agents, tool-calling, policy-engine, evidence, audit-log, approvals, agent-safety, compliance, nodejs, cli, open-source
```

## 3. Release text for monorepo

Use this for a GitHub release or public changelog entry:

```md
# RuleOak licensing and compliance cleanup

This release clarifies RuleOak's package-level licensing model and removes ambiguous root licensing signals.

## Licensing model

- `@ruleoak/protocol`: MIT
- `@ruleoak/core`: Apache-2.0
- `@ruleoak/cli`: Apache-2.0
- Repository docs, tests, site source, and maintenance scripts: Apache-2.0 unless a file says otherwise

## Compliance files added

- `LICENSE.md` repository license map
- `LICENSES/Apache-2.0.txt` and `LICENSES/MIT.txt`
- package-local `LICENSE` files
- `REUSE.toml`
- file-level SPDX headers
- `TRADEMARK.md`
- `DCO.md`
- strengthened `CONTRIBUTING.md`

## Trademark clarification

The RuleOak name and branding are not licensed by MIT or Apache-2.0. Forks and modified distributions must be clearly renamed and must not imply official RuleOak status.

## Contribution clarification

RuleOak currently uses DCO sign-off, not a CLA. DCO is lightweight and adoption-friendly, but it does not automatically give Sun Shaobin or a future RuleOak legal entity proprietary relicensing rights over contributor-owned code.
```

## 4. Website repo upload

For `ruleoak-site`:

```bash
cd /path/to/ruleoak-site
git init
git branch -M main
git remote add origin git@github.com:YOUR-GITHUB-USERNAME/ruleoak-site.git
git add .
git commit -s -m "Publish RuleOak static site with license and trademark notices"
git push -u origin main
```

Website repo **About** description:

```text
Static website for RuleOak, the agent firewall and flight recorder for AI tool calls.
```

Website repo **Website**:

```text
https://ruleoak.com
```

Website repo **Topics**:

```text
ruleoak, ai-governance, ai-agents, static-site, agent-safety, audit-log
```

## 5. Old adapter / proof repo archive procedure

Do this for each old repo such as `ruleoak-adapters-ts`, `ruleoak-openclaw-adapter`, `ruleoak-agentic-skills`, `SafeDesk`, `Home Evidence`, `Creator Proof`, `Travel Proof`, `Freelancer Proof`, and `Personal Knowledge Proof`.

### Route A: relicense to Apache-2.0, then archive

Use only if Sun Shaobin owns all relevant code and no third-party terms block relicensing.

1. Replace root `LICENSE` with Apache-2.0.
2. Add `TRADEMARK.md` from this monorepo.
3. Put this at the top of README:

```md
> **ARCHIVED — unmaintained legacy RuleOak adapter.**
> This repository is no longer part of the supported RuleOak public launch surface.
> It is preserved for historical reference only. Current supported packages are
> `@ruleoak/protocol`, `@ruleoak/core`, and `@ruleoak/cli`.
```

4. Commit and tag:

```bash
git add .
git commit -s -m "Archive legacy RuleOak adapter under Apache-2.0"
git tag archive-2026-07-02
git push origin main --tags
```

5. On GitHub: repository → **Settings** → **Danger Zone** → **Archive this repository**.

### Route B: keep legacy license, add explicit archive warning

Use when rights are unclear or you do not want to relicense yet.

1. Keep the old `LICENSE` unchanged.
2. Add this at the top of README:

```md
> **ARCHIVED — unmaintained legacy RuleOak repository.**
> This repository is preserved for historical reference only. It is not part of
> the supported RuleOak public launch surface. Its license is the license shown
> in this repository as of the archive date. Do not infer that it follows the
> active RuleOak monorepo licensing model.
```

3. Add `TRADEMARK.md` if possible.
4. Commit and tag:

```bash
git add README.md TRADEMARK.md
git commit -s -m "Mark repository as archived legacy RuleOak code"
git tag archive-2026-07-02
git push origin main --tags
```

5. On GitHub: repository → **Settings** → **Danger Zone** → **Archive this repository**.

## 6. Final validation after upload

After upload/merge:

- open `LICENSE.md` and confirm it is a license map, not a blanket license;
- open `packages/protocol/LICENSE`, `packages/core/LICENSE`, and `packages/cli/LICENSE`;
- open `TRADEMARK.md`;
- open `DCO.md` and `CONTRIBUTING.md`;
- confirm GitHub did not show an obviously wrong single-license claim for the mixed monorepo;
- confirm old repos either stay private or show a visible archive banner.
