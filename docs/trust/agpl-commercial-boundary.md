# AGPL and Commercial Boundary

RuleOak Core is released under **AGPL-3.0-or-later**. The AGPL license is part of the project moat: it makes the governance core inspectable while preserving a path to commercial licensing for organizations that cannot or do not want to use AGPL software.

This document is product guidance, not legal advice.

## Open-core boundary

| Area | Suggested posture |
|---|---|
| RuleOak Core runtime | AGPL open source |
| Governance Protocol v1 | Open and stable |
| Core policy packs | AGPL open source |
| Local report generation | AGPL open source |
| Reference verticals | AGPL open source |
| Enterprise hosted service | Commercial |
| Private enterprise connectors | Commercial or dual-license |
| Managed audit dashboard | Commercial |
| Organization-specific policy packs | Commercial service or private customer asset |
| Support, onboarding, and review | Commercial service |

## Why AGPL is coherent for RuleOak

RuleOak is governance infrastructure. Users need to inspect the enforcement logic, records, policy decisions, and evidence flow. AGPL supports that trust while discouraging closed hosted forks from taking the core without contributing or licensing.

## Developer-friendly wording

Use this wording in public materials:

> RuleOak Core is AGPL open core. Teams that need private distribution, hosted service use, proprietary embedding, or commercial support can discuss a commercial license.

Avoid implying that AGPL is a compliance certification. It is a software license.

## Practical release guidance

Before wider public release:

- keep `LICENSE` and `NOTICE` in every package;
- keep public docs clear about AGPL;
- avoid copying proprietary examples into the repository;
- keep synthetic data in demos;
- publish a commercial-contact path without forcing it into the developer quick start.
