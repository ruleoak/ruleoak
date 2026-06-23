# RuleOak Core v2.2.0 Release Notes

RuleOak Core v2.2.0 positions RuleOak as an **Agent Firewall and Flight Recorder for AI agents**.

## Highlights

- Agent Firewall for allow / deny / approval / dry-run decisions.
- Flight Recorder for evidence JSONL timelines.
- MCP gateway and hardening demos.
- OpenClaw-style adapter demos.
- coding-agent harness examples.
- SafeDesk concept demos for personal AI safety.
- consumer vertical demo fixtures for Home Evidence, Creator Proof, Travel Proof, and Freelancer Proof.

## License

RuleOak Core is open-source under AGPL-3.0-or-later for open-source projects, learning, evaluation, and compatible deployments. For enterprise production use, proprietary vertical application building, closed-source embedding, hosted service use, or compliance without copyleft restrictions, commercial licenses are available. Contact: **hello@ruleoak.com**

## Public demo update: high-risk agent actions

Added `examples/high-risk-agent-actions/` with seven local, deterministic, non-destructive demos:

- AI tries to delete a protected folder.
- AI tries to run a shell command.
- AI tries to mutate a database.
- AI tries to call a dangerous MCP tool.
- AI tries to send an external email-like action.
- AI uses poisoned retrieved context.
- AI installs a risky skill/plugin.

Run:

```bash
npm run agentic:high-risk-demos
npm run test:high-risk-demos
```
