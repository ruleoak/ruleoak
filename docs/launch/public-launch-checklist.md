# RuleOak Core v2.1.0 Public Release Checklist

Use this checklist before publishing RuleOak Core v2.1.0 or announcing it externally.

## Release identity

- [ ] Latest public release is stated as **v2.1.0**.
- [ ] Previous public release is stated as **v2.0.3** only where history is useful.
- [ ] Earlier public baseline is stated as **v1.0.1** only where history is useful.
- [ ] No page implies a newer public major release.

## Developer first-run

- [ ] `npm install` succeeds.
- [ ] `npm run quickstart:all` succeeds.
- [ ] `npm run adoption:check` succeeds.
- [ ] `npm run release:public-check` succeeds.
- [ ] `npm run release:install-smoke` succeeds from the packed tarball.
- [ ] README shows the shortest path before deep architecture sections.
- [ ] Demo GIF is visible from README and website.

## Governance proof

- [ ] `npm run protocol:kit` passes.
- [ ] `npm run policy:pack:validate` passes.
- [ ] `npm run policy:pack:scenarios` passes.
- [ ] `npm run integrity:verify` passes.
- [ ] `npm run audit:viewer:v2:check` passes.

## Trust proof

- [ ] `npm run release:consistency` passes.
- [ ] `npm run trust:check` passes.
- [ ] `npm test` passes.
- [ ] `npm pack --dry-run` excludes generated `out/`, `reports/`, `node_modules`, credentials, and private signing keys.
- [ ] Security model and AGPL/commercial boundary are linked from README and website.

## Launch content

- [ ] GitHub release notes use narrow claims.
- [ ] Website homepage points to Start in 10 minutes.
- [ ] Public launch page links to quickstart, protocol, adapters, policy packs, approval UX, audit viewer, and signed integrity.
