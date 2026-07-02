#!/usr/bin/env python3
"""
Add RuleOak SPDX headers to source files.

Default mode is dry-run. Use --write to modify files.
Run from the repository root:

    python3 scripts/add_ruleoak_spdx_headers.py --write

The script is intentionally conservative:
- skips files that already contain SPDX-License-Identifier near the top;
- preserves shebang lines;
- skips node_modules, dist, build, coverage, .git, and vendor directories;
- maps packages/protocol to MIT and core/cli/tests/docs/site/scripts to Apache-2.0.
"""
from __future__ import annotations

import argparse
from pathlib import Path

SKIP_DIRS = {'.git', 'node_modules', 'dist', 'build', 'coverage', '.venv', 'venv', '__pycache__', 'vendor'}
EXTS = {'.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py'}

APACHE_BLOCK = """Copyright © 2026 Sun Shaobin.

Licensed under the Apache License, Version 2.0 (the \"License\");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an \"AS IS\" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

SPDX-FileCopyrightText: 2026 Sun Shaobin
SPDX-License-Identifier: Apache-2.0
"""

MIT_BLOCK = """Copyright © 2026 Sun Shaobin.
SPDX-FileCopyrightText: 2026 Sun Shaobin
SPDX-License-Identifier: MIT
"""

def license_for(path: Path) -> str | None:
    p = path.as_posix()
    if p.startswith('packages/protocol/'):
        return 'MIT'
    if p.startswith(('packages/core/', 'packages/cli/', 'docs/', 'site/', 'tests/', 'scripts/')):
        return 'Apache-2.0'
    return None

def header_for(ext: str, spdx: str) -> str:
    block = MIT_BLOCK if spdx == 'MIT' else APACHE_BLOCK
    if ext == '.py':
        return ''.join('# ' + line if line.strip() else '#\n' for line in block.splitlines(True)) + '\n'
    return '/*\n' + ''.join(' * ' + line if line.strip() else ' *\n' for line in block.splitlines(True)) + ' */\n\n'

def should_skip(path: Path) -> bool:
    return any(part in SKIP_DIRS for part in path.parts)

def has_spdx(text: str) -> bool:
    first = '\n'.join(text.splitlines()[:40])
    return 'SPDX-License-Identifier:' in first

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--write', action='store_true', help='modify files; without this flag, only prints planned changes')
    ap.add_argument('--root', default='.', help='repository root')
    args = ap.parse_args()
    root = Path(args.root).resolve()
    changed = []
    for path in root.rglob('*'):
        if not path.is_file() or path.suffix not in EXTS:
            continue
        rel = path.relative_to(root)
        if should_skip(rel):
            continue
        spdx = license_for(rel)
        if not spdx:
            continue
        text = path.read_text(encoding='utf-8')
        if has_spdx(text):
            continue
        header = header_for(path.suffix, spdx)
        if text.startswith('#!'):
            first, rest = text.split('\n', 1) if '\n' in text else (text, '')
            new_text = first + '\n' + header + rest
        else:
            new_text = header + text
        changed.append((rel.as_posix(), spdx))
        if args.write:
            path.write_text(new_text, encoding='utf-8')
    if changed:
        verb = 'Updated' if args.write else 'Would update'
        for rel, spdx in changed:
            print(f'{verb}: {rel} [{spdx}]')
    else:
        print('No files need SPDX header updates under the configured RuleOak package paths.')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
