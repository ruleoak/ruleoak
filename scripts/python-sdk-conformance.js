import { validatePythonSdkFixtureRecords, PYTHON_SDK_COMPATIBILITY } from "../src/protocol/index.js";

const records = validatePythonSdkFixtureRecords();
const payload = {
  compatibility: PYTHON_SDK_COMPATIBILITY,
  valid: true,
  records
};

console.log(JSON.stringify(payload, null, 2));
