# Claude Code, Cursor and other MCP clients

The Green Screen Memes MCP server lives at `https://api.greenscreenmemes.app/mcp`
(Streamable HTTP, stateless). Your API key goes in the `Authorization` header.

## Claude Code

```sh
claude mcp add --transport http green-screen-memes https://api.greenscreenmemes.app/mcp \
  --header "Authorization: Bearer $GSM_API_KEY"
```

Or copy [`.mcp.json`](.mcp.json) into your project root. Claude Code fills in
`${GSM_API_KEY}` from your environment, so the key never lands in the file.

## Cursor

Copy [`.cursor/mcp.json`](.cursor/mcp.json) into your project (or merge it into
`~/.cursor/mcp.json`). Cursor reads the key with `${env:GSM_API_KEY}`.

## Other clients

Any client that speaks Streamable HTTP: url `https://api.greenscreenmemes.app/mcp`,
header `Authorization: Bearer <your key>`. For clients that only run local (stdio)
servers, such as Claude Desktop, bridge it with `mcp-remote`:

```json
{
  "mcpServers": {
    "green-screen-memes": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://api.greenscreenmemes.app/mcp", "--header", "Authorization:${AUTH_HEADER}"],
      "env": { "AUTH_HEADER": "Bearer gsm_live_your_key_here" }
    }
  }
}
```

It's also in the official MCP Registry as `app.greenscreenmemes.api/green-screen-memes`.

## Try it

Put a photo at `./shop.jpg`, make sure `ffmpeg` is installed, and paste
[`prompt.md`](prompt.md):

> Make a meme for my coffee shop. Find a green screen of someone or something
> reacting with pure relief or joy (think "first sip of coffee on a Monday"),
> key it over ./shop.jpg as a vertical 1080x1920 video that keeps the clip's
> sound, and caption it "Monday, fixed." Use ffmpeg, check the thumbnail before
> you commit to a clip, and save it as coffee-meme.mp4.

The agent calls `search_green_screens`, picks a clip, calls `get_green_screen` for
its download link and ffmpeg recipe, then downloads and composites it.

## Tools

| Tool | What it does |
|---|---|
| `search_green_screens` | Search by words (`query`), `tag` or `color`; empty query lists the newest |
| `get_green_screen` | One clip by id, with its video link and a ready-to-run ffmpeg recipe |
| `get_trending` | What people use most in the Green Screen Memes app right now, with ranks |
| `list_collections` / `get_collection` | Curated collections, including `trending` |
| `list_tags` | The most used tags and their counts |
| `get_usage` | Your plan and this month's calls and downloads |

Tip: search by feeling or action ("tired", "shocked", "happy dance"), not by
subject ("latte", "barista"). The library is organised by reaction.

Each tool call counts as one API call; each video download counts toward the
plan's monthly downloads.
