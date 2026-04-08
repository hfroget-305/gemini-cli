# A2A `developer-profile` Extension — v0 Specification

> **Status:** Stub — work in progress. See the [RFC](../../../../packages/a2a-server/development-extension-rfc.md) for the full design rationale. Open items are marked with `TODO`.

---

## Table of contents

1. [Overview](#1-overview)
2. [Versioning](#2-versioning)
3. [Extension registration](#3-extension-registration)
4. [Session initialization](#4-session-initialization)
5. [Schema definitions](#5-schema-definitions)
   - 5.1 [AgentSettings](#51-agentsettings)
   - 5.2 [ToolCall](#52-toolcall)
   - 5.3 [AgentThought](#53-agentthought)
   - 5.4 [DevelopmentToolEvent](#54-developmenttoolEvent)
   - 5.5 [ToolCallConfirmation](#55-toolcallconfirmation)
6. [Method definitions](#6-method-definitions)
   - 6.1 [commands/get](#61-commandsget)
   - 6.2 [command/execute](#62-commandexecute)
7. [Communication flow](#7-communication-flow)
8. [Separation of concerns](#8-separation-of-concerns)
9. [Open issues](#9-open-issues)

---

## 1. Overview

The `developer-profile` extension defines a communication contract layered on top of the [A2A protocol](https://a2a-protocol.org) (now a Linux Foundation standard) for rich, interactive development workflows between a client (IDE, editor, or other surface) and the Gemini CLI agent.

The extension introduces:

- A session initialization schema (`AgentSettings`) carried in `Message.metadata`.
- Structured schemas for agent-to-client streaming events: tool calls, thoughts, and state changes.
- A client-to-agent confirmation schema for gated tool execution.
- Two new JSON-RPC methods (`commands/get`, `command/execute`) for slash-command discovery and execution.

> **Note on naming:** The RFC refers to this extension as `development-tool`; the canonical identifier used in the Agent Card URI (and therefore by clients for version negotiation) is `developer-profile`. These names should be reconciled before the spec exits draft status. See [open issue §9](#9-open-issues).

---

## 2. Versioning

The extension version is embedded directly in the Agent Card `uri` field:

```
https://github.com/google-gemini/gemini-cli/blob/main/docs/a2a/developer-profile/v0/spec.md
                                                                                    ^^
                                                                                    version path segment
```

**Compatibility rules** (following [Semantic Versioning 2.0.0](https://semver.org)):

| Change type | Version impact | Example |
|---|---|---|
| Backwards-compatible additions | Minor/patch — same `v<major>` path | New optional field in an existing schema |
| Breaking changes | New major path segment | `v0` → `v1` |

A client MUST extract the version segment from the URI and apply semver compatibility logic before connecting. If the client does not support the advertised major version it MUST refuse the connection and surface a meaningful error.

> **TODO:** Define exact semver ranges clients should accept (e.g. `>=0.1.0 <1.0.0`). During `v0` the spec is explicitly unstable and breaking changes may occur without a major bump — clients should treat `v0` as a pre-release.

---

## 3. Extension registration

An agent that implements this extension MUST advertise it in its A2A Agent Card:

```json
{
  "name": "Gemini CLI Agent",
  "description": "An agent that generates code based on natural language instructions.",
  "capabilities": {
    "streaming": true,
    "extensions": [
      {
        "uri": "https://github.com/google-gemini/gemini-cli/blob/main/docs/a2a/developer-profile/v0/spec.md",
        "description": "An extension for interactive development tasks, enabling features like code generation, tool usage, and real-time status updates.",
        "required": true
      }
    ]
  }
}
```

The `required: true` field signals that clients which do not support this extension MUST NOT attempt to communicate with the agent.

All custom objects placed in any A2A `metadata` field MUST be keyed by this URI to prevent naming collisions with other extensions:

```json
{
  "metadata": {
    "https://github.com/google-gemini/gemini-cli/blob/main/docs/a2a/developer-profile/v0/spec.md": {
      "kind": "TOOL_CALL_UPDATE",
      ...
    }
  }
}
```

---

## 4. Session initialization

The **first** `message/stream` request in a session MUST include an `AgentSettings` object in `Message.metadata` (keyed by the extension URI). Subsequent messages in the same session do not need to repeat it.

---

## 5. Schema definitions

All schemas are expressed in proto3 syntax for precision. Wire format is JSON (following A2A conventions) unless otherwise noted.

### 5.1 AgentSettings

Carries per-session configuration from the client to the agent.

```proto
syntax = "proto3";

// Configuration settings for the Gemini CLI agent.
// Sent in the metadata of the first message/stream request.
message AgentSettings {
  // The absolute path to the workspace directory where the agent will execute.
  string workspace_path = 1;

  // TODO: document additional configuration fields as they are stabilised
  // (e.g. MCP server configs, allowed tools, sandboxing options).
}
```

### 5.2 ToolCall

The central schema for representing a tool's full execution lifecycle. The agent sends the **entire object** on every state change — clients are intentionally kept stateless.

```proto
syntax = "proto3";

import "google/protobuf/struct.proto";

// ToolCall is the central message representing a tool's execution lifecycle.
// The entire object is re-sent by the agent on every update.
message ToolCall {
  // A unique identifier, assigned by the agent.
  string tool_call_id = 1;

  // The current state of the tool call in its lifecycle.
  ToolCallStatus status = 2;

  // Name of the tool being called (e.g. 'Edit', 'ShellTool').
  string tool_name = 3;

  // An optional description of the tool call's purpose for display.
  optional string description = 4;

  // The structured input parameters provided by the LLM for tool invocation.
  google.protobuf.Struct input_parameters = 5;

  // Real-time output from the tool while it executes (primarily shell output).
  // The entire string is replaced on each streaming update.
  optional string live_content = 6;

  // The final result of the tool call.
  oneof result {
    ToolOutput output = 7;
    ErrorDetails error = 8;
  }

  // Populated while status is PENDING and user permission is required.
  optional ConfirmationRequest confirmation_request = 9;
}

enum ToolCallStatus {
  STATUS_UNSPECIFIED = 0;
  PENDING    = 1;  // Awaiting confirmation or pre-execution checks.
  EXECUTING  = 2;  // Tool is actively running.
  SUCCEEDED  = 3;  // Tool completed successfully.
  FAILED     = 4;  // Tool encountered an error.
  CANCELLED  = 5;  // Cancelled by the user or agent.
}

message ToolOutput {
  oneof result {
    string text = 1;
    FileDiff diff = 2;                        // File modification result.
    google.protobuf.Struct structured_data = 3; // Generic JSON fallback.
  }
}

message ErrorDetails {
  string message = 1;
  optional string type = 2;        // Agent-specific category, e.g. 'mcp_tool_error'.
  optional int32 status_code = 3;
}

message ConfirmationRequest {
  repeated ConfirmationOption options = 1;
  oneof details {
    ExecuteDetails  execute_details  = 2;
    FileDiff        file_edit_details = 3;
    McpDetails      mcp_details      = 4;
    GenericDetails  generic_details  = 5;
  }
}

message ConfirmationOption {
  string id = 1;                   // e.g. 'proceed_once', 'cancel'.
  string name = 2;                 // Human-readable, e.g. 'Allow Once'.
  optional string description = 3; // Tooltip text.
}

message ExecuteDetails {
  string command = 1;
  optional string working_directory = 2;
}

message FileDiff {
  string file_name = 1;
  string file_path = 2;             // Absolute path.
  optional string old_content = 3;
  string new_content = 4;
  optional string formatted_diff = 5; // Pre-formatted for display.
}

message McpDetails {
  string server_name = 1;
  string tool_name = 2;
}

message GenericDetails {
  string description = 1;
}
```

**Tool call lifecycle:**

```
PENDING ──(approved)──► EXECUTING ──► SUCCEEDED
   │                        │
   └──(cancelled)──► CANCELLED  └──► FAILED
```

### 5.3 AgentThought

Represents an internal reasoning step surfaced to the client for transparency.

```proto
syntax = "proto3";

message AgentThought {
  // A concise subject line or title for the thought.
  string subject = 1;

  // The elaboration or full body of the thought.
  string description = 2;
}
```

### 5.4 DevelopmentToolEvent

Carried in `TaskStatusUpdateEvent.metadata` (keyed by the extension URI) so clients can deserialize the accompanying `Message` correctly.

```proto
syntax = "proto3";

message DevelopmentToolEvent {
  enum DevelopmentToolEventKind {
    DEVELOPMENT_TOOL_EVENT_KIND_UNSPECIFIED = 0;
    TOOL_CALL_CONFIRMATION = 1; // Agent is awaiting user confirmation.
    TOOL_CALL_UPDATE       = 2; // ToolCall state has changed.
    TEXT_CONTENT           = 3; // Plain text response from the agent.
    STATE_CHANGE           = 4; // Task state has changed (submitted/working/completed/…).
    THOUGHT                = 5; // Agent surfacing an internal reasoning step.
  }

  DevelopmentToolEventKind kind = 1;
  string model = 2;        // Model identifier used for this event.
  string user_tier = 3;    // Optional user tier.
  string error = 4;        // Non-empty if an unexpected agent error occurred.
}
```

### 5.5 ToolCallConfirmation

Sent by the client in response to a `ConfirmationRequest`. Must be included in a new `message/stream` request that carries the same `contextId` and `taskId` as the paused task.

```proto
syntax = "proto3";

message ToolCallConfirmation {
  string tool_call_id = 1;
  // The 'id' of the ConfirmationOption the user selected.
  string selected_option_id = 2;

  oneof modified_details {
    ModifiedFileDetails file_details = 3; // When the user edits a proposed file diff.
  }
}

message ModifiedFileDetails {
  string new_content = 1;
}
```

---

## 6. Method definitions

### 6.1 `commands/get`

Allows the client to discover all slash commands the agent supports. Clients SHOULD call this once during startup to dynamically populate their command palette.

**Request:** _(no parameters)_

**Response:**

```proto
message GetAllSlashCommandsResponse {
  repeated SlashCommand commands = 1;
}

message SlashCommand {
  string name = 1;
  string description = 2;
  repeated SlashCommandArgument arguments = 3;
  repeated SlashCommand sub_commands = 4;  // For nested commands, e.g. /memory add.
}

message SlashCommandArgument {
  string name = 1;
  string description = 2;
  bool is_required = 3;
}
```

### 6.2 `command/execute`

Executes a slash command. After the initial response, all subsequent output is delivered as `TaskStatusUpdateEvent` messages over the standard A2A streaming channel using the schemas defined in §5.

**Request:**

```proto
message ExecuteSlashCommandRequest {
  // Path segments of the command, e.g. ["memory", "add"] for /memory add.
  repeated string command_path = 1;
  // Arguments as a single string.
  string args = 2;
}
```

**Response:**

```proto
enum CommandExecutionStatus {
  COMMAND_EXECUTION_STATUS_UNSPECIFIED = 0;
  STARTED                    = 1;
  FAILED_TO_START            = 2;
  AWAITING_SHELL_CONFIRMATION = 3;
  AWAITING_ACTION_CONFIRMATION = 4;
}

message ExecuteSlashCommandResponse {
  string execution_id = 1;
  CommandExecutionStatus status = 2;
  string message = 3;  // Explanation, especially when status is FAILED_TO_START.
}
```

---

## 7. Communication flow

The full interaction follows the A2A task-based streaming pattern. A worked example:

1. **Client → Server** — `message/stream` with `AgentSettings` in metadata.
2. **Server → Client** — SSE stream opens; server sends a `Task` with `status.state: submitted`, then a `TaskStatusUpdateEvent` with `kind: STATE_CHANGE` and `status.state: working`.
3. Agent decides to call a tool requiring confirmation.
4. **Server → Client** — `TaskStatusUpdateEvent` with `kind: TOOL_CALL_UPDATE` and `ToolCall.status: PENDING` (confirmation_request populated), followed by a final `TaskStatusUpdateEvent` with `kind: STATE_CHANGE`, `status.state: input-required`, `final: true`. Stream ends.
5. **Client** — renders confirmation UI; user approves.
6. **Client → Server** — new `message/stream` with same `taskId` and `ToolCallConfirmation` in a `DataPart`.
7. **Server → Client** — new SSE stream; events with `kind: TOOL_CALL_UPDATE` as the tool moves through `EXECUTING` → `SUCCEEDED`.
8. Agent generates a final response.
9. **Server → Client** — `TaskStatusUpdateEvent` with `kind: TEXT_CONTENT` (agent's text), then a final event with `kind: STATE_CHANGE`, `status.state: completed`, `final: true`.

> **TODO:** Provide a formal sequence diagram.

---

## 8. Separation of concerns

All **client-side context** (e.g. workspace state, open buffers) and **client-side tool execution** (e.g. reading active editor buffers) MUST be routed through MCP. The `developer-profile` A2A extension is the authoritative channel for agent communication only. This enforces a strict boundary: A2A carries agent output, MCP carries client capabilities.

---

## 9. Open issues

| # | Issue | Status |
|---|---|---|
| 1 | **Name inconsistency** — RFC uses `development-tool`; URI uses `developer-profile`. Decide on a canonical name and update both. | Open |
| 2 | **v0 stability guarantee** — Define whether `v0` follows standard semver pre-release rules or a lighter-weight "breaking changes allowed at any time" policy. | Open |
| 3 | **Proto vs JSON schema** — Decide whether proto3 is the normative format or whether JSON Schema definitions are needed alongside. | Open |
| 4 | **Metadata key format** — Confirm the exact string clients must use as a key in `metadata` objects (full URI vs a shorter alias). | Open |
| 5 | **`commands/get` auth** — Specify whether the method requires an authenticated session or can be called before `AgentSettings` is sent. | Open |
| 6 | **Sequence diagram** — Add a formal sequence diagram for the §7 communication flow. | Open |
