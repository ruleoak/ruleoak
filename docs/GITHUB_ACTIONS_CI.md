<!-- SPDX-FileCopyrightText: 2026 The RuleOak Authors -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# GitHub Actions CI

RuleOak uses `.github/workflows/ci.yml` as the repository CI workflow file.

The workflow runs on pushes and pull requests to `main` and `master` and performs:

- dependency installation with `npm install --ignore-scripts`
- the full publish-readiness check through `npm run check:publish`
- REUSE lint through `fsfe/reuse-action`

`npm run check:publish` includes tests, licensing hygiene, npm package metadata checks, structural checks, and npm tarball-content checks.
