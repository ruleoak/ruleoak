# REST authorization API

Run the optional local service:

```bash
ruleoak serve --dir ./workspace --listen 127.0.0.1:7331
```

## Endpoints

### `POST /v1/authorize`

Accepts an authorization request or normalized action and returns decision, classification, receipt, approval reference and evidence event ID.

### `POST /v1/approve`

```json
{ "approval_id": "appr_...", "decision": "allow_once" }
```

### `POST /v1/receipts/consume`

```json
{ "receipt": {}, "call": {}, "executor": "worker-1" }
```

### `GET /v1/pending`

Returns local pending approvals.

### `GET /v1/health`

Returns workspace diagnostic checks.

Response contracts are documented by `@ruleoak/protocol` schemas and validators.

## Authentication

Loopback has no mandatory token unless one is configured. Non-loopback binding requires `--allow-non-loopback` and a bearer token loaded from the environment:

```bash
export RULEOAK_API_TOKEN='long-random-token'
ruleoak serve --listen 0.0.0.0:7331 --allow-non-loopback
```

The API fails closed if policy evaluation, evidence append, approval storage or receipt consumption fails.
