# RuleOak Architecture Overview

RuleOak is **Flight Control for AI Agents**: a protocol-neutral agent action control plane.

```mermaid
flowchart LR
  A[External agent proposes action] --> N[Normalize action/resource]
  N --> E[Resolve Authority Envelope]
  E --> P[Policy + built-in guards]
  P -->|deny| D[Deny]
  P -->|approval| H[Human approval]
  H --> L[Execution Lease]
  P -->|allow| L
  L --> X[Cooperating adapter executes]
  X --> F[Effect Receipt]
  F --> R[Flight Recorder / Authority Ledger]
```

RuleOak does not plan tasks, choose models, provide RAG/memory, or originate business actions.
