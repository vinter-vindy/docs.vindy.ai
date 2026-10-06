# Plan: make the EN docs' response examples fully English

**Goal:** an English reader/presenter should see no Turkish anywhere in the EN
docs' request/response examples or in the prose that narrates over them.

**Scope:** English tree only — `docs/**`. **Do NOT touch** the Turkish tree
(`i18n/tr/**`); there the examples stay Turkish.

**Status:** plan only. Nothing changed yet.

---

## 1. What is Turkish in the EN examples (root causes)

1. **Structured-output schema + data** — the example schema's property keys,
   `enum` values, and the extracted `call_structured_data` values are Turkish
   (`arama_sonucu`, `tamamlandi`, `siparisler`, `urun`, `miktar`, …). These are
   **user-defined example content**, so making them English in the EN docs is a
   safe documentation choice (it does not misrepresent the API). The field
   `title`/`description` texts are already English — only the keys/enums/values
   need changing.
2. **Assistant display name** — `"Vindy - Asistan"` ("Asistan" = Assistant).
   Example value; safe to change in EN.
3. **Personal / variable example values** — `first_name` = `Elif`, `Deniz`,
   `Mehmet`, `Ahmet`, `Selin`; `agent_name` = `Mert`. Example values; safe.
4. **Transcript role labels** — `Asistan:` / `Müşteri:` inside `call_transcript`.
   ⚠️ **These are REAL API output**, not a doc choice: the docs explicitly
   describe them as "Turkish role labels." See the decision point in §4.
5. **Phone numbers / country code** — `+90…` (Turkey). Real market value. See §4.

---

## 2. What STAYS Turkish (do not change)

- The entire `i18n/tr/**` tree (TR docs).
- Transcript role labels **unless** §4-A says otherwise after the code check.
- `+90` phone numbers **unless** §4-C says otherwise.

---

## 3. Canonical English example schema (use these everywhere, verbatim)

Apply this one mapping across every EN file so all examples stay consistent.
(Chosen to match the already-English "Structured data shapes" section in
`list-calls/index.md`, which uses `orders` / `product` / `quantity`.)

| Turkish (now) | English (target) |
|---|---|
| key `arama_sonucu` | `call_result` |
| enum `["tamamlandi","yarim_kaldi","ulasilamadi","belirsiz"]` | `["completed","incomplete","unreachable","unknown"]` |
| value `"tamamlandi"` | `"completed"` |
| key `genel_memnuniyet_puani` | `overall_satisfaction` |
| key `geri_arama_talebi` | `callback_requested` |
| key `ilgilenilen_urunler` | `interested_products` |
| value `["urun_a","urun_b"]` | `["product_a","product_b"]` |
| key `siparisler` | `orders` |
| key `urun` | `product` |
| key `miktar` | `quantity` |
| value `"Ürün A"` / `"Ürün B"` | `"Product A"` / `"Product B"` |
| name `"Vindy - Asistan"` | `"Vindy - Assistant"` |
| `first_name` `"Elif"` | `"Jane"` |
| `first_name` `"Deniz"` | `"Sam"` |
| `first_name` `"Mehmet"` | `"John"` |
| `first_name` `"Ahmet"` | `"Alex"` |
| `first_name` `"Selin"` | `"Mia"` |
| `agent_name` `"Mert"` | `"Chris"` |

> Note on `call_result: "completed"`: this value coincides with `call_status`
> and `call_end_reason` = `"completed"` in the same object. It's a different
> (user-defined) field so it's fine, but if we want zero ambiguity in the demo
> we can instead use `call_result` values `["reached","partial","unreachable","unclear"]`.
> **Pick one before applying.**

---

## 4. Decision points (need your call — some need a code check)

### 4-A. Transcript role labels `Asistan:` / `Müşteri:` ⚠️ HIGH / VERIFY FIRST
- The EN transcript dialogue is already English; only the **role labels** are
  Turkish, and the docs call them "Turkish role labels" — i.e. this is current
  **API behavior**, not a docs typo.
- **Action before changing anything:** verify in backend how the transcript is
  formatted — likely `backend/core/transcript.py` (and bot/runtime transcript
  assembly). Check whether the `Asistan` / `Müşteri` prefixes are **hardcoded**
  or **depend on the assistant's language**.
  - If **hardcoded Turkish** → EN docs showing `Asistan:` is *accurate*.
    Changing the docs to `Assistant:` would misrepresent the product. Options:
    (a) leave as-is and accept it in the demo; (b) treat it as a **product
    change request** (emit English labels for non-TR assistants) — out of docs
    scope; (c) for the meeting, avoid showing a raw transcript, or show the
    rendered block only with a note.
  - If **language-dependent** → then an English-assistant transcript really
    would read `Assistant:` / `Customer:`, and we SHOULD update the EN examples
    + the two field-table sentences that say "Turkish role labels".
- **Do not change transcript labels until this is confirmed.**

### 4-B. Assistant name `"Vindy - Assistant"` — RECOMMEND change (low risk)
Pure example value. Proposed: `"Vindy - Assistant"`.

### 4-C. Phone country code `+90…` — DEFAULT: keep
`+90` is Vindy's real market; realistic. Change to e.g. `+1…` only if you want
the examples to look region-neutral for this audience. **Your call.**

### 4-D. Personal names — RECOMMEND change (low risk)
Use the §3 mapping (Elif→Jane, etc.) so no Turkish names surface.

---

## 5. File-by-file change list (EN tree)

> For each file, apply the §3 mapping to (a) every JSON example block and
> (b) every prose sentence that quotes a Turkish key/value. Line numbers are
> current references; re-confirm on edit.

### `docs/api-reference/list-assistants.md` — heaviest (schema + full walkthrough)
- **Response JSON (≈L31–81):** `assistant_name`/`name` → `Vindy - Assistant`;
  schema keys `arama_sonucu`, `genel_memnuniyet_puani`, `geri_arama_talebi`,
  `ilgilenilen_urunler`, `siparisler`, `urun`, `miktar` → English; enum
  `tamamlandi…` → English; `required` arrays → English keys.
- **"The structured output schema" walkthrough — PROSE OVER RESPONSE (≈L123–211):**
  this section *teaches* using the Turkish keys. Update **both** the JSON
  snippets AND the sentences that name them:
  - L126–139 snippet + L134 sentence (`arama_sonucu … genel_memnuniyet_puani …
    geri_arama_talebi`) + L137–139 filled-in snippet.
  - L147–170 snippets (`ilgilenilen_urunler`, `siparisler`, `urun`, `miktar`,
    `"Ürün A"/"Ürün B"`, `urun_a/urun_b`) + L164 sentence.
  - L178–188 "complete result" snippet + L191 sentence (lists all five keys).
  - L200 keys-table example `"enum": ["tamamlandi", "belirsiz"]` → English.
  - L208 `required` bullet names `arama_sonucu`/`genel_memnuniyet_puani`.

### `docs/api-reference/list-calls/index.md`
- **Response JSON — both call objects (≈L116–159):** `call_assistant_name` →
  `Vindy - Assistant`; `call_structured_data` keys/values → English;
  `call_variables` `Elif`→`Jane` (completed call), `Deniz`→`Sam` (failed call).
- **Rendered transcript block (≈L173–184):** role labels — see §4-A (hold).
- **"Failed calls are included too" extra JSON (≈L191–210):** `call_assistant_name`,
  `call_variables` `Selin`→`Mia`. (structured_data is `null` there.)
- Already-English "Structured data shapes" section (≈L268–288) — **no change**
  (it's the model to match).

### `docs/api-reference/get-call.md` — 3 JSON examples (completed / queued / cancelled)
- `call_assistant_name` ×3 → `Vindy - Assistant`.
- Completed example `call_structured_data` keys/values → English (L55–58).
- `call_variables` `Elif` → `Jane` ×3 (L61, L89, L113).
- Transcript labels (L53) — see §4-A (hold).

### `docs/api-reference/get-batch-calls.md`
- `call_assistant_name` ×2 → `Vindy - Assistant` (L80, L108).
- `call_structured_data` keys/values → English (L90–93).
- `call_variables` `Elif`→`Jane` (L96), `Deniz`→`Sam` (L119).
- Transcript labels (L88) — see §4-A (hold).

### `docs/api-reference/webhooks.md`
- `call-ended` example: `call_assistant_name` (L79) → `Vindy - Assistant`;
  `call_structured_data` keys/values → English (L89–92); `call_variables` `Elif`
  → `Jane` (L95); transcript labels (L87) — §4-A hold.
- Cancelled-call example: `call_assistant_name` (L172), `call_variables` `Elif`
  (L183).
- Field-table sentence (L138) says "Turkish role labels … `Asistan` … `Müşteri`"
  — only change if §4-A resolves to language-dependent.

### `docs/api-reference/create-call.md`
- Request JSON `variables.first_name` `"Elif"` (L31) → `"Jane"`.
- Prose example `{ "first_name": "Elif" }` (L42) → `"Jane"`.

### `docs/api-reference/bulk-create-calls.md`
- Request JSON (L36–37): `first_name` `Elif`→`Jane`, `Mehmet`→`John`.
- Variables section (L108, L113): `Elif`→`Jane`, `agent_name` `Mert`→`Chris`.
- Prose examples (L51, L118): `Ahmet`→`Alex`.

### `docs/quickstart.md`
- §2 assistants JSON (L79–121): `assistant_name`/`name` → `Vindy - Assistant`;
  schema keys/enum → English.
- §3 calls JSON (L192–231): `call_assistant_name` ×2; `call_structured_data`
  keys/values; `call_variables` `Elif`→`Jane`, `Deniz`→`Sam`.
- Rendered transcript (L248–257): role labels — §4-A hold.

---

## 6. Suggested order of work (once decisions in §4 are made)

1. Lock the §3 mapping (and the `call_result` value variant in the §3 note).
2. Resolve §4-A (transcript labels) via the backend code check — this gates the
   transcript edits.
3. Apply §3 mapping to all JSON examples (mechanical, low risk).
4. Apply to the `list-assistants` walkthrough prose (the only heavy prose-over-
   response section).
5. Final verification grep over `docs/**` for leftovers:
   `arama_sonucu|genel_memnuniyet|geri_arama|ilgilenilen|siparisler|"urun"|"miktar"|tamamlandi|yarim_kaldi|ulasilamadi|belirsiz|Asistan|Müşteri|Elif|Deniz|Mehmet|Ahmet|Selin|Mert|Ürün`
   → expect **0** hits in EN (role labels only if §4-A kept them).

**Effort:** ~8 EN files. JSON + name swaps are quick; `list-assistants` prose
walkthrough is the one that needs care. TR tree untouched.
