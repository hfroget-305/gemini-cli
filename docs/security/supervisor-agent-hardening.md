# Supervisor / Sub-Agent Hardening Checklist

Apply this checklist to any n8n workflow that uses an LLM-driven "Supervisor"
or router pattern dispatching to specialized sub-agents (Sales, OPS, etc.).
Written for the Maggie W1/W2/W3 loop and the unverified
Supervisor/Sales/OPS agents flagged in `n8n-security-review.md` §2 / §2b.

## 1. Tool allowlist (the single most important control)

Every n8n Agent node has a `tools` array. Audit it line by line.

- **Hard-forbid these tool nodes** unless there is a documented business
  reason and a human-approval gate downstream:
  - `n8n-nodes-langchain.toolWorkflow` pointing at any workflow with
    write access — *this is how a supervisor spawns/edits other agents*.
  - `n8n-nodes-base.httpRequest` with a URL that matches
    `*/rest/workflows*`, `*/api/v1/workflows*`, or any n8n REST endpoint.
  - `n8n-nodes-base.code` (the JS code tool) — gives the LLM
    arbitrary-code execution.
  - `n8n-nodes-base.executeCommand` — shell access.
- **Allowed tools must be parameter-pinned**: the resource and operation
  fields should be hardcoded (e.g. Zoho `lead:update`), not driven by the
  model.
- **Per-tool credentials**: each tool node must use a credential scoped to
  exactly the resource/operation it performs. Never reuse a "god"
  credential across tools.

## 2. Credential scoping

For each credential the agent uses, verify in the third-party console:

| Provider | Required minimum | Must NOT have |
|---|---|---|
| Zoho CRM | Module-level read/write on Leads + Deals only | Setup / Settings / Users / Custom modules write |
| Slack | `chat:write` for one channel ID | `admin.*`, `users:write`, channel create |
| RingCentral | `ReadCallLog`, `ReadMessages` | `EditAccounts`, `EditExtensions` |
| Mercately | Inbound webhook key only, no admin API key | Admin / billing scopes |
| Gmail | `gmail.send` on one alias | Full mailbox read, settings |
| n8n API | **No n8n API credential should exist for an agent unless it's the W1 publisher, and even then it should be approval-gated** | Workflow create/update/delete |

## 3. Approval gates

Insert a `Wait → form/Slack approval → Continue` gate before any operation
that:

- Creates or updates an n8n workflow (W1 "Playbook Init / Reseed").
- Mutates a prompt/playbook record consumed by another agent (W3 promotion).
- Issues a refund, sends bulk email/SMS, or writes to a billing system.
- Posts publicly (customer-facing channel, social, marketing list).

n8n's Form Trigger + `Wait` node combo is the simplest approval primitive.
The approver should see a diff (old → new) not just a "approve?" button.

## 4. Audit trail

Every promotion / creation / mutation event must be logged append-only:

- A dedicated Slack channel (`#agent-audit`) that receives the diff.
- A `data_table` row with `{ ts, agent, action, before, after, approver }`.
- Both, ideally. The Slack channel gives realtime visibility; the table
  gives queryable history.

n8n's `Set` node + `Postgres`/`data_table_add_row` is enough — no fancy SIEM
needed at this stage.

## 5. Prompt-injection defenses

If any sub-agent reads call transcripts, WhatsApp messages, lead names,
or other externally-controlled text and then feeds it to an LLM with tools:

- **Delimit** untrusted input with a stable, unguessable marker
  (`<<USER_INPUT_${runId}>>...<<END>>`) and tell the system prompt to
  treat anything inside as data, never instructions.
- **Length-limit** untrusted strings (e.g. 4 kB) before they hit the prompt.
- **Strip** strings matching `(?i)ignore (all|previous|prior)|system prompt|developer message|<\|im_start\|>`.
- The Agent node's `output parser` should reject any tool call whose
  arguments contain content from outside the allowed schema.

## 6. Tripwires

Add a separate watchdog workflow that runs every 15 min and pages you if:

- The count of workflows in the instance changes unexpectedly
  (`search_workflows` count != stored baseline).
- Any workflow's `updatedAt` moves without a matching audit row.
- An agent makes > N tool calls in a single execution (configurable
  per-agent ceiling).

This is your "the supervisor went rogue last night" alarm.

## 7. Kill switch

Document the one-command rollback for each autonomous workflow:

1. Toggle `active: false` via n8n UI or API.
2. Revoke the credential token at the provider (Zoho, Slack, etc.).
3. If a bad playbook was promoted, restore from the previous version stored
   in the audit table.

Keep this runbook printed/exported — if the agent has compromised your
n8n instance you may not be able to log in to read it.
