# Anthropic + Firebase Setup

## 1) Local development secret (optional fallback)

Create `functions/.env.local` from `functions/.env.local.example` and set:

- `ANTHROPIC_API_KEY`
- `CLAUDE_MODEL_PRIMARY` (optional)
- `CLAUDE_MODEL_FAST` (optional)

## 2) GitHub secrets (required for CI deploy)

In GitHub repository settings, add:

- `FIREBASE_SERVICE_ACCOUNT_ORPHANOVALABS`
- `ANTHROPIC_API_KEY`

## 3) Runtime secret in Firebase (recommended production source)

Set secret once from local terminal:

```bash
printf "%s" "<YOUR_ANTHROPIC_KEY>" | firebase functions:secrets:set ANTHROPIC_API_KEY --project orphanovalabs --data-file=- --force
```

## 4) Deploy

Push to `main` and GitHub Actions deploys:

- Functions (`invokeLLM`)
- Hosting
