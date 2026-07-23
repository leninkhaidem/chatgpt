# Expense Dashboard

A privacy-safe, read-only GitHub Pages dashboard for the active expense cycle.

## Data flow

1. The private Google Sheet remains the source of truth.
2. Only sanitized fields are copied to `data/current-cycle.json`.
3. GitHub Actions validates the JSON and deploys this static site.
4. Daily emails can link to the same dashboard URL.

The public JSON intentionally excludes bank names, card details, source-email
links, Google Sheet links, account identifiers, and notes containing private
metadata.

## Updating the dashboard

Update `data/current-cycle.json` without changing the HTML:

```json
{
  "id": "unique-transaction-id",
  "date": "2026-07-24",
  "merchant": "Merchant display name",
  "amount": 42.5,
  "category": "Groceries"
}
```

When a cycle closes, add its aggregate to `data/previous-cycles.json`, empty the
active transactions, and change the active cycle dates.

## Local check

```bash
node scripts/validate-data.mjs
python3 -m http.server 8080
```

Open `http://localhost:8080`.
