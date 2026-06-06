# Obsidian MCP for Claude

Connect [Claude](https://claude.com/claude-code) to your [Obsidian](https://obsidian.md)
vault using the [Model Context Protocol](https://modelcontextprotocol.io). Once
configured, Claude can read, search, create, and edit notes in your vault.

There are two common ways to do this. Pick **one**.

| Approach | Needs Obsidian running? | Needs a plugin? | Best for |
| --- | --- | --- | --- |
| **A. Local REST API** (recommended) | Yes | Yes (one plugin) | Live editing while you work in Obsidian; richest tool set |
| **B. Direct filesystem** | No | No | Quick setup; batch edits when Obsidian is closed |

> **Note:** An MCP server runs as a local process on the same machine as your
> Obsidian vault. It must be configured in **your local Claude client** — it
> cannot reach a vault that only exists on your laptop from a cloud session.

---

## Approach A — Local REST API (recommended)

Uses the [`mcp-obsidian`](https://github.com/MarkusPfundstein/mcp-obsidian)
server, which talks to Obsidian over the **Local REST API** community plugin.

### 1. Install and enable the Local REST API plugin

1. Open Obsidian → **Settings → Community plugins**.
2. Turn off Restricted Mode if needed, then **Browse** and install
   **"Local REST API"**.
3. Enable it. In the plugin's settings, copy the **API Key**.
4. Note the port. Defaults: **`27124`** (HTTPS) / **`27123`** (HTTP).

### 2. Install `uv` (provides `uvx`)

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh
# or: brew install uv

# Windows (PowerShell)
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### 3. Register the server with Claude Code

```bash
claude mcp add mcp-obsidian \
  --env OBSIDIAN_API_KEY=your_api_key_here \
  --env OBSIDIAN_HOST=127.0.0.1 \
  --env OBSIDIAN_PORT=27124 \
  -- uvx mcp-obsidian
```

Or copy [`mcp.example.json`](./mcp.example.json) into your config (see
[Where configs live](#where-claude-configs-live) below) and fill in your key.

### 4. Verify

Start Obsidian (so the REST API is listening), then run:

```bash
claude mcp list
```

You should see `mcp-obsidian` connected. Ask Claude something like
*"List the notes in my vault"* to confirm.

---

## Approach B — Direct filesystem (no plugin)

Uses [`obsidian-mcp`](https://github.com/StevenStavrakis/obsidian-mcp), which
reads and writes the vault's markdown files directly. No plugin or API key.

```bash
claude mcp add obsidian -- npx -y obsidian-mcp "/absolute/path/to/your/vault"
```

> Point it at the vault **root** (the folder containing `.obsidian/`). Prefer
> running batch edits while Obsidian is closed to avoid sync races.

---

## Where Claude configs live

- **Claude Code (project scope):** a `.mcp.json` at the repo root — shared with
  anyone who checks out the repo.
- **Claude Code (user scope):** `claude mcp add --scope user ...` — available in
  every project on your machine. Good choice for a personal vault.
- **Claude Desktop:** `claude_desktop_config.json`
  - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
  - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

All of them use the same `mcpServers` JSON shape shown in
[`mcp.example.json`](./mcp.example.json).

---

## Security notes

- Your `OBSIDIAN_API_KEY` grants full read/write to your vault. Keep it out of
  version control — use environment variables, not committed files. See
  [`.env.example`](./.env.example).
- The Local REST API binds to `127.0.0.1` by default (local only). Do not expose
  it to your network unless you understand the risk.
- Claude will ask before running tools the first time; review write/delete
  actions before approving.

## Troubleshooting

- **`uvx: command not found`** — `uv` isn't on your PATH. Re-open your shell or
  add `~/.local/bin` to PATH.
- **Connection refused** — Obsidian isn't running, the plugin is disabled, or the
  port/host is wrong. Confirm the port in the plugin settings.
- **TLS / certificate errors** — the plugin uses a self-signed HTTPS cert. Use
  the HTTPS port (`27124`) with `mcp-obsidian`, which handles this; if you switch
  to plain HTTP, set `OBSIDIAN_PORT=27123`.
