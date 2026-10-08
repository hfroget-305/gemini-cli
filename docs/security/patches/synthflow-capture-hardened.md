# Patch: `Synthflow After-Hours (capture)` (`kdAA38uPRH6QxeXr`)

This workflow is currently just a webhook stub with no processing —
its description says it's a "temporary capture" to inspect Synthflow's
post-call JSON. It has been active in production for a month.

## Recommendation: delete it

If you're not actively using it right now to inspect a payload, delete
the workflow. It's a public POST endpoint that lets anyone drop rows
into your execution log.

## If you must keep it: harden per below

### Change 1 — require a shared-secret header

Add a `Code` node named **"Auth"** right after the `Synthflow
Post-Call` webhook. Set env var `SYNTHFLOW_SHARED_SECRET`.

```js
const got = ($input.first().json.headers?.['x-tc-secret'] || '').trim();
const expected = ($env.SYNTHFLOW_SHARED_SECRET || '').trim();
if (!expected || got !== expected) {
  throw new Error('unauthorized');
}
return $input.all();
```

Configure Synthflow (Post-call webhook UI) to send the same secret
in the `x-tc-secret` header.

### Change 2 — attach an expiration to the workflow name

Rename the workflow to include a review-by date, e.g.
`Synthflow After-Hours (capture — remove after 2026-08-01)`.
n8n doesn't have a native expiry but the name is a forcing function
on the weekly review.

### Change 3 — set success retention off

Same settings change — `saveDataSuccessExecution: "none"`. You only
need the first few requests to inspect the payload shape; after that
the workflow becomes pure attack surface.
