# OakSpec 1.0 — Normative RuleOak Interoperability Profile

**Status:** RuleOak-authored normative profile, **preview ecosystem maturity**.  
**Version:** 1.0.  
**External standard status:** **NOT CLAIMED**. No standards-body ratification or external-adoption evidence is asserted by this repository.

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, and **SHOULD NOT** are normative within OakSpec 1.0.

## 1. Purpose

OakSpec defines a portable, model-provider-independent interchange profile for durable software intent, capability semantics, invariants, evidence requirements, semantic-change provenance, and candidate interoperability imports. It does not confer execution authority and does not replace RuleOak's evidence adjudication authority.

## 2. Identifier contract

OakSpec identifiers MUST match `^[A-Za-z][A-Za-z0-9_.:-]{0,127}$`. Identifiers are case-sensitive. Producers MUST NOT silently rewrite identifiers during interchange.

## 3. Capability semantics

An OakSpec capability MUST have an identifier and name. A capability MAY carry goals, protecting invariant references, constraints, budgets, authority metadata, dependency capability references, and evidence requirement references. Export from RuleOak Intent MUST preserve these relationships without adding undeclared behavior.

## 4. Invariants and evidence references

Invariants are durable behavioral guarantees. Evidence requirements describe the classes of independent observations needed to adjudicate claims. An evidence reference is not itself evidence. OakSpec MUST NOT treat a model assertion, documentation statement, test filename, CI definition, or imported candidate as proof that a requirement passed.

## 5. Semantic change

OakSpec 1.0 references `ruleoak.semantic-diff/0.1`. Semantic-change provenance MUST distinguish `DETERMINISTIC`, `OBSERVED`, `INFERRED`, and `UNKNOWN`. UNKNOWN is first-class. A source-code change alone MUST NOT be promoted to a behavioral fact.

## 6. Provenance

Normative OakSpec provenance levels are `DECLARED`, `OBSERVED`, `INFERRED`, and `UNKNOWN`. Inference MUST NOT be treated as proof. UNKNOWN MUST NOT be silently promoted. Imported interoperability records are never `DECLARED` by import alone.

## 7. Extensions and versioning

Extension keys MUST be namespaced. Consumers MUST reject unnamespaced normative extensions rather than guessing semantics. The `oakspec_version` field controls this document contract. A future incompatible contract requires a new version; a producer MUST NOT reinterpret OakSpec 1.0 fields incompatibly under the same version string.

## 8. Interoperability imports

OakSpec 1.0 defines deterministic local adapters for OpenAPI, tests, CI definitions, Git history, `AGENTS.md`, specification/docs Markdown, and MCP tool manifests. Adapter output MUST use status `CANDIDATE`. Promotion into declared Intent requires an explicit authority-bearing workflow outside the importer.

## 9. Authority boundaries

OakSpec does not grant tool or execution authority. It does not certify implementation correctness. It does not replace Effect Boundary, Intent Evidence Authority, or RuleOak Verify. Interoperability import is discovery, not qualification.

## 10. Conformance

A conforming OakSpec 1.0 document validates against `packages/protocol/schemas/oakspec-v1.schema.json` and the protocol validator. A conforming candidate bundle validates against `oakspec-candidate-bundle-v1.schema.json` and preserves candidate-only authority semantics.
