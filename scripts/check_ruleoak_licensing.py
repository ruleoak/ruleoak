#!/usr/bin/env python3
# Copyright © 2026 RuleOak Pte. Ltd.
# SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import sys
REQUIRED=['LICENSE','LICENSE.md','LICENSES/Apache-2.0.txt','TRADEMARK.md','DCO.md','CONTRIBUTING.md','NOTICE.md','AUTHORS.md','SECURITY.md','GOVERNANCE.md','ROADMAP.md','packages/protocol/LICENSE','packages/core/LICENSE','packages/cli/LICENSE']
SKIP={'.git','node_modules','dist','build','coverage','release-candidate','.ruleoak-demo-output'}; EXTS={'.js','.mjs','.cjs','.ts','.tsx','.py'}
def main():
 root=Path('.');errors=[]
 for rel in REQUIRED:
  if not (root/rel).exists(): errors.append(f'Missing required file: {rel}')
 apache=(root/'LICENSE').read_text(errors='replace') if (root/'LICENSE').exists() else ''
 if 'Apache License' not in apache or 'Version 2.0' not in apache: errors.append('root LICENSE must contain Apache License 2.0')
 for name in ['protocol','core','cli']:
  if 'Apache License' not in (root/f'packages/{name}/LICENSE').read_text(errors='replace'): errors.append(f'packages/{name}/LICENSE must be Apache-2.0')
 for p in root.rglob('*'):
  if not p.is_file() or p.suffix not in EXTS or any(part in SKIP for part in p.parts): continue
  rel=p.as_posix();
  if not (rel.startswith('packages/') or rel.startswith('scripts/') or rel.startswith('tests/') or rel.startswith('examples/') or rel.startswith('.github/')): continue
  head='\n'.join(p.read_text(errors='replace').splitlines()[:60])
  if 'SPDX-License-Identifier: Apache-2.0' not in head: errors.append(f'Missing/wrong Apache SPDX header in {rel}')
  if 'SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.' not in head: errors.append(f'Missing RuleOak copyright SPDX in {rel}')
 if errors:
  print('RuleOak licensing check FAILED:');[print(' - '+e) for e in errors];return 1
 print('RuleOak licensing check PASSED.');return 0
if __name__=='__main__': raise SystemExit(main())
