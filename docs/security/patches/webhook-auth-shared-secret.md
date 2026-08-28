# Patch — Shared-secret authentication for inbound webhooks

Closes the CRITICAL unauthenticated-webhook findings on the three
public POST endpoints:

| Workflow | ID | Path |
|---|---|---|
| Maggie CS Agent | `VDPm65jUXYgIGKlI` | `/webhook/maggie-cs` |
| Maggie After-Hours Intake | `uAEmLyjUHjh0IiEu` | `/webhook/maggie-afterhours` |
| Synthflow After-Hours (capture) | `kdAA38uPRH6QxeXr` | `/webhook/synthflow-afterhours` |

Chosen approach: **shared-secret header** — a single high-entropy secret
that each provider sends as a custom header, checked as the first step of
each workflow. Portable (no `crypto`/`require`, which n8n Cloud Code nodes
restrict), works with every provider here, and makes the endpoints
effectively unguessable.

Status: **prepared, not yet applied** — the n8n MCP write connection was
failing at the time of writing; apply in the UI or have me apply via MCP
once it's stable. This one requires adding nodes (structural), so the UI
is the reliable path right now.

---

## Step 1 — create the secret

Generate a 32-byte random secret (run locally):

```
openssl rand -base64 32
```

Store it in n8n as a **Variable** named `TC_WEBHOOK_SECRET`
(Settings → Variables — n8n Cloud Pro/Enterprise). Reference it in
expressions as `$vars.TC_WEBHOOK_SECRET`.

> If your plan has no Variables feature, substitute the literal secret
> string wherever `$vars.TC_WEBHOOK_SECRET` appears below. That still
> blocks all external callers; the only downside is the secret is visible
> to anyone with `workflow:read`, so rotate it if that list changes.

## Step 2 — add a verify step to each workflow

For each of the three workflows, insert an **IF** node named
`Verify Secret` immediately after the Webhook node, before any existing
processing node. Condition (Boolean, is **true**):

```
={{ ($json.headers?.['x-tc-secret'] ?? '') === $vars.TC_WEBHOOK_SECRET }}
```

Wire the branches:

- **true** → the workflow's existing first processing node
  (`Normalize Input` for maggie-cs, `Normalize Call Data` for
  maggie-afterhours, the capture/Set node for synthflow).
- **false** → a terminating node that does **not** run any business logic:
  - `maggie-cs` responds via a Respond-to-Webhook node → add a
    `Respond 401` node on the false branch:
    - Respond With: **text**, Response Code: **401**, body `unauthorized`.
  - `maggie-afterhours` responds immediately ("Workflow got started"),
    so the false branch just needs a `No Operation` node (dead-end) — the
    request is accepted at the HTTP layer but no SMS/CRM action runs.
  - `synthflow-afterhours` — false branch → `No Operation` (or simply
    delete this capture workflow if you no longer need the payload shape).

n8n lowercases header names in `$json.headers`, so the check uses
`x-tc-secret` regardless of how the provider cases it.

## Step 3 — configure each provider to send the header

Add a custom request header `X-TC-Secret: <the secret>` on each source:

- **ElevenLabs** → agent → Post-call webhook → custom headers.
- **Zoho SalesIQ** → the webhook/bot integration that calls `/webhook/maggie-cs`.
- **Synthflow** → the webhook action that calls `/webhook/synthflow-afterhours`.

Test each provider end-to-end after wiring, then confirm a header-less
`curl` POST now returns 401 / does nothing.

---

## Step 4 — rate-limit the SMS path (defense in depth)

Even with auth, the Telnyx SMS node moves money, so cap it. Add before
`Send SMS Confirmation (Telnyx)` a small counter using an n8n data table
keyed by destination number + day; if a number has already received an SMS
today (or a global daily cap is hit), skip the send. This bounds the blast
radius if the secret ever leaks.

## Rotation

To rotate: change `TC_WEBHOOK_SECRET` in n8n Variables, then update the
`X-TC-Secret` header value on all three providers. No workflow edit needed
(that's the benefit of referencing the Variable rather than a literal).
