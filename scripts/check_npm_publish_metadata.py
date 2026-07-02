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

"""Validate npm metadata before first public publication."""
from __future__ import annotations
import json
import sys
from pathlib import Path

VERSION = "0.1.0"
REPO_URL = "git+https://github.com/ruleoak/ruleoak.git"
PACKAGES = {
    "packages/protocol": {"name": "@ruleoak/protocol", "license": "MIT", "deps": {}},
    "packages/core": {"name": "@ruleoak/core", "license": "Apache-2.0", "deps": {"@ruleoak/protocol": "^0.1.0"}},
    "packages/cli": {"name": "@ruleoak/cli", "license": "Apache-2.0", "deps": {"@ruleoak/core": "^0.1.0", "@ruleoak/protocol": "^0.1.0"}},
}


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    root = Path(".").resolve()
    errors: list[str] = []
    root_pkg = load_json(root / "package.json")
    if root_pkg.get("version") != VERSION:
        errors.append(f"root package.json version must be {VERSION}")
    for rel, expected in PACKAGES.items():
        pkg_dir = root / rel
        pkg = load_json(pkg_dir / "package.json")
        if pkg.get("name") != expected["name"]:
            errors.append(f"{rel}/package.json has wrong name: {pkg.get('name')}")
        if pkg.get("version") != VERSION:
            errors.append(f"{expected['name']} version must be {VERSION}")
        if "phase" in pkg.get("version", ""):
            errors.append(f"{expected['name']} version leaks internal phase naming")
        if pkg.get("license") != expected["license"]:
            errors.append(f"{expected['name']} license must be {expected['license']}")
        if not (pkg_dir / "LICENSE").exists():
            errors.append(f"{expected['name']} is missing package-local LICENSE file")
        repo = pkg.get("repository") or {}
        if repo.get("url") != REPO_URL or repo.get("directory") != rel:
            errors.append(f"{expected['name']} repository field must point to {REPO_URL} directory {rel}")
        for field in ["files"]:
            if "LICENSE" not in pkg.get(field, []):
                errors.append(f"{expected['name']} files[] must include LICENSE")
            if "README.md" not in pkg.get(field, []):
                errors.append(f"{expected['name']} files[] must include README.md")
        deps = pkg.get("dependencies", {})
        for dep_name, dep_range in deps.items():
            if str(dep_range).startswith("file:"):
                errors.append(f"{expected['name']} dependency {dep_name} still uses local file: specifier")
        if deps != expected["deps"]:
            errors.append(f"{expected['name']} dependencies must be {expected['deps']}, got {deps}")
    lock = load_json(root / "package-lock.json")
    if lock.get("packages", {}).get("", {}).get("version") != VERSION:
        errors.append("package-lock root version is not aligned to 0.1.0")
    for rel, expected in PACKAGES.items():
        locked = lock.get("packages", {}).get(rel, {})
        if locked.get("version") != VERSION:
            errors.append(f"package-lock {rel} version is not {VERSION}")
        if locked.get("license") != expected["license"]:
            errors.append(f"package-lock {rel} license is not {expected['license']}")
        locked_deps = locked.get("dependencies", {})
        if locked_deps != expected["deps"]:
            errors.append(f"package-lock {rel} dependencies must be {expected['deps']}, got {locked_deps}")
    workflow = root / ".github/workflows/ci.yml"
    if not workflow.exists():
        errors.append("missing .github/workflows/ci.yml")
    else:
        text = workflow.read_text(encoding="utf-8")
        if "fsfe/reuse-action@v6" not in text:
            errors.append("CI must include fsfe/reuse-action@v6 for REUSE lint")
    if errors:
        print("RuleOak npm publish metadata check FAILED:")
        for error in errors:
            print(f" - {error}")
        return 1
    print("RuleOak npm publish metadata check PASSED.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
