# Payments API latency alert runbook

- Warning threshold changes must retain the critical p95 latency alert.
- Production monitoring changes require a ticket, metric baseline, rollback plan, and SRE approval.
- Any threshold relaxation must have an owner and expiry.
- If payment success rate drops below 99.5%, roll back threshold changes immediately and escalate to incident command.
