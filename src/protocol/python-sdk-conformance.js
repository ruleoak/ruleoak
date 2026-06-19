import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { validateGovernanceRecord } from "./index.js";

export const PYTHON_SDK_COMPATIBILITY = {
  sdk: "ruleoak-py",
  minimumVersion: "0.3.0",
  protocol: "ruleoak.governance.v1",
  status: "compatible"
};

export function validatePythonSdkRecord(record) {
  const result = validateGovernanceRecord(record);
  return {
    ...result,
    sdk: PYTHON_SDK_COMPATIBILITY.sdk,
    protocol: PYTHON_SDK_COMPATIBILITY.protocol
  };
}

export function validatePythonSdkRecords(records = []) {
  if (!Array.isArray(records)) throw new Error("validatePythonSdkRecords expects an array");
  return records.map((record) => validatePythonSdkRecord(record));
}

export function loadPythonSdkFixtureRecords(fixtureDir = "tests/conformance/python-sdk-records") {
  const files = readdirSync(fixtureDir).filter((file) => file.endsWith(".json")).sort();
  return files.map((file) => ({
    file,
    record: JSON.parse(readFileSync(join(fixtureDir, file), "utf8"))
  }));
}

export function validatePythonSdkFixtureRecords(fixtureDir = "tests/conformance/python-sdk-records") {
  return loadPythonSdkFixtureRecords(fixtureDir).map(({ file, record }) => ({
    file,
    ...validatePythonSdkRecord(record)
  }));
}
