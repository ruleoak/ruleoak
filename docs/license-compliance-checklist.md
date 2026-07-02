# RuleOak License Compliance Checklist

Use this before any public GitHub push.

## Must pass

```bash
npm test
python3 scripts/check_ruleoak_licensing.py
```

## Files that must exist

- `LICENSE.md`
- `LICENSES/Apache-2.0.txt`
- `LICENSES/MIT.txt`
- `packages/protocol/LICENSE`
- `packages/core/LICENSE`
- `packages/cli/LICENSE`
- `TRADEMARK.md`
- `DCO.md`
- `CONTRIBUTING.md`
- `NOTICE.md`
- `REUSE.toml`

## Must not exist

- ambiguous root `LICENSE` file that makes the whole monorepo look Apache-2.0 or MIT
- `RuleOak, Inc.` copyright wording before the legal entity exists
- `The RuleOak Authors and RuleOak contributors` as the primary copyright holder

## Source headers

- `packages/protocol/**`: MIT SPDX header
- `packages/core/**`: Apache-2.0 header
- `packages/cli/**`: Apache-2.0 header
- `docs/`, `site/`, `tests/`, `scripts/`: Apache-2.0 unless a file says otherwise

## Old repositories

Do not publish old adapters silently. Either:

1. relicense to Apache-2.0 if rights are clean, add an archive banner, then archive; or
2. keep legacy license, add a strong archive warning banner, then archive.
