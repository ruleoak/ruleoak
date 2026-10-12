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

"""Validate public npm metadata and release alignment."""
from __future__ import annotations

import json
import re
from pathlib import Path

REPO_URL = "git+https://github.com/ruleoak/ruleoak.git"
SEMVER = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$")
PACKAGES = {
    "packages/protocol": {"name": "@ruleoak/protocol", "license": "Apache-2.0", "deps": []},
    "packages/core": {"name": "@ruleoak/core", "license": "Apache-2.0", "deps": ["@ruleoak/protocol"]},
    "packages/cli": {"name": "@ruleoak/cli", "license": "Apache-2.0", "deps": ["@ruleoak/core", "@ruleoak/protocol"]},
}


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    root = Path(".").resolve()
    errors: list[str] = []
    root_pkg = load_json(root / "package.json")
    version = str(root_pkg.get("version", ""))
    if not SEMVER.match(version):
        errors.append(f"root version must be clean semver, got {version!r}")
    if "phase" in version.lower():
        errors.append("root version must not expose internal phase naming")
    if root_pkg.get("private") is not True:
        errors.append("monorepo root must remain private to prevent accidental publication")
    if root_pkg.get("engines", {}).get("node") != ">=22":
        errors.append("root engines.node must be >=22")

    expected_ranges = {
        "@ruleoak/protocol": f"^{version}",
        "@ruleoak/core": f"^{version}",
    }

    for rel, expected in PACKAGES.items():
        pkg_dir = root / rel
        pkg = load_json(pkg_dir / "package.json")
        name = expected["name"]
        if pkg.get("name") != name:
            errors.append(f"{rel}/package.json has wrong name: {pkg.get('name')}")
        if pkg.get("version") != version:
            errors.append(f"{name} version must match root {version}")
        if pkg.get("license") != expected["license"]:
            errors.append(f"{name} license must be {expected['license']}")
        if pkg.get("private") is True:
            errors.append(f"{name} must not be private")
        if pkg.get("publishConfig", {}).get("access") != "public":
            errors.append(f"{name} publishConfig.access must be public")
        if pkg.get("publishConfig", {}).get("provenance") is not True:
            errors.append(f"{name} publishConfig.provenance must be true")
        if pkg.get("engines", {}).get("node") != ">=22":
            errors.append(f"{name} engines.node must be >=22")
        if not (pkg_dir / "LICENSE").exists():
            errors.append(f"{name} is missing package-local LICENSE")
        if not (pkg_dir / "README.md").exists():
            errors.append(f"{name} is missing package-local README.md")
        repo = pkg.get("repository") or {}
        if repo.get("url") != REPO_URL or repo.get("directory") != rel:
            errors.append(f"{name} repository must point to {REPO_URL} directory {rel}")
        files = pkg.get("files", [])
        for required in ("LICENSE", "README.md"):
            if required not in files:
                errors.append(f"{name} files[] must include {required}")
        if not isinstance(pkg.get("keywords"), list) or len(pkg["keywords"]) < 5:
            errors.append(f"{name} should provide useful npm keywords")

        deps = pkg.get("dependencies", {})
        expected_deps = {dep: expected_ranges[dep] for dep in expected["deps"]}
        for dep_name, dep_range in deps.items():
            if str(dep_range).startswith("file:"):
                errors.append(f"{name} dependency {dep_name} still uses file: specifier")
        if deps != expected_deps:
            errors.append(f"{name} dependencies must be {expected_deps}, got {deps}")

        if rel in {"packages/protocol", "packages/core"}:
            if pkg.get("types") != "src/index.d.ts":
                errors.append(f"{name} must expose src/index.d.ts")
            exports = pkg.get("exports", {}).get(".", {})
            if exports.get("types") != "./src/index.d.ts" or exports.get("import") != "./src/index.js":
                errors.append(f"{name} exports must expose types and ESM import entry")
            if pkg.get("sideEffects") is not False:
                errors.append(f"{name} sideEffects must be false")
            if pkg.get("exports", {}).get("./package.json") != "./package.json":
                errors.append(f"{name} must export ./package.json")
            if rel == "packages/protocol":
                if pkg.get("exports", {}).get("./schemas/*") != "./schemas/*":
                    errors.append("@ruleoak/protocol must export raw JSON Schemas")
                if pkg.get("exports", {}).get("./fixtures/*") != "./fixtures/*":
                    errors.append("@ruleoak/protocol must export fixtures")
        if rel == "packages/cli":
            if pkg.get("bin", {}).get("ruleoak") != "bin/ruleoak.js":
                errors.append("@ruleoak/cli must expose the ruleoak binary")
            if "tests" in files:
                errors.append("@ruleoak/cli public tarball should not include tests")
            if pkg.get("exports", {}).get("./package.json") != "./package.json":
                errors.append("@ruleoak/cli must export ./package.json")

    lock = load_json(root / "package-lock.json")
    if lock.get("packages", {}).get("", {}).get("version") != version:
        errors.append(f"package-lock root version is not aligned to {version}")
    for rel, expected in PACKAGES.items():
        locked = lock.get("packages", {}).get(rel, {})
        if locked.get("version") != version:
            errors.append(f"package-lock {rel} version is not {version}")
        if locked.get("license") != expected["license"]:
            errors.append(f"package-lock {rel} license is not {expected['license']}")
        expected_deps = {dep: expected_ranges[dep] for dep in expected["deps"]}
        if locked.get("dependencies", {}) != expected_deps:
            errors.append(f"package-lock {rel} dependencies must be {expected_deps}, got {locked.get('dependencies', {})}")

    required_workflows = {
        ".github/workflows/ci.yml": ["fsfe/reuse-action@", "node: [22, 24, 26]"],
        ".github/workflows/codeql.yml": ["github/codeql-action/init@"],
        ".github/workflows/dependency-review.yml": ["actions/dependency-review-action@"],
        ".github/workflows/publish.yml": ["id-token: write", "refs/tags/v", "npm@11.18.0"],
        ".github/workflows/release-candidate.yml": ["Build release candidate", "actions/upload-artifact@", "actions/attest@", "id-token: write", "attestations: write", "npm run release:candidate"],
    }
    for rel, needles in required_workflows.items():
        workflow = root / rel
        if not workflow.exists():
            errors.append(f"missing {rel}")
            continue
        text = workflow.read_text(encoding="utf-8")
        for needle in needles:
            if needle not in text:
                errors.append(f"{rel} must include {needle!r}")

    if errors:
        print("RuleOak npm publish metadata check FAILED:")
        for error in errors:
            print(f" - {error}")
        return 1
    print(f"RuleOak npm publish metadata check PASSED for v{version}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
