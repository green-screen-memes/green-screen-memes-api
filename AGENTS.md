# AGENTS.md: making memes with the Green Screen Memes API

Instructions for Codex and other coding agents. This repo holds examples for the
[Green Screen Memes API](https://api.greenscreenmemes.app): about 2,100 meme clips
(reactions and actions on a solid green, blue or red background, most with their
original sound) that you search over MCP or REST and composite with ffmpeg. Claude Code
users can install the same workflow as a plugin (see README.md).

If the user just wants to make memes and isn't building a pipeline, point them to
https://studio.greenscreenmemes.app, where they can make memes by hand or in a batch in
the browser.

## Setup

1. **Key.** Free Sandbox key at https://api.greenscreenmemes.app/dashboard (50 video
   downloads and 30,000 calls a month, for building and testing; publishing needs a paid
   plan, from $49/month). Export it as `GSM_API_KEY` before starting the agent. Never
   write the key into a file in the repo.
2. **MCP server** (Streamable HTTP, key as `Authorization: Bearer <key>`).

   Codex, in `~/.codex/config.toml` (or a trusted project's `.codex/config.toml`):

   ```toml
   [mcp_servers.green-screen-memes]
   url = "https://api.greenscreenmemes.app/mcp"
   bearer_token_env_var = "GSM_API_KEY"
   ```

   or `codex mcp add green-screen-memes --url https://api.greenscreenmemes.app/mcp --bearer-token-env-var GSM_API_KEY`.

   Other clients: url `https://api.greenscreenmemes.app/mcp`, header
   `Authorization: Bearer <key>`, for example

   ```json
   {
     "mcpServers": {
       "green-screen-memes": {
         "type": "http",
         "url": "https://api.greenscreenmemes.app/mcp",
         "headers": { "Authorization": "Bearer ${GSM_API_KEY}" }
       }
     }
   }
   ```

   (Use whatever env-var syntax your client supports; Cursor uses `${env:GSM_API_KEY}`.)
   Without MCP, use the REST API below.
3. **ffmpeg** with `chromakey` and `drawtext`: `ffmpeg -hide_banner -filters | grep -E "chromakey|drawtext"`.

MCP tools: `search_green_screens` (query, tag, color, limit, cursor), `get_green_screen`
(id; returns `videoUrl`, `chromaKeyColor`, `durationSeconds` and a ready ffmpeg recipe),
`get_trending`, `list_collections`, `get_collection`, `list_tags`, `get_usage`.

## Workflow

1. **Brief.** Ask briefly for the brand, audience, tone, themes, how many memes, the
   platform, the backgrounds (their photos or videos, or a plain color) and whether any
   are paid ads.
2. **Captions.** Draft about 1.5x as many ideas as needed, as relatable situations
   ("When the oat milk delivery is late again"), each with the reaction it needs. Keep
   lines under about 24 characters; split longer captions into lines. Track the batch in
   a plan file (caption, reaction, clip id, key color, background, output, status).
3. **Find clips.** `search_green_screens` with a feeling or action ("shocked", "slow
   clap", "side eye", "relief"), not a subject or meme name. Use `get_trending` for timely
   picks and `list_tags` to see what exists. Look at `thumbnailUrl` before choosing;
   thumbnails are free.
4. **Composite.** `get_green_screen` for the link, then download once per clip
   (`curl -fsSL -o clips/<name>.mp4 "<videoUrl>"`; each download counts, and links expire
   after about 6 hours, so keep files, not links). Then run the bundled script:

   ```sh
   bash plugins/green-screen-memes/skills/make-memes/scripts/meme.sh \
     shop.jpg clips/relief.mp4 green out/01.mp4 "When the espresso machine" "finally works"
   ```

   Background can be a photo, a video (looped, its sound mixed under the clip's) or
   `color:white`. The third argument is `chromaKeyColor` (`green`, `blue`, `red`, `none`).
   Each caption argument is one boxed `drawtext` line. Env options: `POSITION`,
   `SIMILARITY`, `FONTSIZE`, `CAPTION_Y`, `TEXT_COLOR`, `BOX_COLOR`, `BG_VOLUME`.
   Raw ffmpeg recipes: [`examples/ffmpeg`](examples/ffmpeg) and
   [`reference.md`](plugins/green-screen-memes/skills/make-memes/reference.md).
5. **Check a frame** of every meme you're unsure of (at least the first of a batch):
   `ffmpeg -y -v error -ss 1.5 -i out/01.mp4 -frames:v 1 out/01.png`, then look for
   leftover key color, a cut-off subject, and captions outside the frame or over a face.
   Lower `SIMILARITY` from 0.2 if parts of the subject turn see-through; raise it a little if a green fringe stays.
6. **Usage.** `get_usage` before and after a batch; report memes made, file paths and
   downloads left. 429 means the rate limit or the month's quota is reached.

## REST fallback

Base `https://api.greenscreenmemes.app`, header `Authorization: Bearer $GSM_API_KEY`,
no CORS (call from a shell or server).

```sh
curl -fsS -G -H "Authorization: Bearer $GSM_API_KEY" --data-urlencode "q=side eye" \
  --data-urlencode "limit=5" https://api.greenscreenmemes.app/v1/memes
```

`GET /v1/memes?q=&tag=&color=&limit=&cursor=`, `GET /v1/memes/{id}` (URL-encode the id),
`GET /v1/trending`, `GET /v1/collections[/{id}]`, `GET /v1/tags`, `GET /v1/usage`,
`GET /v1/removed?since=`. Lists return `{ data, total, nextCursor }`. OpenAPI:
https://api.greenscreenmemes.app/v1/openapi.json

## Rules

- The clips are internet memes. Green Screen Memes makes and curates the green screen
  versions, but the original footage isn't licensed to the user, and how they use it is
  their responsibility. Never call the clips "royalty-free" or "licensed".
- No clips of identifiable people in paid ads, sponsored posts or endorsements. Animals,
  objects and cartoons are fine there.
- Sandbox keys are for building and testing. Don't resell the library, and don't use
  clips listed by `GET /v1/removed`.
- The brand is "Green Screen Memes". Terms: https://api.greenscreenmemes.app/terms

## Working on this repo

Examples live in `examples/` (Node and Python with no dependencies, shell + ffmpeg,
Remotion). The Claude Code marketplace is `.claude-plugin/marketplace.json`, and the
plugin is `plugins/green-screen-memes/` (`.mcp.json`, `skills/make-memes/`). Keep
`AGENTS.md`, the skill and `README.md` consistent when the API changes, and run
`claude plugin validate .` after editing the plugin. Never commit keys, `.env`, or
downloaded clips.
