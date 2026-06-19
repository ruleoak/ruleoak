# Package Publish Guardrails

Before publishing RuleOak Core v2.1.0 to a package registry or attaching a release artifact:

```bash
npm run launch:check
npm run release:public-check
npm run release:consistency
npm run trust:check
npm run protocol:kit
npm run integrity:verify
npm pack --dry-run
npm run release:install-smoke
npm test
```

## Manual review

Check the tarball for:

- no generated `out/` artifacts;
- no local `reports/` artifacts;
- no `node_modules/`;
- no private signing key;
- no credentials;
- no real enterprise data;
- clear license and notice files;
- README states latest public release as v2.1.0;
- demo GIF is included intentionally;

## Private keys

Never include a production private signing key in the repository or package. The checked-in trust root should only include public verification material and local-demo metadata.
