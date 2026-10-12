# Security Boundary

RuleOak controls only actions routed through a RuleOak-controlled or cooperating integration boundary. It is not an OS sandbox, kernel reference monitor, EDR, anti-malware suite, or universal prompt-injection prevention system. A process capable of bypassing RuleOak can perform actions outside RuleOak authority.

Evidence is tamper-evident within the sequence, not tamper-proof against a privileged actor replacing or deleting the complete local store.
