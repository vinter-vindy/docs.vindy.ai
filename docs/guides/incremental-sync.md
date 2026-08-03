---
title: Incremental Sync
sidebar_label: Incremental Sync
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Incremental Sync

Keep your own database up to date with Vindy calls — without re-downloading everything each time.

---

## One-shot vs ongoing

- **One-shot export** (a historical report): walk all pages via the [cursor](../api-reference/list-calls/filtering-pagination.md#cursors), finish.
- **Ongoing sync** (live operations): set `date_from` to your last-synced date and fetch only newly-terminal calls.

Suggested polling cadence: **no more than once per minute**. More frequent polls are usually wasteful — calls become ready in batches, not milliseconds apart.

---

## The pattern

1. Use a **unique constraint on `call_id`** in your DB and upsert each call.
2. Track a **`last_synced_date`** on your side — a `YYYY-MM-DD` date in **Europe/Istanbul** (the timezone the API's date filters use). Set it to **the date you start each sync run**, *not* a field from the call object.
3. On the next sync, query with `date_from=<last_synced_date>`. Re-scanning that boundary day picks up every call that became terminal — and therefore visible — since your last run.
4. Upsert each page (de-duplicate on `call_id`). Walk the [keyset cursor](../api-reference/list-calls/filtering-pagination.md#cursors) — `(started_at, attempt_id)` — within the session using `pagination.next_cursor` / `pagination.has_more`, and discard the cursor when done (do not persist it long-term).

:::info Why a date, not `call_created_at`?
`date_from` / `date_to` are **date-only** (`YYYY-MM-DD`, no time or timezone in the input) and are interpreted against **Europe/Istanbul** day boundaries — not against a per-call timestamp you control. `call_created_at` is when the call was *queued* (earlier, and unrelated to when it finished), so using it as your watermark can stall the window or re-scan large overlaps. The safe anchor is the **date you started** your previous run: the list only ever shows terminal calls (see below), so re-scanning that day surfaces everything that finished since, and upserting by `call_id` makes the overlap harmless. If your calls can span midnight, subtract an extra day as a safety margin.
:::

Why this is safe:

- `POST /v1/calls/list` never returns in-progress calls — only **terminal** calls appear, and browser (WebRTC) calls never appear at all. A call that wasn't final during your last run isn't lost; it surfaces on a later run once it's done. See [no half-baked data](../api-reference/list-calls/index.md).
- The [keyset cursor](../api-reference/list-calls/filtering-pagination.md#cursors) `(started_at, attempt_id)` never repeats a call within a single walk — the next page does **not** re-return the previous page's calls.
- `date_from` and `date_to` are **inclusive day boundaries** in Europe/Istanbul, so reusing a boundary day across consecutive windows overlaps on that day. You upsert on `call_id` so that overlap — and any retry of a failed request — can't create duplicates. See [range semantics](../api-reference/list-calls/filtering-pagination.md#range-semantics).

---

## Implementation

<Tabs groupId="lang">
<TabItem value="node" label="Node.js">

```javascript
async function syncCalls(assistantId, lastSyncedDate) {
  // Watermark for the NEXT run: today's date in Europe/Istanbul (the timezone the
  // date filters use). Re-scanning the boundary day is harmless because you upsert
  // by call_id, and terminal-only visibility means a call that wasn't final on your
  // last run simply shows up on this one.
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
  }).format(new Date()); // -> "2026-06-10"
  let cursor = undefined;

  do {
    const response = await fetch("https://api.vindy.ai/v1/calls/list", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VINDY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assistant_id: assistantId,
        date_from: lastSyncedDate, // YYYY-MM-DD — your previous run's date (re-scan is idempotent)
        limit: 200, // max 200 per page
        cursor,
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`${error.extensions?.code}: ${error.message}`);
    }

    const body = await response.json();
    for (const call of body.data) {
      await upsertCall(call); // INSERT ... ON CONFLICT (call_id) DO UPDATE
    }
    cursor = body.pagination.next_cursor; // null once has_more is false
  } while (cursor);

  return today; // save as the next run's lastSyncedDate
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os
from datetime import datetime
from zoneinfo import ZoneInfo

import requests

def sync_calls(assistant_id, last_synced_date):
    # Watermark for the NEXT run: today's date in Europe/Istanbul (the timezone the
    # date filters use). Re-scanning the boundary day is harmless because you upsert
    # by call_id, and terminal-only visibility means a call that wasn't final on your
    # last run simply shows up on this one.
    today = datetime.now(ZoneInfo("Europe/Istanbul")).date().isoformat()  # "2026-06-10"
    cursor = None

    while True:
        payload = {
            "assistant_id": assistant_id,
            "date_from": last_synced_date,  # YYYY-MM-DD — your previous run's date (re-scan is idempotent)
            "limit": 200,  # max 200 per page
        }
        if cursor:
            payload["cursor"] = cursor

        response = requests.post(
            "https://api.vindy.ai/v1/calls/list",
            headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
            json=payload,
        )
        if not response.ok:
            error = response.json()
            raise RuntimeError(
                f"{error.get('extensions', {}).get('code')}: {error.get('message')}"
            )

        body = response.json()
        for call in body["data"]:
            upsert_call(call)  # INSERT ... ON CONFLICT (call_id) DO UPDATE

        cursor = body["pagination"]["next_cursor"]  # null once has_more is false
        if not cursor:
            break

    return today  # save as the next run's last_synced_date
```

</TabItem>
</Tabs>

---

## Day-by-day example

```bash
# Day 1: full backfill
curl -X POST https://api.vindy.ai/v1/calls/list \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"assistant_id":"8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01","limit":200}'
# Walk all pages until pagination.has_more is false.
# Save today's Europe/Istanbul date (YYYY-MM-DD) as last_synced_date (not a field from the calls).

# Day 2+: incremental
curl -X POST https://api.vindy.ai/v1/calls/list \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"assistant_id":"8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01","date_from":"2026-06-10","limit":200}'
```
