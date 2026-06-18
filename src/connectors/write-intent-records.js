import { randomUUID, createHash } from "node:crypto";
import { stableJson } from "./connector-records.js";

export function hashWriteIntent(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function createWriteIntent({ connector, action, target, payload = {}, actor = "agent", metadata = {} }) {
  const base = { connector, action, target, payload, actor, metadata };
  const hash = hashWriteIntent(base);
  return {
    id: `wi-${connector}-${hash.slice(0, 16)}`,
    connector,
    action,
    target,
    payload,
    actor,
    status: "proposed",
    hash,
    createdAt: new Date().toISOString(),
    metadata: { dryRunCapable: true, ...metadata }
  };
}

export function createWriteRunId(prefix = "write-connector-run") {
  return `${prefix}-${randomUUID()}`;
}
