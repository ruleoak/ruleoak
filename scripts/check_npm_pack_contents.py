#!/usr/bin/env python3
# Copyright © 2026 RuleOak Pte. Ltd.
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
# SPDX-FileCopyrightText: 2026 RuleOak Pte. Ltd.
# SPDX-License-Identifier: Apache-2.0

"""Dry-run npm pack and verify each public package's adoption surface."""
from __future__ import annotations

import json
import subprocess

PACKAGES = {
    "@ruleoak/protocol": {
        "required": {"LICENSE", "README.md", "package.json", "src/index.js", "src/index.d.ts", "schemas/policy.schema.json"},
        "forbidden_prefixes": {"tests/", "node_modules/"},
    },
    "@ruleoak/core": {
        "required": {"LICENSE", "README.md", "package.json", "src/index.js", "src/index.d.ts", "src/decision/receipt.js"},
        "forbidden_prefixes": {"tests/", "node_modules/"},
    },
    "@ruleoak/cli": {
        "required": {"LICENSE", "README.md", "package.json", "bin/ruleoak.js", "src/cli.js", "src/adoption-evidence.js", "src/stream-gate.js", "src/workstation.js", "policy-packs/cautious.json", "policy-packs/mcp-server-safe.json"},
        "forbidden_prefixes": {"tests/", "node_modules/"},
    },
}


def main() -> int:
    errors: list[str] = []
    for workspace, expectations in PACKAGES.items():
        proc = subprocess.run(
            ["npm", "pack", "--dry-run", "--json", "--workspace", workspace],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        if proc.returncode != 0:
            errors.append(f"npm pack dry-run failed for {workspace}: {proc.stderr.strip()}")
            continue
        try:
            payload = json.loads(proc.stdout)[0]
        except Exception as exc:  # pragma: no cover
            errors.append(f"could not parse npm pack output for {workspace}: {exc}; output={proc.stdout!r}")
            continue
        files = {item["path"] for item in payload.get("files", [])}
        for name in expectations["required"]:
            if name not in files:
                errors.append(f"{workspace} tarball is missing {name}; files={sorted(files)}")
        for prefix in expectations["forbidden_prefixes"]:
            leaked = sorted(path for path in files if path.startswith(prefix))
            if leaked:
                errors.append(f"{workspace} tarball includes forbidden {prefix}: {leaked[:5]}")
        if payload.get("unpackedSize", 0) > 1_500_000:
            errors.append(f"{workspace} unpacked tarball exceeds 1.5 MB: {payload.get('unpackedSize')}")
    if errors:
        print("RuleOak npm pack content check FAILED:")
        for error in errors:
            print(f" - {error}")
        return 1
    print("RuleOak npm pack content check PASSED.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
