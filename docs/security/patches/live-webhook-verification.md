# Live webhook verification — FB Lead Ads & RingCentral (staged)

Hardens the two **active** intake webhooks. Each needs a provider-side secret
you supply; everything else is specified here. These are the ONLY workflows
touching live customer traffic, so apply in a low-traffic window and test with
the curls at the bottom before trusting them.

| Workflow | ID | Provider secret you must supply |
|---|---|---|
| Facebook Lead Ads → Zoho | `p0fYHq69WohYcZC7` | Meta **App Secret** + a **Verify Token** you choose |
| RingCentral → Zoho Leads | `c6yYzZbXSg25ygTg` | RingCentral **Verification Token** you set on the subscription |

Create these as n8n Variables first: `FB_APP_SECRET`, `FB_VERIFY_TOKEN`,
`RC_VERIFICATION_TOKEN`.

---

## Workflow 1 — Facebook Lead Ads (`p0fYHq69WohYcZC7`)

Three independent hardenings; #1 and #2 are simple and robust — **do these**.
#3 (HMAC) is stronger but fiddly in n8n — optional.

### 1. GET handshake — check the verify token (robust)
Today `Respond with Challenge` echoes `hub.challenge` to *anyone*. Gate it on
the verify token so only Meta (who knows `FB_VERIFY_TOKEN`) completes the
handshake.

Ops:
```json
[
  {"type":"addNode","node":{"name":"Verify Token OK?","type":"n8n-nodes-base.if","typeVersion":2.3,"position":[140,80],
    "parameters":{"conditions":{"options":{"caseSensitive":true,"typeValidation":"strict","version":2},
      "conditions":[{"id":"vt","leftValue":"={{ $json.query['hub.verify_token'] }}",
        "rightValue":"={{ $vars.FB_VERIFY_TOKEN }}","operator":{"type":"string","operation":"equals"}}],
      "combinator":"and"},"options":{}}}},
  {"type":"addNode","node":{"name":"Reject Verify","type":"n8n-nodes-base.respondToWebhook","typeVersion":1.5,
    "position":[140,-40],"parameters":{"respondWith":"text","responseBody":"Forbidden","options":{"responseCode":403}}}},
  {"type":"removeConnection","source":"FB Webhook Verification (GET)","target":"Respond with Challenge"},
  {"type":"addConnection","source":"FB Webhook Verification (GET)","target":"Verify Token OK?"},
  {"type":"addConnection","source":"Verify Token OK?","target":"Respond with Challenge","sourceIndex":0},
  {"type":"addConnection","source":"Verify Token OK?","target":"Reject Verify","sourceIndex":1}
]
```

### 2. POST — only create a lead if the Graph fetch returned real data (robust)
The flow re-fetches the lead from the Graph API by `leadgen_id` (authenticated),
so forged events with bogus IDs fetch nothing — but `onError:
continueRegularOutput` currently lets that empty result create a blank
"Unknown / FB Lead". Add a validity gate so only real fetches proceed.

Ops:
```json
[
  {"type":"addNode","node":{"name":"Lead Data Valid?","type":"n8n-nodes-base.if","typeVersion":2.3,"position":[700,360],
    "parameters":{"conditions":{"options":{"caseSensitive":true,"typeValidation":"loose","version":2},
      "conditions":[{"id":"fd","leftValue":"={{ $json.field_data }}",
        "operator":{"type":"array","operation":"exists","singleValue":true}}],
      "combinator":"and"},"options":{}}}},
  {"type":"removeConnection","source":"Fetch Lead from Facebook","target":"Map Fields for Zoho"},
  {"type":"addConnection","source":"Fetch Lead from Facebook","target":"Lead Data Valid?"},
  {"type":"addConnection","source":"Lead Data Valid?","target":"Map Fields for Zoho","sourceIndex":0}
]
```
(The false branch is intentionally left unconnected — invalid fetches dead-end
with no Zoho write.)

### 3. POST — HMAC signature verification (optional, stronger, fiddly)
Meta signs each POST with `X-Hub-Signature-256: sha256=HMAC(rawBody,
app_secret)`. Verifying it rejects forged events outright. **Caveat:** the HMAC
must be computed over the *raw* request bytes — so the `FB Webhook Lead Event
(POST)` node must have **Options → Raw Body = ON**, and the Code node must read
that raw body, not a re-serialized JSON (re-stringifying changes bytes and
breaks the digest). Test carefully before relying on it.

Add this Code node between the POST webhook and `Extract Lead ID` (rewire like
the patterns above):
```js
const crypto = require('crypto');
const secret = $vars.FB_APP_SECRET;
const header = ($json.headers['x-hub-signature-256'] || '');
// Requires webhook "Raw Body" ON. Adjust to your raw-body location if needed:
const raw = $binary?.data ? Buffer.from($binary.data.data, 'base64').toString('utf8')
                          : JSON.stringify($json.body);
const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
const ok = header.length === expected.length &&
  crypto.timingSafeEqual(Buffer.from(header), Buffer.from(expected));
if (!ok) { throw new Error('Invalid X-Hub-Signature-256'); }
return $input.all();
```

---

## Workflow 2 — RingCentral (`c6yYzZbXSg25ygTg`)

RingCentral includes a `Verification-Token` header (the token you set on the
subscription) on every notification. Gate the flow on it.

**Note on responses:** this webhook uses *immediate* response mode ("Workflow
got started"), so a late node can't return 401 — the false branch simply
**dead-ends** (no Zoho lead created). That meets the security goal; the caller
just gets the default 200 with nothing happening.

Ops:
```json
[
  {"type":"addNode","node":{"name":"Verify RC Token","type":"n8n-nodes-base.if","typeVersion":2.3,"position":[360,400],
    "parameters":{"conditions":{"options":{"caseSensitive":true,"typeValidation":"strict","version":2},
      "conditions":[{"id":"rc","leftValue":"={{ $json.headers['verification-token'] }}",
        "rightValue":"={{ $vars.RC_VERIFICATION_TOKEN }}","operator":{"type":"string","operation":"equals"}}],
      "combinator":"and"},"options":{}}}},
  {"type":"removeConnection","source":"RingCentral Webhook","target":"Validate & Clean Data"},
  {"type":"addConnection","source":"RingCentral Webhook","target":"Verify RC Token"},
  {"type":"addConnection","source":"Verify RC Token","target":"Validate & Clean Data","sourceIndex":0}
]
```

**Subscription setup:** when you create/renew the RingCentral webhook
subscription, set its `verificationToken` to the same value as
`RC_VERIFICATION_TOKEN`. RC also does a one-time `Validation-Token` handshake at
subscription time (it expects that header echoed back in the response); handle
that during setup, then this gate covers steady-state traffic.

---

## Verify (both)

- **FB GET**, wrong/no token:
  `curl "…/fb-lead-webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123"`
  → **403**. Correct token → echoes `123`.
- **FB POST**, bogus `leadgen_id` → no Zoho lead created (dead-ends at
  `Lead Data Valid?`).
- **RC POST** without `Verification-Token` (or wrong) → no Zoho lead created.
  With the correct header → lead created as before.

Apply, run these, confirm, then leave the workflows active.
