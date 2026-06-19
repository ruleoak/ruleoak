import { writePythonSdkBridgeReport } from "../src/protocol/index.js";

const inputDir = process.argv[2] || "tests/conformance/python-sdk-v03-records";
const outputPath = process.argv[3] || "reports/python-sdk/bridge-report.json";
const report = writePythonSdkBridgeReport({ inputDir, outputPath });
console.log(JSON.stringify(report, null, 2));
