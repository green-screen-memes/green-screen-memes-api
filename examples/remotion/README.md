# Remotion

A minimal [Remotion](https://www.remotion.dev) project: a 1080x1920 composition with a
background image, a keyed green screen clip at the bottom (with its sound) and an
optional caption. The video lasts as long as the clip.

```sh
npm install
export GSM_API_KEY=gsm_live_...
node fetch-clip.mjs "dancing" path/to/background.jpg   # search, download, pre-key into public/
npm run studio                                         # preview
npm run render                                         # -> out/meme.mp4
```

Needs Node 18+ and ffmpeg built with libvpx (most builds are). Versions are pinned
in `package.json` (Remotion 4.0.538, React 19.2).

## How the keying works

`fetch-clip.mjs` keys the clip **once, with ffmpeg**, into a WebM with an alpha
channel (VP9, `yuva420p`), using the same `chromakey` settings as the API's ffmpeg
recipe. The composition then plays it with `<OffthreadVideo transparent>`:

```tsx
<Img src={staticFile('background.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
<AbsoluteFill style={{justifyContent: 'flex-end'}}>
  <OffthreadVideo src={staticFile('greenscreen.webm')} transparent style={{width: '100%'}} />
</AbsoluteFill>
```

Why pre-key instead of keying per frame in a `<canvas>`:

- **Same result everywhere.** Chrome plays VP9 alpha natively in the Studio, and
  `transparent` makes the renderer extract frames as PNG with alpha, so preview and
  render match.
- **Fast renders.** No per-pixel JavaScript on every frame.
- **Same key as the other examples.** One place to tune the similarity (`0.2`) if a
  fringe stays.

The trade-off is one ffmpeg step before rendering. If you'd rather key live in the
browser, recent Remotion versions (4.0.472+) also ship a `colorKey()` effect in
`@remotion/effects` for `<Video>` from `@remotion/media`; see Remotion's
[green screen guide](https://www.remotion.dev/docs/greenscreen).

## Props

| Prop | Default | |
|---|---|---|
| `background` | `background.jpg` | Image in `public/` |
| `clip` | `greenscreen.webm` | The pre-keyed clip in `public/` |
| `caption` | `""` | Text at the top |

```sh
npx remotion render src/index.ts Meme out/meme.mp4 --props='{"background":"background.jpg","clip":"greenscreen.webm","caption":"me when the beat drops"}'
```

Signed media links expire after about 6 hours, which is why the clip is downloaded
into `public/` rather than streamed from its URL during a render.
