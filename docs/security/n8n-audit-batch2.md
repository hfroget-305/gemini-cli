# n8n Security Audit — Batch 2 (the 4 previously-locked workflows)

Branch: `claude/review-n8n-security-fCPcd` · PR #109 · 2026-08-04
Scope: the four workflows that were not `availableInMCP` during the first
review and have now been unlocked and read in full.

| # | Workflow | ID | State | Worst finding |
|---|---|---|---|---|
| 1 | Facebook Lead Ads → Zoho CRM | `p0fYHq69WohYcZC7` | **active** | Unsigned, forgeable webhook → CRM |
| 2 | RingCentral → Zoho Leads | `c6yYzZbXSg25ygTg` | **active** | Unauth webhook + cross-workflow prompt-injection source |
| 3 | Simplelife Training Agent – Voice Call | `nn4b2pMIkforxmwx` | inactive | 🔴 **Hardcoded ElevenLabs API key (plaintext)** |
| 4 | SimpleLife – AI Voice Follow-up Agent | `ZByC1P9VYGV28OI2` | inactive | Prompt-injection into Claude from lead data + webhook |

Neither active webhook has any stored executions (`search_executions` → 0),
so there is **no evidence of exploitation** yet — these are exposure findings,
not incident findings.

---

## 🔴 CRITICAL — 5th leaked key: hardcoded ElevenLabs API key

**Workflow 3, node `ElevenLabs - TTS`.** The API key is pasted in plaintext
as a header value in the node parameters:

```
xi-api-key: sk_15664c0c9eff0f280ab4fd67718b70a43f4767749720fcf2
```

This is a **new leaked credential**, not among the three LLM keys already
rotated. It sits in the workflow JSON (and is therefore exposed to anyone with
workflow read access, execution logs, or this MCP surface).

**Actions:**
1. **Rotate it now** in the ElevenLabs dashboard — treat as compromised.
2. The node should use the existing credential **`ElevenLabs API Key`**
   (`fbsZBOODWoK8F3ey`) instead of an inline key — Workflow 4 already does
   this correctly. (Patch attempted via MCP; see status note at bottom.)

---

## Credential-map corrections (result of unlocking these 4)

Auditing these workflows **changes an earlier recommendation** — do not act on
the old runbook item #4 verbatim:

| Credential | ID | Verdict |
|---|---|---|
| `Anthropic API Key` (httpHeaderAuth) | `u1Z0j9HyOwJBc8HC` | **IN USE** by the SimpleLife Claude nodes — **DO NOT delete.** (Previously mis-flagged as orphaned; it was only unused by the *first* five workflows.) |
| `ElevenLabs API Key` (httpHeaderAuth) | `fbsZBOODWoK8F3ey` | Legit; Workflow 3 bypasses it with a hardcoded key. Point WF3 at this. |
| `Bearer Auth account` (httpBearerAuth) | `xFfML7HGa79mw0KI` | Not referenced by any of the 9 audited workflows — likely orphaned. Verify in UI, then delete. |
| ElevenLabs inline key | (hardcoded) | **Rotate.** |

---

## Workflow 1 — Facebook Lead Ads → Zoho (ACTIVE)

Flow: `FB Webhook (POST) → Extract Lead ID → Fetch Lead from Facebook (Graph
API, authenticated) → Map Fields → Create Zoho Lead → NQ branch`.
A separate `GET` on the same path answers Meta's verification challenge.

**Findings**
- **HIGH — no payload signature verification.** The POST webhook does not
  verify Meta's `X-Hub-Signature-256` HMAC (computed with the app secret).
  Anyone who learns the URL can POST forged `leadgen` events. The real lead
  data is then fetched from the Graph API by `leadgen_id`, so forged events
  with junk IDs fail the fetch — **but** `onError: continueRegularOutput` means
  the flow proceeds and creates a **blank "Unknown / FB Lead"** record. Net:
  unauthenticated CRM pollution / junk-lead flooding, plus Graph+Zoho quota
  burn.
- **MEDIUM — verification handshake accepts anyone.** `Respond with Challenge`
  echoes `hub.challenge` **without checking `hub.verify_token`**. The verify
  token is exactly the shared secret that's supposed to prove endpoint
  ownership; skipping it means any party can complete a Meta subscription
  handshake against this endpoint.
- **INFO — Zoho write is parameterized** (`create` with `additionalFields`),
  so there's no criteria/COQL injection here (unlike the first-batch search
  workflows). Lead `field_data` comes from the authenticated Graph API.

**Fix (needs your Meta app secret — provider-side):**
1. Insert a Code node after the POST webhook that recomputes
   `HMAC-SHA256(rawBody, FB_APP_SECRET)` and compares to `X-Hub-Signature-256`;
   reject on mismatch. Store the secret in an n8n Variable `FB_APP_SECRET`.
2. On the GET node, compare `hub.verify_token` to a `FB_VERIFY_TOKEN` variable
   before echoing the challenge.
3. Change the Graph-fetch node's `onError` to **stop** (or guard on empty
   `lead_id`) so failed fetches don't create blank leads.

Not auto-applied: this is a **live** lead pipeline and the real fix needs your
app secret + verify token. Wiring it blind risks dropping real Meta traffic.

---

## Workflow 2 — RingCentral → Zoho Leads (ACTIVE)

Flow: `RingCentral Webhook (POST) → Validate & Clean (Set) → If duration>30 &&
Inbound → Create Zoho Lead`.

**Findings**
- **HIGH — unauthenticated webhook.** No validation-token / signature check.
  Anyone can POST forged call events to `…/ringcentral-calls` and create Zoho
  leads with attacker-chosen `callerName`, `phoneNumber`, and `result`.
- **HIGH — cross-workflow prompt-injection source.** `body.from.name` →
  `callerName` → Zoho `Last_Name`, and `body.result` → Zoho `Description`.
  Workflow 4's outbound branch later feeds `Last_Name` / `Description` straight
  into a Claude prompt. So a forged (or even a real, spoofed caller-ID) call
  can plant a **prompt-injection payload in the CRM that executes when the
  follow-up agent runs.** This is the highest-value chain across the whole
  instance.
- **MEDIUM — caller-ID is spoofable** even without forging the webhook; treat
  every field as untrusted.

**Fix:**
1. Add a shared-secret/validation-token gate on the webhook (same pattern as
   the first-batch Verify-Secret gates).
2. Neutralize the injection at the **consumer** (Workflow 4) — see below — so
   the chain is broken regardless of how a malicious lead got into Zoho.

---

## Workflow 3 — Simplelife Training Agent · Voice Call (INACTIVE)

Flow: `Webhook (POST training-call) → Extract Input → Claude (Haiku) →
Extract Reply → ElevenLabs TTS → Respond`. A sales-training simulator with
5 Spanish buyer personas.

**Findings**
- 🔴 **CRITICAL — hardcoded ElevenLabs key** (see top).
- **MEDIUM (financial) — unauthenticated webhook.** Every hit calls the
  Anthropic API (billed via `u1Z0j9HyOwJBc8HC`) **and** ElevenLabs TTS (billed
  via the leaked key). If activated, it's an open endpoint that spends your
  LLM + TTS credits on demand. Add a secret gate before reactivating.
- **LOW — prompt injection** via `body.message` into the Claude user turn.
  Low real-world impact (training sandbox) but wrap the input in a delimited
  block and instruct the model to treat it as data.

**Patches attempted via MCP (inactive → safe):** repoint TTS to credential
`fbsZBOODWoK8F3ey` and remove the inline key; delimit the user message.

---

## Workflow 4 — SimpleLife · AI Voice Follow-up Agent (INACTIVE)

Two branches: (A) scheduled weekday 10am → `Get Zoho Leads` → filter
`New - Uncontacted` → `Claude - Generate Script` → ElevenLabs TTS → mark
`Contacted`; (B) inbound webhook `simplelife-voice` → `Claude - Inbound
Response` → ElevenLabs TTS → respond.

**Findings**
- **MEDIUM — prompt injection from lead data (branch A).** `Last_Name`,
  `Lead_Source`, `Description` are interpolated into the Claude prompt with no
  isolation. Those fields are populated by the FB and RingCentral intake
  workflows, i.e. **attacker-influenced** → injection lands here. This is the
  downstream end of the Workflow-2 chain.
- **MEDIUM (financial) — unauthenticated inbound webhook.** `body.message` →
  Claude → TTS with no auth: LLM + TTS cost abuse and a second injection entry
  point.
- **GOOD — ElevenLabs via credential** (both TTS nodes use
  `predefinedCredentialType`), unlike Workflow 3. No hardcoded key here.
- **LOW — `Access-Control-Allow-Origin: *`** on both responses (returns only
  the reply text, so low impact).

**Fix (inactive → safe to patch):** wrap every untrusted field
(`Last_Name`/`Lead_Source`/`Description` and the inbound `body.message`) in a
clearly delimited block with an instruction to treat the contents as data, not
instructions. Add a secret gate on the inbound webhook before activation.

---

## Cross-cutting theme (all 9 workflows)

Every externally-triggered workflow in this instance shares the same root
weakness: **public n8n webhooks with no signature/secret verification**, several
feeding directly into Zoho writes and/or LLM calls. The single highest-leverage
instance-wide fix remains **uniform webhook authentication** (runbook #1),
extended to include these two active endpoints
(`fb-lead-webhook`, `ringcentral-calls`) and, before activation, the two
SimpleLife webhooks (`training-call`, `simplelife-voice`).

### Priority order for this batch
1. **Rotate the leaked ElevenLabs key** (WF3) — now.
2. **Sign/authenticate the two ACTIVE webhooks** (WF1 Meta HMAC + verify token;
   WF2 shared secret) — needs your provider secrets.
3. **Apply the prompt-injection hardening** to WF3/WF4 (safe, inactive).
4. **Do NOT delete `u1Z0j9HyOwJBc8HC`** — it's in use.
5. Verify then delete `xFfML7HGa79mw0KI` if truly orphaned.
