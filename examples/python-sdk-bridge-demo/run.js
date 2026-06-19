import { writePythonSdkBridgeReport } from "../../src/protocol/index.js";

const report = writePythonSdkBridgeReport({
  inputDir: "tests/conformance/python-sdk-v03-records",
  outputPath: "reports/python-sdk/bridge-report.json"
});

console.log("RuleOak Python SDK Bridge");
console.log("=========================");
console.log(`SDK: ${report.bridge.sdk} >= ${report.bridge.minimumVersion}`);
console.log(`Protocol: ${report.bridge.protocol}`);
console.log(`Status: ${report.bridge.status}`);
console.log(`Records: ${report.recordCount}`);
console.log(`Valid: ${report.valid}`);
console.log("Report: reports/python-sdk/bridge-report.json");
