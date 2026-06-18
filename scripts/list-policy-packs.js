import { join } from "node:path";
import { PolicyPackRegistry } from "../src/policy-packs/index.js";
const registry = PolicyPackRegistry.fromDirectory(join(process.cwd(), "policy-packs"));
for (const pack of registry.list()) {
  console.log(`${pack.id}\t${pack.version}\t${pack.category}\t${pack.name}`);
}
