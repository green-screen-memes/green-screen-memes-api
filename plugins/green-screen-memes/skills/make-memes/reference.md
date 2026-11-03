# Green Screen Memes: recipes and reference

Load this when you need a hand-written ffmpeg command, the REST API, or a fix for a
bad composite. The bundled `scripts/meme.sh` covers the common cases.

## Key colors

| `chromaKeyColor` | ffmpeg `chromakey` color |
|---|---|
| `green` | `0x00ff00` |
| `blue` | `0x0000ff` |
| `red` | `0xff0000` |
| `none` | no key: drop the `chromakey` filter and use the clip as-is |

`chromakey=COLOR:0.3:0.08` is similarity and blend. Raise `0.3` (0.35, 0.4) if a colored
fringe or patches of background stay; lower it if parts of the subject turn transparent.

## Over a photo

Vertical 1080x1920, clip across the bottom, keeps the clip's sound (`1:a?` doesn't fail
on a silent clip). This is the recipe `get_green_screen` returns.

```sh
ffmpeg -loop 1 -i background.jpg -i greenscreen.mp4 -filter_complex \
 "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[bg];\
  [1:v]chromakey=0x00ff00:0.3:0.08,scale=1080:-2[fg];\
  [bg][fg]overlay=(W-w)/2:H-h:shortest=1,format=yuv420p[v]" \
 -map "[v]" -map "1:a?" -c:v libx264 -crf 20 -c:a aac meme.mp4
```

## Over a video, mixing both soundtracks

`-stream_loop -1` loops a background that's shorter than the clip. The background's
sound sits under the clip's at 35%. Both inputs need an audio stream for `amix`
(check with `ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 FILE`);
otherwise use `-map "1:a?"` as above. `normalize=0` needs FFmpeg 5 or later.

```sh
ffmpeg -stream_loop -1 -i background.mp4 -i greenscreen.mp4 -filter_complex \
 "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[bg];\
  [1:v]chromakey=0x00ff00:0.3:0.08,scale=1080:-2[fg];\
  [bg][fg]overlay=(W-w)/2:H-h:shortest=1,format=yuv420p[v];\
  [0:a]volume=0.35[bga];[1:a][bga]amix=inputs=2:duration=first:normalize=0[a]" \
 -map "[v]" -map "[a]" -c:v libx264 -crf 20 -c:a aac meme.mp4
```

## Over a plain color

```sh
ffmpeg -f lavfi -i "color=c=white:s=1080x1920:r=30" -i greenscreen.mp4 -filter_complex \
 "[1:v]chromakey=0x00ff00:0.3:0.08,scale=1080:-2[fg];\
  [0:v][fg]overlay=(W-w)/2:(H-h)/2:shortest=1,format=yuv420p[v]" \
 -map "[v]" -map "1:a?" -c:v libx264 -crf 20 -c:a aac meme.mp4
```

## Captions

`drawtext` doesn't wrap, so use one `drawtext` per line, each in a box, stepping `y`
down by about `fontsize + 2*boxborderw + 8`. Append them after `format=yuv420p`:

```
,drawtext=text='When the oat milk':fontcolor=white:fontsize=64:box=1:boxcolor=black:boxborderw=18:x=(w-text_w)/2:y=200\
,drawtext=text='is late again':fontcolor=white:fontsize=64:box=1:boxcolor=black:boxborderw=18:x=(w-text_w)/2:y=308
```

- Escaping: in `text='...'`, a `'`, `:` or `\` breaks the filter, and `%` starts an
  expansion. Safer: write each line to a file and use `textfile='line1.txt'` with
  `expansion=none`, which is what `meme.sh` does.
- Some builds need `fontfile=/path/to/font.ttf`. macOS: `/System/Library/Fonts/Supplemental/Arial Bold.ttf`;
  Debian/Ubuntu: `/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf` (`fonts-dejavu-core`).
- At `fontsize=64` a line of about 24 characters fits 1080 px. Use 72 to 80 for 1 to 2
  short lines, 56 for 3 to 4 lines.
- Keep captions in the top third when the clip sits at the bottom (`y=200` and down),
  clear of the platform's UI at the very top and the subject's face.
- No `drawtext` filter (`ffmpeg -filters | grep drawtext` is empty): install an ffmpeg
  built with libfreetype (Homebrew `ffmpeg`, a static build from https://ffmpeg.org/download.html,
  or Debian/Ubuntu `apt install ffmpeg`).

## Placement

- `overlay=(W-w)/2:H-h` is bottom center; `(W-w)/2:(H-h)/2` is center; `(W-w)/2:0` is top.
- `scale=1080:-2` sets the clip width; `scale=720:-2` makes it smaller, for a
  picture-in-picture look over a busy background.
- Clips are usually landscape, so at full width they fill about a third of the
  vertical frame. That's the classic look: background up top, captions above, reaction below.

## Frame check

```sh
ffmpeg -y -v error -ss 1.5 -i meme.mp4 -frames:v 1 meme.png        # one frame
ffmpeg -y -v error -i meme.mp4 -vf "fps=1,scale=270:-2,tile=4x1" -frames:v 1 sheet.png  # 4 frames side by side
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height -of csv=p=0 meme.mp4
```

## Batch loop

With the plan in a tab-separated file (`clip  color  background  output  line1|line2`):

```sh
while IFS=$'\t' read -r clip color bg out lines; do
  IFS='|' read -r -a caption <<<"$lines"
  bash "$MEME_SH" "$bg" "$clip" "$color" "$out" "${caption[@]}"
done < plan.tsv
```

Set `MEME_SH` to the path of `scripts/meme.sh`. Download each clip once and reuse it.

## REST fallback

Same key, same limits; base URL `https://api.greenscreenmemes.app`, header
`Authorization: Bearer $GSM_API_KEY`. The API sends no CORS headers, so call it from a
shell or server, not a browser.

```sh
H="Authorization: Bearer $GSM_API_KEY"
curl -fsS -G -H "$H" --data-urlencode "q=side eye" --data-urlencode "limit=5" https://api.greenscreenmemes.app/v1/memes
curl -fsS -H "$H" "https://api.greenscreenmemes.app/v1/memes/$(jq -rn --arg id "$ID" '$id|@uri')"
curl -fsS -H "$H" "https://api.greenscreenmemes.app/v1/trending?limit=10"
curl -fsS -H "$H" https://api.greenscreenmemes.app/v1/tags
curl -fsS -H "$H" https://api.greenscreenmemes.app/v1/usage
```

| Endpoint | |
|---|---|
| `GET /v1/memes?q=&tag=&color=&updatedSince=&limit=&cursor=` | Search or list |
| `GET /v1/memes/{id}` | One clip (URL-encode the id) |
| `GET /v1/trending` | Trending in the Green Screen Memes app, with `rank` |
| `GET /v1/collections`, `GET /v1/collections/{id}` | Curated collections |
| `GET /v1/tags` | Most used tags |
| `GET /v1/usage` | Plan and this month's usage |
| `GET /v1/removed?since=` | Clips taken down; don't use them |

Lists return `{ data, total, nextCursor }`; errors return `{ error: { code, message } }`.
Each clip has `id`, `name`, `description`, `tags`, `chromaKeyColor`, `durationSeconds`,
`thumbnailUrl` and `videoUrl`.

## Errors

- **401**: missing or wrong key. `GSM_API_KEY` must be set before Claude Code starts.
- **429**: rate limit (120 requests a minute on Sandbox and Starter) or the month's
  calls or downloads are used up. `get_usage` says which.
- **Download fails a few hours later**: the signed link expired; call `get_green_screen` again for a fresh one.

## More

- Docs: https://api.greenscreenmemes.app/docs · for LLMs: https://api.greenscreenmemes.app/llms-full.txt
- FFmpeg guide: https://api.greenscreenmemes.app/guides/ffmpeg-green-screen-meme
- Remotion guide: https://api.greenscreenmemes.app/guides/remotion-green-screen-meme
- Examples (Node, Python, Remotion): https://github.com/green-screen-memes/green-screen-memes-api
- Make memes in the browser without code: https://studio.greenscreenmemes.app
