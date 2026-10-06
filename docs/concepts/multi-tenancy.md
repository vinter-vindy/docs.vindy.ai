---
title: Multi-tenancy
sidebar_label: Multi-tenancy
sidebar_position: 3
---

# Multi-tenancy

**Can you see another company's data? No. And no one can see yours.**

Every API key belongs to exactly one company, and that single key decides what it can reach. You never pass a tenant parameter, and you never configure anything: Vindy scopes every request to your company for you.

In practice, this comes down to three things:

- Every query Vindy runs stays inside your own company, so a list or a lookup can only ever return your own calls, batches, and assistants.
- When you ask for something that isn't yours (for example, a `call_id` from another company), Vindy answers `404 RESOURCE_NOT_FOUND` — the very same answer it gives for an ID that never existed. It never tells you whether the record exists, so nothing leaks between companies.
- This isn't best-effort. It's a guaranteed part of the contract, and we keep tests that enforce it.

## What this means in practice

| You request | You get |
|---|---|
| Your own call | `200`, with the call data |
| A call ID that doesn't exist | `404 RESOURCE_NOT_FOUND` |
| A call ID that belongs to another company | `404 RESOURCE_NOT_FOUND` — the same as "doesn't exist" |

So a call that isn't yours behaves exactly like one that was never created:

```bash
curl -H "Authorization: Bearer $VINDY_API_KEY" \
  https://api.vindy.ai/v1/calls/019fb3a4-8b6d-7f33-a2e1-4c9f0b2d6e18/recording-url
```

```json
{
  "message": "Call not found.",
  "extensions": {
    "code": "RESOURCE_NOT_FOUND"
  }
}
```
