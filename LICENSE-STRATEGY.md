# RuleOak License Strategy

## Public text

RuleOak Core is open-source under **AGPL-3.0-or-later** for open-source projects, learning, evaluation, and compatible deployments. For enterprise production use, proprietary vertical application building, closed-source embedding, hosted service use, or compliance without copyleft restrictions, commercial licenses are available. Contact: **hello@ruleoak.com**

## Component map

| Component | License strategy | Reason |
|---|---|---|
| RuleOak Core runtime | AGPL-3.0-or-later + commercial | Protects the enforcement engine |
| Agent Firewall | AGPL-3.0-or-later + commercial | Core moat |
| Flight Recorder implementation | AGPL-3.0-or-later + commercial | Core evidence runtime |
| MCP Permission Gateway implementation | AGPL-3.0-or-later + commercial | Runtime enforcement |
| Evidence JSONL schema/fixtures | MIT where marked | Encourage adoption |
| `.ruleoak.yml` schema/fixtures | MIT where marked | Encourage manifest adoption |
| Badge spec/conformance samples | MIT where marked | Encourage ecosystem spread |
| Enterprise connectors/hosted dashboard | Commercial | Monetization layer |
