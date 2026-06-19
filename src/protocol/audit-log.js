import { recordHash } from "./record-factory.js";
import { validateGovernanceRecord } from "./schema-validator.js";

export function appendAuditEventChain(events = [], event) {
  if (!Array.isArray(events)) throw new Error("events must be an array");
  validateGovernanceRecord(event, "AuditEvent");
  const previous = events.length ? events[events.length - 1] : null;
  const previousHash = previous ? (previous.eventHash || recordHash(previous)) : null;
  const chained = { ...event, sequence: events.length, previousHash };
  chained.eventHash = recordHash(chained);
  return [...events, chained];
}

export function verifyAuditEventChain(events = []) {
  if (!Array.isArray(events)) throw new Error("events must be an array");
  const errors = [];
  let previousHash = null;
  events.forEach((event, index) => {
    try {
      validateGovernanceRecord(event, "AuditEvent");
      if (event.sequence !== index) errors.push(`event ${index} sequence must be ${index}`);
      if ((event.previousHash || null) !== previousHash) errors.push(`event ${index} previousHash mismatch`);
      const expected = recordHash(event);
      if (event.eventHash !== expected) errors.push(`event ${index} eventHash mismatch`);
      previousHash = event.eventHash;
    } catch (error) {
      errors.push(`event ${index}: ${error.message}`);
    }
  });
  return { valid: errors.length === 0, errors, eventCount: events.length, lastHash: previousHash };
}
