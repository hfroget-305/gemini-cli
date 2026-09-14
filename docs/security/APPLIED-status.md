# n8n Repairs — Applied Status

Last updated: 2026-09-14. Records what has been applied **live** to the n8n
instance via MCP vs. what remains blocked on secrets/provider config.

## ✅ Applied live (via MCP `update_workflow`)

| Workflow | ID | Change | Version note |
|---|---|---|---|
| Simplelife Training Agent (WF3) | `nn4b2pMIkforxmwx` | Removed hardcoded ElevenLabs key; bound `ElevenLabs API Key` credential; prompt-injection guard on Claude node | "ElevenLabs credential + injection guard" |
| Simplelife Training Agent (WF3) | `nn4b2pMIkforxmwx` | Fail-closed `Verify Secret` gate + 401 responder on inbound webhook | "webhook shared-secret gate" |
| AI Voice Follow-up (WF4) | `ZByC1P9VYGV28OI2` | Prompt-injection guards on both Claude nodes (outbound CRM data + inbound message) | "prompt-injection guards on Claude nodes" |
| AI Voice Follow-up (WF4) | `ZByC1P9VYGV28OI2` | Fail-closed `Verify Secret` gate + 401 responder on inbound webhook | "inbound webhook shared-secret gate" |
| Facebook Lead Ads (WF1, live) | `p0fYHq69WohYcZC7` | `Lead Data Valid?` gate — forged/failed Graph fetches dead-end instead of creating blank leads | "drop leads with no Graph API data" |

**Effect:** the cross-workflow prompt-injection chain is closed at every
consumer; the 5th leaked key no longer lives in any workflow; forged FB POSTs
can no longer create junk CRM records. The two SimpleLife webhook gates are
**fail-closed** — they reject all traffic until `TC_WEBHOOK_SECRET` is set, so
they are safe to leave in place while the workflows are inactive.

## ⛔ Not applied — blocked on secrets / would break live traffic

These require values only you have; applying them blind would drop real leads.

| Workflow | Issue | Needs | Why not auto-applied |
|---|---|---|---|
| Facebook Lead Ads (live) | GET handshake accepts anyone | `FB_VERIFY_TOKEN` variable | A fail-closed gate would break Meta's re-subscription handshake if the token isn't set. The POST/lead path is already protected by the fetch-validity gate above. |
| Facebook Lead Ads (live) | POST not HMAC-verified | `FB_APP_SECRET` + webhook Raw Body ON | Needs the app secret and raw-body config; wrong setup silently rejects real events. |
| RingCentral → Zoho (live) | Unauthenticated webhook → junk CRM leads | `RC_VERIFICATION_TOKEN` variable **and** RC subscription set to send it | A fail-closed gate on a **live** webhook with no token configured would drop **all** real calls. Its injection risk is already neutralized downstream (WF4 guards). |

Specs for all three are ready in
`patches/live-webhook-verification.md` (operations JSON + UI steps). Once you
set the variables and provider headers, they can be applied in one pass.

## 👤 User-only actions (cannot be done from n8n)

1. **Rotate the leaked ElevenLabs key** (`sk_15664c0c9eff…`) in the ElevenLabs
   dashboard, and put the new key in the `ElevenLabs API Key` credential
   (`fbsZBOODWoK8F3ey`). The workflow no longer carries the key, but the old
   value stays live until rotated.
2. **Set `TC_WEBHOOK_SECRET`** + the `X-TC-Secret` header on the SimpleLife
   callers before activating those workflows (gates are fail-closed).
3. **Set** `FB_VERIFY_TOKEN`, `FB_APP_SECRET`, `RC_VERIFICATION_TOKEN` to unblock
   the live-webhook fixes above.

## Note

WF3's `ElevenLabs - TTS` node shows a cosmetic validation warning (an empty
`headerParameters` field left behind with Send Headers off). It carries no key
and sends no header — safe to ignore, or clear it in the UI.
