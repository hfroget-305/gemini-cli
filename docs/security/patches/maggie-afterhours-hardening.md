# Patch — Maggie After-Hours Intake (`uAEmLyjUHjh0IiEu`)

Workflow: **Maggie After-Hours Intake (ElevenLabs → Zoho + SMS)** ·
webhook `/webhook/maggie-afterhours`
Node-parameter/settings changes only. Apply in the n8n UI or via MCP
`update_workflow`, then **Publish**.

Status: **prepared, not yet applied** (n8n MCP write connection was
flapping). Verified against active version `378a4d7c-6783-4034-a251-e009d1de75fb`.

> **Heads-up before you publish:** this workflow already has an
> **unpublished draft** (versionId `8a498f51…` ≠ active `378a4d7c…`) whose
> only diff is a good one — it adds *"Responde STOP para cancelar."* to the
> SMS text (A2P opt-out compliance). Publishing will ship that too, which
> is desirable. If you did not intend other draft changes, diff before
> publishing.

---

### 1. Node `Find Activation in Zoho` — query parameter **criteria**

Escapes Zoho criteria injection: strips `(` `)`, validates email/phone
shape, caps length. Preserves the original email-then-phone fallback logic.

Replace the `criteria` query-parameter value with:

```
={{ (() => { const clean=(s)=>String(s ?? '').split('(').join('').split(')').join('').slice(0,254); const email=clean($json.email); const phone=clean($json.telefono); if (email && email.includes('@') && email.includes('.')) return '(Email:equals:'+email+')'; if (phone && /^[+0-9]{7,15}$/.test(phone)) return '(Phone:equals:'+phone+')'; return '(Email:equals:nomatch@invalid.x)'; })() }}
```

### 2. Retry-on-failure — node **Settings** tab

Set on each of these four HTTP nodes (Settings → *Retry On Fail* = on,
*Max Tries* = 3, *Wait Between Tries* = 5000 ms). Keeps transient Zoho/
Telnyx 5xx or rate-limit blips from dropping a real customer callback:

- `Create Task for Erika (Linked)`
- `Log Note on Activation`
- `Create Task for Erika (Unlinked)`
- `Send SMS Confirmation (Telnyx)` — also keep *On Error* = **Continue
  (regular output)** (already set), so an SMS failure never blocks the
  Zoho task.

(Not applied to `Find Activation in Zoho` because it already has
`neverError`/`alwaysOutputData`, so retry there is moot.)

---

## Still required (not covered by node-param edits) — CRITICAL

**`/webhook/maggie-afterhours` has no authentication.** This is the
highest-severity issue in the instance because it moves money and sends
messages:

1. **Telnyx SMS abuse** — `Send SMS Confirmation` sends to
   `smsTo` (derived from the request body's `telefono_devolucion` /
   `external_number`). Anyone with the URL can send SMS to **any** number
   on your Telnyx account: direct cost, A2P/TCPA exposure, and
   sender-reputation damage.
2. **CRM injection** — an attacker can attach notes to a real Contact
   (by supplying that Contact's email) or create high-priority Erika Tasks
   with attacker-controlled Subject/Description ("URGENT: refund … to card
   ending 4242").

The criteria-escaping above blocks one injection sub-vector but does not
close the endpoint. **Webhook authentication is the fix** and it is the one
change that needs your input — see the decision in the PR summary. Because
this endpoint triggers paid SMS, also add a per-destination rate limit
(e.g. an n8n data-table counter) even after auth is in place.
