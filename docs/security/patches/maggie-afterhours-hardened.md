# Patch: `Maggie After-Hours Intake` (`uAEmLyjUHjh0IiEu`)

Applies to workflow `uAEmLyjUHjh0IiEu` — the ElevenLabs post-call →
Zoho + Telnyx SMS pipeline.

## Change 1 — verify ElevenLabs signature at the top of the flow

Add a new `Code` node named **"Verify EL Signature"** between the
`ElevenLabs Post-Call` webhook and `Normalize Call Data`. Wire the
webhook's main output to this node, then wire this node to `Normalize
Call Data`.

Node type: `n8n-nodes-base.code`, typeVersion 2.

```js
// ElevenLabs post-call webhook signs bodies with HMAC-SHA256.
// The signature is in header `elevenlabs-signature` and the secret is
// configured in the ElevenLabs agent's Post-call webhook UI.
// Store the secret in an env variable `ELEVENLABS_WEBHOOK_SECRET`
// (n8n Cloud: Settings → Environment Variables).

const crypto = require('crypto');
const req = $input.first().json;
const bodyRaw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
const providedSig = (req.headers?.['elevenlabs-signature'] || '').trim();
const secret = ($env.ELEVENLABS_WEBHOOK_SECRET || '').trim();

if (!secret) {
  throw new Error('ELEVENLABS_WEBHOOK_SECRET env var is not set');
}

// ElevenLabs typical format: "t=<ts>,v0=<hexHmac>"
const parts = Object.fromEntries(providedSig.split(',').map(p => p.split('=')));
const tsSec = Number(parts.t || 0);
const providedHex = (parts.v0 || '').toLowerCase();

if (!tsSec || !providedHex) {
  throw new Error('unauthorized: malformed signature header');
}
// Reject requests > 5 min old to block replay
if (Math.abs(Date.now() / 1000 - tsSec) > 300) {
  throw new Error('unauthorized: signature timestamp outside window');
}

const signedPayload = `${tsSec}.${bodyRaw}`;
const expectedHex = crypto
  .createHmac('sha256', secret)
  .update(signedPayload)
  .digest('hex');

const a = Buffer.from(expectedHex, 'hex');
const b = Buffer.from(providedHex, 'hex');
if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
  throw new Error('unauthorized: signature mismatch');
}

return $input.all();
```

If ElevenLabs isn't configured to sign your post-call webhook, replace
this with a shared-secret header check (`x-tc-secret` header must
match `TC_WEBHOOK_SECRET` env var).

## Change 2 — allowlist phone numbers before Telnyx SMS

Insert a new `If` node named **"SMS Allowlist Check"** between
`Resolve Member` and both `Create Task for Erika` paths so it also
gates `Send SMS Confirmation (Telnyx)`. Better: put the check right
before `Send SMS Confirmation`. Config:

- Condition (boolean AND):
  - `{{ /^\+1[0-9]{10}$/.test($('Resolve Member').item.json.smsTo) }}` equals `true`
  - `{{ $('Resolve Member').item.json.activationId }}` is not empty
- True branch → send SMS.
- False branch → no-op (drop / log to a diagnostic table).

The tighter version: only SMS numbers of Contacts that already exist
in Zoho (i.e. `activationId` was found). That eliminates SMS abuse
via an attacker who supplies a random phone number.

## Change 3 — escape the Zoho search criteria

Replace the `criteria` expression in `Find Activation in Zoho` from:

```
={{ $json.email ? "(Email:equals:" + $json.email + ")" : ($json.telefono ? "(Phone:equals:" + $json.telefono + ")" : "(Email:equals:nomatch@invalid.x)") }}
```

with:

```
={{ (() => {
  const clean = (s) => String(s ?? '').replace(/[()\\]/g, '').slice(0, 254);
  const email = clean($json.email);
  const phone = clean($json.telefono);
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return `(Email:equals:${email})`;
  if (phone && /^\+?[0-9]{7,15}$/.test(phone)) return `(Phone:equals:${phone})`;
  return '(Email:equals:nomatch@invalid.x)';
})() }}
```

Rejects malformed emails/phones and strips criteria-breaking characters.

## Change 4 — turn off success execution retention

In workflow settings, set:
- `saveDataSuccessExecution` → `"none"`
- keep `saveDataErrorExecution` → `"all"`

That's a per-workflow setting in the n8n UI: **Settings → Save Data**.

## Change 5 — retry on transient network failures

For each HTTP Request node (`Find Activation in Zoho`, both `Create
Task for Erika`, `Log Note on Activation`, `Send SMS Confirmation`):

- `retryOnFail: true`
- `maxTries: 3`
- `waitBetweenTries: 5000`
- `onError: continueRegularOutput` on the SMS node only

Zoho's DNS occasionally 500-EAI_AGAINs — retries cover it.
