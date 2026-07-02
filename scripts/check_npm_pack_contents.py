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

"""Dry-run npm pack and verify each public package ships license metadata."""
from __future__ import annotations
import json
import subprocess
import sys

PACKAGES = {
    "@ruleoak/protocol": {"LICENSE", "README.md", "package.json"},
    "@ruleoak/core": {"LICENSE", "README.md", "package.json"},
    "@ruleoak/cli": {"LICENSE", "README.md", "package.json"},
}


def main() -> int:
    errors: list[str] = []
    for workspace, required_names in PACKAGES.items():
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
        except Exception as exc:  # pragma: no cover - defensive for CLI format changes
            errors.append(f"could not parse npm pack output for {workspace}: {exc}; output={proc.stdout!r}")
            continue
        files = {item["path"] for item in payload.get("files", [])}
        for name in required_names:
            if name not in files:
                errors.append(f"{workspace} tarball is missing {name}; files={sorted(files)}")
    if errors:
        print("RuleOak npm pack content check FAILED:")
        for error in errors:
            print(f" - {error}")
        return 1
    print("RuleOak npm pack content check PASSED.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
