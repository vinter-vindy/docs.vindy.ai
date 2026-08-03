---
title: Multi-tenancy
sidebar_label: Multi-tenancy
sidebar_position: 3
---

# Multi-tenancy

**Short answer to "can I see another company's data?": No — and nobody can see yours.**

Each API key is bound to a single company. All endpoints **automatically** return only that company's data, so you only ever see your own:

- Every database query is scoped to your company.
- Using another company's `call_id` returns 404 (`RESOURCE_NOT_FOUND`) — existence is not leaked. You cannot even tell whether such a call exists.
- This contract is **guaranteed behavior** and is tested.

---

## What this means in practice

| Scenario | Result |
|---|---|
| You request your own call | `200` with the call data |
| You request a call ID that doesn't exist | `404 RESOURCE_NOT_FOUND` |
| You request a call ID belonging to another company | `404 RESOURCE_NOT_FOUND` — indistinguishable from "doesn't exist" |

There is no tenant parameter to pass and nothing to configure. The key itself determines the scope.

```bash
# A call that is not yours behaves exactly like a call that doesn't exist:
curl -H "Authorization: Bearer $VINDY_API_KEY" \
  https://api.vindy.ai/v1/calls/sess_ff00ee11dd22/recording-url
```

```json
{
  "message": "Call not found.",
  "extensions": {
    "code": "RESOURCE_NOT_FOUND"
  }
}
```
