## Summary

This PR clarifies RuleOak's package-level licensing and removes ambiguous root-license signals.

## Changes

- Replace root blanket `LICENSE` with `LICENSE.md` license map.
- Add `LICENSES/Apache-2.0.txt` and `LICENSES/MIT.txt`.
- Keep `@ruleoak/protocol` under MIT.
- Keep `@ruleoak/core` and `@ruleoak/cli` under Apache-2.0.
- Add file-level SPDX headers.
- Add `TRADEMARK.md` to protect the RuleOak name and branding.
- Add `DCO.md` and strengthen `CONTRIBUTING.md`.
- Add archive guidance for old adapters/proof repos.

## Test plan

```bash
npm test
python3 scripts/check_ruleoak_licensing.py
```

## Notes

DCO remains the right low-friction choice for this stage, but it does not automatically provide future proprietary relicensing rights over contributor-owned code. If a future commercial dual-license path becomes real, RuleOak may need contributor consent or a CLA for affected code.
