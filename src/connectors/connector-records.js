import { createHash, randomUUID } from "node:crypto";

export function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
}

export function hashRecord(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function createConnectorEvidence({ connector, source, subject, claim, value, metadata = {} }) {
  const base = { connector, source, subject, claim, value, metadata };
  return {
    id: `ev-${connector}-${hashRecord(base).slice(0, 16)}`,
    connector,
    source,
    subject,
    claim,
    value,
    hash: hashRecord(base),
    createdAt: new Date().toISOString(),
    metadata: { readOnly: true, ...metadata }
  };
}

export function createConnectorRunId(prefix = "connector-run") {
  return `${prefix}-${randomUUID()}`;
}
