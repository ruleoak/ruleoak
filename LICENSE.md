# RuleOak Repository Licensing

This repository contains multiple packages with different open-source licenses. This file is a license map for the repository. It is not intended to relicense every file in the repository under one blanket license.

Copyright © 2026 The RuleOak Authors.

## Package license map

| Repository path | Package / content | License | Full license text |
|---|---|---:|---|
| `packages/protocol/` | RuleOak protocol definitions, schemas, fixtures, and protocol-only examples | MIT | `LICENSES/MIT.txt`; package file: `packages/protocol/LICENSE` |
| `packages/core/` | RuleOak Core runtime, policy evaluator, recorder, and security-boundary code | Apache-2.0 | `LICENSES/Apache-2.0.txt`; package file: `packages/core/LICENSE` |
| `packages/cli/` | RuleOak command-line interface and stream gate | Apache-2.0 | `LICENSES/Apache-2.0.txt`; package file: `packages/cli/LICENSE` |
| `docs/`, `site/`, `tests/`, `scripts/`, `.github/` | Project documentation, website source, tests, release-maintenance scripts, and project workflow files | Apache-2.0 unless a file says otherwise | `LICENSES/Apache-2.0.txt` |

## File-level SPDX notices

Source files should include file-level SPDX notices, for example:

```text
SPDX-FileCopyrightText: 2026 The RuleOak Authors
SPDX-License-Identifier: Apache-2.0
```

or, for protocol files:

```text
SPDX-FileCopyrightText: 2026 The RuleOak Authors
SPDX-License-Identifier: MIT
```

Where comments are not practical, this repository uses package-local `LICENSE` files and `REUSE.toml` annotations.

## Trademarks

The RuleOak name, RuleOak logo, and related branding are not licensed under the code licenses above. See `TRADEMARK.md`.

## Contributions

Contributions are accepted under the license of the package or file being changed. Contributors must certify their contributions using the Developer Certificate of Origin sign-off process described in `DCO.md` and `CONTRIBUTING.md`.

Important: DCO is intentionally lightweight, but it does not automatically give the RuleOak project maintainer, or any future RuleOak legal entity, a separate right to relicense contributor-owned code under a future proprietary or dual-license model. If RuleOak later needs commercial relicensing of externally contributed code, contributor consent or a CLA may be required.

## Third-party dependencies

Third-party dependencies retain their own licenses. This repository's license map does not override dependency licenses, package-manager metadata, vendored dependency notices, or third-party attribution requirements.

## Archived repositories and legacy code

Archived RuleOak adapter repositories are not automatically part of the supported project. Each archived repository should contain a visible archive banner and a clear license statement at the time of archive. Prefer Apache-2.0 for inert old adapter code only if the relevant rights holder owns all required rights and no third-party terms block relicensing.
