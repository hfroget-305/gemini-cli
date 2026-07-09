# n8n Hardening — Next Actions Runbook (tasks 1–5)

Branch: `claude/review-n8n-security-fCPcd` · PR #109 · created 2026-07-06
Ordered by risk-reduction per effort. Owner column: **You** = console/UI
only; **Claude** = automatable via MCP once unblocked.

Do them top to bottom — #1 is the biggest live risk and later items assume
it's done.

---

## 1. Enable the three Verify Secret webhook gates  — Owner: You  — ~15 min

**Why:** `maggie-cs`, `maggie-afterhours`, `synthflow-afterhours` are still
unauthenticated public endpoints. The gates are already built and disabled;
this is the single highest-value change left.

**Order matters — headers BEFORE enabling, or you drop live traffic:**
1. n8n → Settings → Variables → create `TC_WEBHOOK_SECRET`
   (e.g. `openssl rand -base64 32`; suggested: `ImrXS9+t9j5g+FT/gtoGsaZeANb/w1Dvy82QTvqqiqI=`).
2. Add header `X-TC-Secret: <that value>` on **all three** providers first:
   ElevenLabs (post-call webhook), Zoho SalesIQ (webhook integration), Synthflow.
3. Enable the `Verify Secret` node **one workflow at a time**. After each:
   - header-less `curl -X POST <url>` → expect 401 / drop
   - a real event → expect pass
   Only then move to the next workflow. Do it in a low-traffic window.

**Done when:** all three header-less curls are rejected and real events pass.

## 2. Audit the 4 locked workflows  — Owner: You → Claude  — you: 1 min, me: ~10 min

**Why:** biggest blind spot. `Facebook Lead Ads → Zoho` and
`RingCentral → Zoho` are almost certainly internet-facing webhook receivers
writing external data into the CRM — the exact profile that produced the
worst findings in the audited set. Two SimpleLife voice agents also unseen.

**Steps:**
1. You: toggle *Available in MCP* ON for `p0fYHq69WohYcZC7` (FB Lead Ads),
   `c6yYzZbXSg25ygTg` (RingCentral → Zoho), `nn4b2pMIkforxmwx` and
   `ZByC1P9VYGV28OI2` (SimpleLife).
2. Claude: audit all four, patch what's safe, append findings to
   `n8n-security-review.md`.

**Done when:** all four have a §-entry in the review and any criticals patched.

## 3. Execution retention + redaction  — Owner: You  — ~5 min

**Why:** 8,652 execution rows back to April hold unbounded PII (names,
phones, emails, call transcripts) incl. RingSense-era data. Key rotation
handled the secrets; this handles the PII.

**Steps:**
- Per-workflow: set **Save successful production executions** = *Do not save*
  (Settings tab) on the high-volume ones (Hot Lead Alert is ~99% of runs).
- Instance: set data-retention / `EXECUTIONS_DATA_MAX_AGE` low (≤14 days) and
  enable redaction of sensitive values in execution data.
- Prune existing old executions once retention is set.

**Done when:** old rows are pruned and new success runs aren't stored in full.

## 4. Housekeeping  — Owner: You (mostly)  — ~10 min

- **Delete Synthflow** (`kdAA38uPRH6QxeXr`) — open endpoint that only no-ops.
  UI → ⋯ → Delete. (MCP archive kept failing here.)
- **Delete the 2 orphaned credentials** — `Anthropic API Key` (httpHeaderAuth
  `u1Z0j9HyOwJBc8HC`) and `Bearer Auth account` (`xFfML7HGa79mw0KI`).
- **Paste the Daily Digest patch** — `patches/daily-digest-html.js` into the
  `Build Digest HTML` node of `IW2YiWSiRawDEgXh`, then Publish. (Claude can
  retry this via MCP if the write path stabilizes.)

**Done when:** Synthflow gone, orphans gone, digest published with escaping.

## 5. Defense-in-depth (only after 1–4)  — Owner: You + Claude

- SMS per-number/day rate-limit (n8n data-table counter) in front of Telnyx.
- Append-only audit log (Slack channel or data-table) of every CRM write.
- Upgrade the money-moving SMS webhook from shared-secret to HMAC signature.
- Consider a proxy (Cloudflare) in front of n8n for auth + rate limiting.

**Done when:** each is either implemented or explicitly deferred with a reason.

---

### Meta: fix the MCP write instability

~Half of this session's writes failed (stream-closed / approval errors) and
had to be retried or verified by read-back. If you keep managing n8n through
this integration, run **writes from an interactive Claude Code session**
(where you approve each call) — it sidesteps the flakiness entirely.
