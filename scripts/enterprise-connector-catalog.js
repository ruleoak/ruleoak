import { enterpriseConnectorCatalog } from "../src/connectors/index.js";

const catalog = enterpriseConnectorCatalog();
if (process.argv.includes("--json")) {
  console.log(JSON.stringify(catalog, null, 2));
} else {
  console.log("RuleOak Enterprise Evidence Connector Catalog");
  console.log(`Protocol: ${catalog.protocol}`);
  console.log(`Stage: ${catalog.stage}`);
  console.log(`Connector count: ${catalog.connectorCount}`);
  for (const name of catalog.recommendedOrder) console.log(`- ${name}`);
}
