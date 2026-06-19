# Public Release Checklist

Use this checklist before publishing any public RuleOak Core release after v2.1.0.

## Version positioning

- [ ] Latest public release is stated accurately.
- [ ] v1.0.1 remains the earlier public baseline.
- [ ] RuleOak Core v2.1.0 are not marketed as a public future major release.
- [ ] package metadata, docs, and website release labels are consistent.
- [ ] `docs/release-versioning.md` is updated if the public release line changes.

## Validation

Run:

```bash
npm install
npm test
npm run release:consistency
npm run trust:check
npm run validate:release
npm run policy:pack:validate
npm run policy:pack:scenarios
npm run policy:pack:compatibility
npm run protocol:status
npm run protocol:conformance
npm run protocol:replay
npm pack --dry-run
```

## Package hygiene

- [ ] package tarball excludes generated reports.
- [ ] package tarball excludes local `out/` folders.
- [ ] package tarball excludes `node_modules`.
- [ ] `exports` entries point to runnable JavaScript and matching declarations.
- [ ] license and notice files are included.

## Trust assets

- [ ] security model page is current.
- [ ] AGPL/commercial boundary is current.
- [ ] claims do not overstate compliance or sandbox guarantees.
- [ ] reference verticals use synthetic data only.
- [ ] examples generate replayable governance artifacts.
- [ ] demo playbook still matches actual commands.

## Website

- [ ] site link checker passes.
- [ ] homepage states the latest public release accurately.
- [ ] trust/security/licensing/demo pages are reachable from docs or navigation.
- [ ] no broken local links.
- [ ] no stale v1.x/v2.x wording except allowed release history.

## Human review

- [ ] README reviewed as first-time developer journey.
- [ ] SECURITY reviewed as security claim boundary.
- [ ] CONTRIBUTING reviewed as outside-contributor path.
- [ ] release notes reviewed for accurate public/private wording.
