# GitHub Actions CI

RuleOak uses four public workflows

## `ci.yml`

- Node.js 22 and 24 LTS plus Node.js 26 Current publish-readiness matrix on Linux
- Node.js 24 smoke tests on macOS and Windows
- Python setup for repository checks
- REUSE compliance
- concurrency cancellation for superseded CI runs

## `codeql.yml`

- JavaScript and TypeScript CodeQL analysis
- runs on pushes, pull requests, and weekly schedule
- uses the security-extended query suite

## `dependency-review.yml`

- reviews dependency changes on pull requests
- fails on moderate-or-higher known vulnerabilities
- enforces the repository dependency-license policy

## `publish.yml`

- manual version confirmation
- npm trusted publishing through OIDC
- automatic npm provenance through trusted publishing
- ordered publication of protocol, core, and CLI

Dependabot checks npm and GitHub Actions dependencies weekly
