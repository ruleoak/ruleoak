#!/usr/bin/env python3
# Copyright © 2026 The RuleOak Authors.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# SPDX-FileCopyrightText: 2026 The RuleOak Authors
# SPDX-License-Identifier: Apache-2.0

"""Basic RuleOak licensing hygiene checks. Run from repository root."""
from __future__ import annotations
import sys
from pathlib import Path

REQUIRED = [
    'LICENSE.md',
    'LICENSES/Apache-2.0.txt',
    'LICENSES/MIT.txt',
    'TRADEMARK.md',
    'DCO.md',
    'CONTRIBUTING.md',
    'NOTICE.md',
    'REUSE.toml',
    'AUTHORS.md',
    '.github/workflows/ci.yml',
    'packages/protocol/LICENSE',
    'packages/core/LICENSE',
    'packages/cli/LICENSE',
]
FORBIDDEN = ['LICENSE']
SKIP_DIRS = {'.git', 'node_modules', 'dist', 'build', 'coverage', '.venv', 'venv', '__pycache__', 'vendor'}
EXTS = {'.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py'}
SPDX_COPYRIGHT_FIELD = 'SPDX-' + 'FileCopyrightText:'
SPDX_LICENSE_FIELD = 'SPDX-' + 'License-Identifier:'
MAPPED_PREFIXES = {
    'packages/protocol/': 'MIT',
    'packages/core/': 'Apache-2.0',
    'packages/cli/': 'Apache-2.0',
    'docs/': 'Apache-2.0',
    'site/': 'Apache-2.0',
    'tests/': 'Apache-2.0',
    'scripts/': 'Apache-2.0',
}

def skip(path: Path) -> bool:
    return any(part in SKIP_DIRS for part in path.parts)

def expected(rel: str):
    for prefix, lic in MAPPED_PREFIXES.items():
        if rel.startswith(prefix):
            return lic
    return None

def main() -> int:
    root = Path('.').resolve()
    errors = []
    for req in REQUIRED:
        if not (root / req).exists():
            errors.append(f'Missing required file: {req}')
    for forbidden in FORBIDDEN:
        if (root / forbidden).exists():
            errors.append(f'Forbidden ambiguous root file exists: {forbidden}; use LICENSE.md license map instead')
    for path in root.rglob('*'):
        if not path.is_file() or path.suffix not in EXTS:
            continue
        rel_path = path.relative_to(root)
        if skip(rel_path):
            continue
        rel = rel_path.as_posix()
        exp = expected(rel)
        if not exp:
            continue
        head = '\n'.join(path.read_text(encoding='utf-8', errors='replace').splitlines()[:50])
        if f'{SPDX_LICENSE_FIELD} {exp}' not in head:
            errors.append(f'Missing/wrong SPDX header in {rel}; expected {exp}')
        if f'{SPDX_COPYRIGHT_FIELD} 2026 The RuleOak Authors' not in head:
            errors.append(f'Missing SPDX-FileCopyrightText in {rel}')
    for candidate in ['LICENSE.md', 'NOTICE.md', 'TRADEMARK.md', 'REUSE.toml', 'packages/core/LICENSE', 'packages/cli/LICENSE', 'packages/protocol/LICENSE']:
        text = (root / candidate).read_text(encoding='utf-8', errors='replace') if (root / candidate).exists() else ''
        if 'RuleOak contributors' in text:
            errors.append(f'Ambiguous contributor copyright wording remains in {candidate}')
        if 'RuleOak, Inc.' in text:
            errors.append(f'Unformed entity copyright wording found in {candidate}')
        if 'Copyright © 2026 Sun Shaobin' in text or 'Copyright 2026 Sun Shaobin' in text or 'Copyright (c) 2026 Sun Shaobin' in text:
            errors.append(f'Personal-name copyright holder remains in {candidate}; use The RuleOak Authors')
    ci = root / '.github/workflows/ci.yml'
    if ci.exists() and 'fsfe/reuse-action@v6' not in ci.read_text(encoding='utf-8', errors='replace'):
        errors.append('CI workflow must include fsfe/reuse-action@v6')
    if errors:
        print('RuleOak licensing check FAILED:')
        for e in errors:
            print(f' - {e}')
        return 1
    print('RuleOak licensing check PASSED.')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
