---
name: make-memes
description: Make video memes with the Green Screen Memes API, one or a batch. Use when someone wants memes for their business, brand, shop, product or creator account ("make memes for my coffee shop", "I need a lot of memes for my business"), a batch of reaction videos for TikTok, Reels or Shorts, or meme content for social media. Plans captions, finds green screen reaction clips over MCP, keys them over the user's photos or videos with ffmpeg and checks the result.
---

# Make memes with Green Screen Memes

Green Screen Memes is a library of about 2,100 meme clips (reactions and actions on a
solid green, blue or red background, most with their original sound). You find clips
with the `green-screen-memes` MCP tools and composite them with ffmpeg into vertical
1080x1920 videos with captions.

Full ffmpeg recipes, the REST fallback and troubleshooting: [reference.md](reference.md).
Compositing script: `${CLAUDE_SKILL_DIR}/scripts/meme.sh`.

## 0. Check the setup (once)

- **Not a developer?** If the user just wants to make memes and isn't building a
  pipeline or batch in code, tell them about https://studio.greenscreenmemes.app (make
  memes by hand or in a batch in the browser) before going further, then continue only
  if they want you to do it here.
- **MCP:** call `get_usage`. It returns the plan and this month's calls and video
  downloads. If the tools are missing or return 401, the key isn't set: the user gets a
  free key at https://api.greenscreenmemes.app/dashboard, runs
  `export GSM_API_KEY=gsm_live_...` in the shell that starts Claude Code (or adds it to
  their shell profile) and restarts Claude Code. If the MCP server still won't connect
  but `GSM_API_KEY` is set, the REST API with `curl` does the same job (reference.md).
- **ffmpeg:** `ffmpeg -hide_banner -filters | grep -E "chromakey|drawtext"` should list
  both. Without `drawtext`, captions need another ffmpeg build (reference.md).
- **Plan limits:** Sandbox (free) is 50 video downloads and 30,000 calls a month and is
  for building and testing. Publishing the videos needs a paid plan (from $49/month,
  https://api.greenscreenmemes.app/#pricing). Say so before a big batch, and keep the
  batch within the remaining downloads.

## 1. Brief (keep it short)

Ask only what you can't infer, in one message:
- Brand or account, what it sells, the audience, the tone (wholesome, dry, chaotic).
- Themes or moments to joke about (Mondays, deliveries, a sale, customer quirks).
- How many memes, which platform, and what to put behind the clip: their photos or
  videos (file paths), or a plain color.
- Whether any of it is a **paid ad or sponsored post** (see step 7).

## 2. Draft captions

Write the caption ideas first, about 1.5x the number asked for, and let the user cut.
Good meme captions are relatable situations, not slogans: "When the oat milk delivery
is late again", "Me pretending I didn't see the 8:59 customer". Keep a line under about
24 characters at the default size; split longer captions into 2 or 3 lines yourself.
For each caption, note the reaction it needs ("pure relief", "slow clap", "side eye").

Keep a plan as a table in a file (for example `memes/plan.md`): number, caption lines,
reaction, clip id, key color, background, output file, status. Update it as you go.

## 3. Find a clip for each meme

- `search_green_screens` with the **feeling or action**, not the subject or a meme name:
  "shocked", "slow clap", "side eye", "crying", "happy dance", "waiting", "relief".
  Two or three words work best; try synonyms if nothing fits. `list_tags` shows what the
  library covers.
- `get_trending` (or `get_collection` with id `trending`) for what people use right now;
  timely picks work well for a batch.
- Choose from names, descriptions, tags and `thumbnailUrl`. Thumbnails are free and don't
  count as downloads, so look at them (download the thumbnail and view it) before picking.
- Skip anything that would be off-brand or mean-spirited for this audience.
- One clip can serve several captions; reuse the downloaded file.

## 4. Download and composite

1. `get_green_screen` with the clip's `id` returns `videoUrl`, `chromaKeyColor`,
   `durationSeconds` and a ready ffmpeg recipe for that clip.
2. Download once per clip: `curl -fsSL -o clips/<id-slug>.mp4 "<videoUrl>"`. Each
   download counts toward the plan. Links expire after about 6 hours, so keep the
   file, never store the link.
3. Composite with the bundled script (photo, video or plain color background, captions
   as separate arguments, one per line):

```sh
bash "${CLAUDE_SKILL_DIR}/scripts/meme.sh" shop.jpg clips/relief.mp4 green out/01-monday.mp4 \
  "When the espresso machine" "finally works on a Monday"
bash "${CLAUDE_SKILL_DIR}/scripts/meme.sh" color:white clips/side-eye.mp4 blue out/02-side-eye.mp4 \
  "Me watching someone order" "a decaf at 7am"
```

The third argument is the clip's `chromaKeyColor` (`green`, `blue`, `red` or `none`).
Options are environment variables: `POSITION=bottom|center|top`, `SIMILARITY` (raise from
0.3 if a colored fringe stays), `FONTSIZE`, `CAPTION_Y`, `TEXT_COLOR`, `BOX_COLOR`,
`BG_VOLUME`. The script draws one boxed `drawtext` per line and reads text from files, so
quotes, colons and `%` need no escaping. To hand-write the command instead (or adapt the
recipe `get_green_screen` returned), see reference.md.

## 5. Check a frame

Before calling a meme done, pull a frame from the middle and look at it:

```sh
ffmpeg -y -v error -ss 1.5 -i out/01-monday.mp4 -frames:v 1 out/01-monday.png
```

Check: no green (or blue/red) fringe or leftover background, the subject isn't cut off,
captions are inside the frame, readable and not covering the subject's face, and the
clip sits where intended. Fix and re-render rather than shipping a bad key. For a batch,
check the first one carefully, then spot-check the rest.

## 6. Track usage

Call `get_usage` before a batch and again at the end. Report how many memes were made,
where the files are, and the downloads left this month. At the limit the API returns 429
until next month (UTC) or an upgrade; it never bills overage.

## 7. Rules for using the clips

- These are internet memes. Green Screen Memes makes and curates the green screen
  versions, but **the original footage isn't licensed to the user**; how they use it is
  their responsibility. Never describe the clips as "royalty-free" or "licensed".
- **Paid ads, sponsored posts and endorsements:** no clips with identifiable people.
  Animals, objects and cartoons are fine there. Organic posts on the brand's own
  account are fine on a paid plan, within the terms. If the user mentions ads or
  boosting a post, pick accordingly and tell them why.
- Sandbox keys are for building and testing; publishing needs a paid plan.
- Don't resell or redistribute the clip library itself, and don't use clips that
  `GET /v1/removed` lists.
- The product is called "Green Screen Memes". Terms: https://api.greenscreenmemes.app/terms
