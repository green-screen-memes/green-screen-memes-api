# Green Screen Memes API examples

Copy-paste examples for the [Green Screen Memes API](https://api.greenscreenmemes.app):
about 2,100 green screen meme clips (trending reaction memes on solid green, blue or
red backgrounds, most with their original sound), searchable by reaction, action or
subject, over **REST** or **MCP**. New clips are added every day.

Each example finds a clip, downloads it and keys it over your own photo or video,
ending with a 1080x1920 MP4 for Shorts, Reels or TikTok.

## Use as a Claude Code plugin

This repo is also a Claude Code plugin marketplace. The plugin sets up the MCP server
and adds a `make-memes` skill that plans captions, finds clips and composites them with
ffmpeg, one meme or a whole batch. Set `GSM_API_KEY` ([free key](https://api.greenscreenmemes.app/dashboard))
in the shell you start Claude Code from, then run:

```
/plugin marketplace add green-screen-memes/green-screen-memes-api
/plugin install green-screen-memes@green-screen-memes
```

Then ask something like "I need a lot of memes for my business". Codex and other
agents: see [AGENTS.md](AGENTS.md) for the same workflow and MCP setup.

| Example | What it shows | Run it |
|---|---|---|
| [`claude-code/`](examples/claude-code) | Connect the MCP server, then make a meme from one prompt | `claude mcp add --transport http green-screen-memes https://api.greenscreenmemes.app/mcp --header "Authorization: Bearer $GSM_API_KEY"` |
| [`node/`](examples/node) | Search, download and composite from Node 18+, no dependencies | `node examples/node/meme.mjs "shocked cat" background.jpg` |
| [`python/`](examples/python) | The same with the Python standard library | `python3 examples/python/meme.py "shocked cat" background.jpg` |
| [`ffmpeg/`](examples/ffmpeg) | `curl` + `ffmpeg` scripts: key over a photo, or over a video with mixed audio | `examples/ffmpeg/key-over-image.sh background.jpg greenscreen.mp4 green` |
| [`remotion/`](examples/remotion) | A Remotion composition with a pre-keyed transparent clip | `cd examples/remotion && npm install && npm run studio` |
| [`trending-to-short/`](examples/trending-to-short) | Today's #1 trending clip as a vertical short | `node examples/trending-to-short/trending-to-short.mjs background.jpg` |

Everything except the MCP setup needs [FFmpeg](https://ffmpeg.org/download.html)
(with `ffprobe`) on your PATH.

## 1. Get a free key

Sign in at https://api.greenscreenmemes.app/dashboard (Google or email link) and
create a free **Sandbox** key: 50 video downloads and 30,000 calls a month, for
building and testing. Then:

```sh
cp .env.example .env          # put your key in GSM_API_KEY
set -a; source .env; set +a   # or: export GSM_API_KEY=gsm_live_...
```

Keep the key on your machine or server. The API doesn't send CORS headers, so call
it from a backend, not from a browser.

## 2. Use it from an AI agent (MCP)

```sh
claude mcp add --transport http green-screen-memes https://api.greenscreenmemes.app/mcp \
  --header "Authorization: Bearer $GSM_API_KEY"
```

Cursor and other MCP clients: url `https://api.greenscreenmemes.app/mcp` with the
same `Authorization` header. Ready-made configs are in
[`examples/claude-code`](examples/claude-code). The server is also in the official MCP
Registry as `app.greenscreenmemes.api/green-screen-memes`.

Then ask, for example:

> Make a meme for my coffee shop. Find a green screen of someone or something
> reacting with pure relief or joy, key it over ./shop.jpg as a vertical video and
> caption it "Monday, fixed."

Tools: `search_green_screens`, `get_green_screen` (video link and a ready ffmpeg
command), `get_trending`, `list_collections`, `get_collection`, `list_tags`,
`get_usage`.

## 3. Or call REST

```sh
curl -H "Authorization: Bearer $GSM_API_KEY" \
  "https://api.greenscreenmemes.app/v1/memes?q=side%20eye&limit=5"
```

| Endpoint | |
|---|---|
| `GET /v1/memes?q=&tag=&color=&updatedSince=&limit=&cursor=` | Search or list green screens |
| `GET /v1/memes/{id}` | One green screen (URL-encode the id) |
| `GET /v1/trending` | What's trending in the Green Screen Memes app right now, with `rank` |
| `GET /v1/collections`, `GET /v1/collections/{id}` | Curated collections |
| `GET /v1/tags` | Most used tags |
| `GET /v1/usage` | Your plan and this month's usage |
| `GET /v1/removed?since=` | Clips taken down at a rights holder's request |

Lists return `{ data, total, nextCursor }`; errors return `{ error: { code, message } }`.
Each clip has `id`, `name`, `description`, `tags`, `chromaKeyColor` (`green`, `blue`,
`red` or `none`), `durationSeconds`, `thumbnailUrl` and `videoUrl`. Media links are
signed for your key and expire after about 6 hours, so download the file and don't
store the link.

Full reference: https://api.greenscreenmemes.app/docs ·
OpenAPI: https://api.greenscreenmemes.app/v1/openapi.json ·
For LLMs: https://api.greenscreenmemes.app/llms.txt

## 4. Key it with FFmpeg

Over a photo (vertical 1080x1920, clip at the bottom, keeps the clip's sound):

```sh
ffmpeg -loop 1 -i background.jpg -i greenscreen.mp4 -filter_complex \
 "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[bg];\
  [1:v]chromakey=0x00ff00:0.3:0.08,scale=1080:-2[fg];\
  [bg][fg]overlay=(W-w)/2:H-h:shortest=1,format=yuv420p[v]" \
 -map "[v]" -map "1:a?" -c:v libx264 -crf 20 -c:a aac meme.mp4
```

Key colors: green `0x00ff00`, blue `0x0000ff`, red `0xff0000`. With `none`, the clip
is used as-is. If a green fringe stays, raise `0.3` a little. Over a video with mixed
audio: see [`examples/ffmpeg`](examples/ffmpeg).

## Video meme API

If you're building a video tool, a short-form content pipeline or a meme app and need
actual video memes rather than image templates, this is what the API is for: short
MP4 clips on a solid key color, with sound, plus the metadata to search them and the
ffmpeg command to composite them. It doesn't generate memes or remove backgrounds
from your footage; it gives you a curated library of ready green screens.

## Reaction clip API

Clips are tagged by what happens in them, so search works best with a feeling or an
action: `shocked`, `slow clap`, `side eye`, `crying`, `happy dance`, `waiting`.
`GET /v1/tags` shows what the library covers, and `GET /v1/trending` returns what
people are using most in the Green Screen Memes app right now. To keep a local copy
in sync, poll `GET /v1/memes?updatedSince=<ISO date>` and drop anything listed by
`GET /v1/removed`.

## MCP server for memes

The MCP server at `https://api.greenscreenmemes.app/mcp` lets Claude Code, Cursor or
any agent with a shell find a clip, get its download link and run the composite
itself. `get_green_screen` returns the ffmpeg command for that clip's key color, so
the agent doesn't have to work out the filter graph. Same key, same limits as REST;
each tool call counts as one call.

## What you can use the clips for

These are internet memes. Green Screen Memes makes the green screen versions, tags
and curates them, and runs the search; **the original footage isn't ours, and the
API doesn't license it to you.** How you use a clip is your responsibility.

- On paid plans, clips can go in apps and in videos you publish for yourself or
  clients. Sandbox keys are for building and testing.
- Clips of identifiable people can't be used in paid ads, sponsored posts or
  endorsements. Animals, objects and cartoons are fine there.
- Don't use clips listed by `GET /v1/removed` in new work, and drop them from
  anything you keep.

Full terms: https://api.greenscreenmemes.app/terms

## License

The example **code** in this repo is [MIT](LICENSE). That covers the code only: no
clips are included here, and the clips, thumbnails and catalog data you get from the
API are covered by the [API terms](https://api.greenscreenmemes.app/terms), not by MIT.

Questions: info@greenscreenmemes.app · Green Screen Memes is made by Hedko Group LLC.
