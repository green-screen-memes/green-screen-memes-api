# FFmpeg

Shell scripts around the recipes the API hands out (`get_green_screen` over MCP,
and the docs at https://api.greenscreenmemes.app/llms-full.txt).

| Script | What it does |
|---|---|
| [`fetch-clip.sh`](fetch-clip.sh) | Searches, downloads the first match to `greenscreen.mp4` and prints its key color (needs `curl` and `jq`) |
| [`key-over-image.sh`](key-over-image.sh) | Keys a clip over a photo: 1080x1920, clip at the bottom, the clip's sound |
| [`key-over-video.sh`](key-over-video.sh) | Keys a clip over a video, looping the background and mixing its sound under the clip's |

```sh
export GSM_API_KEY=gsm_live_...
color=$(./fetch-clip.sh "side eye")
./key-over-image.sh background.jpg greenscreen.mp4 "$color" meme.mp4
./key-over-video.sh background.mp4 greenscreen.mp4 "$color" meme.mp4
```

`BG_VOLUME=0.2 ./key-over-video.sh ...` sets the background's volume (default 0.35).

## The recipe

Over a photo:

```sh
ffmpeg -loop 1 -i background.jpg -i greenscreen.mp4 -filter_complex \
 "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[bg];\
  [1:v]chromakey=0x00ff00:0.2:0.05,scale=1080:-2[fg];\
  [bg][fg]overlay=(W-w)/2:H-h:shortest=1,format=yuv420p[v]" \
 -map "[v]" -map "1:a?" -c:v libx264 -crf 20 -c:a aac meme.mp4
```

Over a video, adding `-stream_loop -1` so a short background loops, and mixing both
soundtracks:

```sh
ffmpeg -stream_loop -1 -i background.mp4 -i greenscreen.mp4 -filter_complex \
 "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[bg];\
  [1:v]chromakey=0x00ff00:0.2:0.05,scale=1080:-2[fg];\
  [bg][fg]overlay=(W-w)/2:H-h:shortest=1,format=yuv420p[v];\
  [0:a]volume=0.35[bga];[1:a][bga]amix=inputs=2:duration=first:normalize=0[a]" \
 -map "[v]" -map "[a]" -c:v libx264 -crf 20 -c:a aac meme.mp4
```

- **Key colors:** green `0x00ff00`, blue `0x0000ff`, red `0xff0000`. With `none`,
  drop the `chromakey` and use the clip as-is.
- **Fringe:** raise `0.2` a little if a colored edge stays; lower it if the subject turns see-through.
- **Position and size:** `overlay=(W-w)/2:H-h` is x:y; `scale=1080:-2` is the clip's width.
- **Sound:** `-map 1:a?` keeps the clip's audio and doesn't fail on a silent clip.
  The mix needs both inputs to have audio; the script checks with `ffprobe` first.
- **Caption:** add `,drawtext=text='YOUR TEXT':fontcolor=white:fontsize=64:box=1:boxcolor=black:boxborderw=18:x=(w-text_w)/2:y=200`
  after `format=yuv420p`. `drawtext` doesn't wrap, so use one per line (y=200, y=300, ...).
  Some builds need `fontfile=/path/to/font.ttf`.
- `amix ... normalize=0` needs FFmpeg 5 or later.
