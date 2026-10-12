# Local secret management

RuleOak uses a local signing secret for decision receipts and evidence checkpoints

## Commands

```bash
ruleoak secrets status
ruleoak secrets init
ruleoak secrets rotate
ruleoak secrets remove
```

RuleOak never prints the secret value

## Backends

RuleOak selects the native backend when available:

- macOS Keychain
- Windows Credential Manager through Windows Password Vault
- Linux Secret Service through `secret-tool`

Environment variables remain supported for CI and headless systems:

```bash
export RULEOAK_RECEIPT_SECRET='...'
export RULEOAK_CHECKPOINT_SECRET='...'
```

The environment override takes precedence over the credential store

## Encrypted local fallback

RuleOak does not silently fall back to a file. The user must explicitly allow it and supply a passphrase:

```bash
export RULEOAK_SECRET_STORE_PASSPHRASE='strong-local-passphrase'
ruleoak secrets init --allow-encrypted-fallback
```

The fallback uses AES-256-GCM with a scrypt-derived key and stores only encrypted material in `.ruleoak/secrets.enc`

The encrypted secret file is deliberately excluded from evidence bundles and reports

## Rotation

```bash
ruleoak secrets rotate
```

Rotation affects newly issued receipts and checkpoints. Existing signed receipts or bundles require the old secret until they expire or are no longer needed. RuleOak does not maintain a key history in v0.50.0

## Threat boundary

The credential store reduces accidental disclosure and plaintext file exposure. It does not protect against a fully privileged local attacker controlling the user session or operating system
