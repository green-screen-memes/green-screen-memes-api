# Node.js

[`meme.mjs`](meme.mjs) searches the API, picks the first result, downloads it and
keys it over your photo or video with ffmpeg. No npm packages: Node 18+ `fetch`
and `child_process`.

```sh
export GSM_API_KEY=gsm_live_...
node meme.mjs "shocked cat" background.jpg            # -> meme.mp4
node meme.mjs "slow clap" background.mp4 clap.mp4     # over a video
```

Needs `ffmpeg` and `ffprobe` on your PATH.

What it does:

1. `GET /v1/memes?q=...` with your key as `Authorization: Bearer ...`.
2. Downloads `videoUrl` to `greenscreen.mp4`. Media links are signed for your key
   and expire after about 6 hours, so keep the file, not the link.
3. Runs the same ffmpeg recipe `get_green_screen` returns over MCP: scale the
   background to 1080x1920, `chromakey` the clip's `chromaKeyColor`, overlay it at
   the bottom, keep the clip's sound. Over a video with sound, the background audio
   is mixed in at 35% under the clip.

Clips with `chromaKeyColor: "none"` are overlaid as they are. If a green fringe
stays, raise the `0.2` similarity in `chromakey=...:0.2:0.05`.

No test media handy? Make a background with ffmpeg:

```sh
ffmpeg -f lavfi -i "gradients=s=1080x1920:c0=orange:c1=purple" -frames:v 1 background.jpg
```
