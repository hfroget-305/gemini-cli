# SimpleLife webhook auth gates (paste-ready, for pre-activation)

Adds a shared-secret gate in front of the two SimpleLife inbound webhooks so
they can't be hit by anyone who learns the URL. **Apply before setting either
workflow Active.** Same pattern as the first-batch Verify-Secret gates
(`TC_WEBHOOK_SECRET` variable + `X-TC-Secret` request header).

Scope: only the **inbound webhook** entry points get a gate. WF4's scheduled
(cron) branch needs none — it isn't internet-triggered.

| Workflow | ID | Webhook node | Gate goes between |
|---|---|---|---|
| Training Agent · Voice Call | `nn4b2pMIkforxmwx` | `Webhook - Incoming Call` | webhook → `Extract Input` |
| AI Voice Follow-up | `ZByC1P9VYGV28OI2` | `Inbound Call Webhook` | webhook → `Extract Caller Input` |

---

## Prerequisites (once)

1. **Variable** — reuse the existing `TC_WEBHOOK_SECRET` n8n Variable (created
   in the first batch). If it doesn't exist: Settings → Variables → add
   `TC_WEBHOOK_SECRET` = a long random string
   (`openssl rand -base64 32`).
2. **Caller side** — whatever front-end/telephony calls these endpoints must
   send header `X-TC-Secret: <that value>` on every request. Set this before
   enabling the gate, or legitimate calls will 401.

---

## What the gate does

Insert two nodes after the webhook:

- **`Verify Secret`** (IF node): passes only when the request header
  `x-tc-secret` equals `TC_WEBHOOK_SECRET`.
  - **true** → continues to the original first node.
  - **false** → **`Reject Unauthorized`**.
- **`Reject Unauthorized`** (Respond to Webhook): returns HTTP **401
  "Unauthorized"** and stops.

`Verify Secret` IF condition:
- Left: `={{ $json.headers['x-tc-secret'] }}`  (n8n lowercases header names)
- Operator: String → equals
- Right: `={{ $vars.TC_WEBHOOK_SECRET }}`

`Reject Unauthorized` settings: Respond With = *Text*, Response Body =
`Unauthorized`, Options → Response Code = `401`.

---

## Option A — apply via MCP from an interactive session

Run these `update_workflow` operation batches (one per workflow). I've already
shaped them; they only add nodes + rewire, changing nothing else.

### Workflow 3 — `nn4b2pMIkforxmwx`
```json
[
  {"type":"addNode","node":{"name":"Verify Secret","type":"n8n-nodes-base.if","typeVersion":2.3,"position":[112,0],
    "parameters":{"conditions":{"options":{"caseSensitive":true,"typeValidation":"strict","version":2},
      "conditions":[{"id":"verify-secret","leftValue":"={{ $json.headers['x-tc-secret'] }}",
        "rightValue":"={{ $vars.TC_WEBHOOK_SECRET }}","operator":{"type":"string","operation":"equals"}}],
      "combinator":"and"},"options":{}}}},
  {"type":"addNode","node":{"name":"Reject Unauthorized","type":"n8n-nodes-base.respondToWebhook","typeVersion":1.1,
    "position":[112,220],"parameters":{"respondWith":"text","responseBody":"Unauthorized","options":{"responseCode":401}}}},
  {"type":"removeConnection","source":"Webhook - Incoming Call","target":"Extract Input"},
  {"type":"addConnection","source":"Webhook - Incoming Call","target":"Verify Secret"},
  {"type":"addConnection","source":"Verify Secret","target":"Extract Input","sourceIndex":0},
  {"type":"addConnection","source":"Verify Secret","target":"Reject Unauthorized","sourceIndex":1}
]
```

### Workflow 4 — `ZByC1P9VYGV28OI2` (inbound branch only)
```json
[
  {"type":"addNode","node":{"name":"Verify Secret","type":"n8n-nodes-base.if","typeVersion":2.3,"position":[112,600],
    "parameters":{"conditions":{"options":{"caseSensitive":true,"typeValidation":"strict","version":2},
      "conditions":[{"id":"verify-secret","leftValue":"={{ $json.headers['x-tc-secret'] }}",
        "rightValue":"={{ $vars.TC_WEBHOOK_SECRET }}","operator":{"type":"string","operation":"equals"}}],
      "combinator":"and"},"options":{}}}},
  {"type":"addNode","node":{"name":"Reject Unauthorized","type":"n8n-nodes-base.respondToWebhook","typeVersion":1.1,
    "position":[112,820],"parameters":{"respondWith":"text","responseBody":"Unauthorized","options":{"responseCode":401}}}},
  {"type":"removeConnection","source":"Inbound Call Webhook","target":"Extract Caller Input"},
  {"type":"addConnection","source":"Inbound Call Webhook","target":"Verify Secret"},
  {"type":"addConnection","source":"Verify Secret","target":"Extract Caller Input","sourceIndex":0},
  {"type":"addConnection","source":"Verify Secret","target":"Reject Unauthorized","sourceIndex":1}
]
```

---

## Option B — build it in the UI (per workflow)

1. Drag an **IF** node onto the canvas; name it `Verify Secret`; set the
   condition above.
2. Drag a **Respond to Webhook** node; name it `Reject Unauthorized`; Text /
   `Unauthorized` / Response Code `401`.
3. Delete the wire from the webhook to its current first node.
4. Wire: webhook → `Verify Secret`; `Verify Secret` **true** → the original
   first node (`Extract Input` / `Extract Caller Input`); `Verify Secret`
   **false** → `Reject Unauthorized`.
5. Save.

---

## Verify

- Header-less `curl -X POST <production-url>` → **401 Unauthorized**.
- `curl -X POST -H "X-TC-Secret: <value>" …` → passes to the agent.

Only after both checks pass should you set the workflow **Active**.
