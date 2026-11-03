# Installing the Green Screen Memes MCP server

Instructions for AI agents (Cline, Claude Code, Cursor and others) setting up this server for a user.

This is a **hosted, remote MCP server**. There is nothing to clone, build or run locally:
you only add the server URL and the user's API key to the MCP client's config.

- Endpoint: `https://api.greenscreenmemes.app/mcp`
- Transport: Streamable HTTP
- Auth: `Authorization: Bearer <key>` header

## 1. Get the user's API key

Ask the user for their Green Screen Memes API key (it starts with `gsm_live_`). If they
don't have one, they can create a free **Sandbox** key at
https://api.greenscreenmemes.app/dashboard (sign in with Google or an email link). Sandbox
includes 50 video downloads in total (one time, not monthly) and 30,000 calls a month.

Never commit the key to a repository or paste it into shared files.

## 2. Add the server

### Cline

Add this entry to `cline_mcp_settings.json` (open it from Cline's MCP Servers panel),
replacing the placeholder with the user's key. Set `"type": "streamableHttp"`
explicitly; without it Cline falls back to the legacy SSE transport.

```json
{
  "mcpServers": {
    "green-screen-memes": {
      "type": "streamableHttp",
      "url": "https://api.greenscreenmemes.app/mcp",
      "headers": {
        "Authorization": "Bearer gsm_live_your_key_here"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

### Claude Code

```sh
claude mcp add --transport http green-screen-memes https://api.greenscreenmemes.app/mcp \
  --header "Authorization: Bearer $GSM_API_KEY"
```

### Cursor and other clients

Use url `https://api.greenscreenmemes.app/mcp` with the same `Authorization` header. Ready-made
configs are in [`examples/claude-code`](examples/claude-code).

## 3. Check it works

The server should show 7 read-only tools: `search_green_screens`, `get_green_screen`,
`get_trending`, `list_collections`, `get_collection`, `list_tags`, `get_usage`.

Listing tools works without a key, but every tool call needs one. To confirm the key is
set, call `get_usage`: it returns the user's plan and this month's usage. An error saying
"Send your API key as `Authorization: Bearer <key>`" means the header is missing or wrong.

## 4. Using the clips

`get_green_screen` returns a signed video link (valid for about 6 hours) and a ready
`ffmpeg` command for that clip's key color, so an agent with a shell can download the clip
and composite it over the user's photo or video. FFmpeg must be installed for that step;
the MCP server itself needs nothing local.

The clips are internet memes. The API doesn't license the original footage; see
https://api.greenscreenmemes.app/terms before publishing anything made with them.
