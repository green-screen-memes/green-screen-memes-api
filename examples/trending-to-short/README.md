# Trending to short

[`trending-to-short.mjs`](trending-to-short.mjs) takes today's #1 from
`GET /v1/trending` (what people are using most in the Green Screen Memes app right
now) and makes a vertical 1080x1920 short over your background, with an optional
caption.

```sh
export GSM_API_KEY=gsm_live_...
node trending-to-short.mjs background.jpg                                  # -> short.mp4
node trending-to-short.mjs background.mp4 today.mp4 --caption "POV: it's Friday"
node trending-to-short.mjs background.jpg today.mp4 --caption "line one\nline two"
```

Node 18+, `ffmpeg` and `ffprobe`. No npm packages.

- `\n` in the caption starts a new line; `drawtext` doesn't wrap on its own, so
  keep each line under about 26 characters.
- If `drawtext` complains about fonts, set `FONT_FILE=/path/to/font.ttf`.
- The trending list changes through the day. To pick from more than the top one,
  ask for `?limit=10` and choose by `name`, `tags` or `durationSeconds`.

Run it on a schedule (cron, GitHub Actions) for a daily short. Before you post,
check the [terms](https://api.greenscreenmemes.app/terms): trending clips often show
real people, and those can't go in paid ads or sponsored posts.
