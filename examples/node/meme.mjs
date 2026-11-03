#!/usr/bin/env node
// Search the Green Screen Memes API, download the first match and key it over
// your own photo or video with ffmpeg. Output: a vertical 1080x1920 MP4 with
// the clip at the bottom and its sound.
//
//   GSM_API_KEY=gsm_live_... node meme.mjs "shocked cat" background.jpg [meme.mp4]
//
// Node 18+ and ffmpeg (with ffprobe) on your PATH. No npm dependencies.

import { spawnSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const API = 'https://api.greenscreenmemes.app';
const KEY_COLORS = { green: '0x00ff00', blue: '0x0000ff', red: '0xff0000' };
const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv)$/i;

const [query, background, out = 'meme.mp4'] = process.argv.slice(2);
const key = process.env.GSM_API_KEY;

if (!query || !background) fail('Usage: node meme.mjs "<search words>" <background.jpg|background.mp4> [out.mp4]');
if (!key) fail('Set GSM_API_KEY to your key (free Sandbox key: https://api.greenscreenmemes.app/dashboard).');

// 1. Search. Feelings and actions ("shocked", "slow clap") work better than meme names.
const { data } = await api(`/v1/memes?q=${encodeURIComponent(query)}&limit=5`);
if (!data.length) fail(`Nothing matched "${query}". Try a feeling or action instead, like "shocked" or "happy dance".`);
const clip = data[0];
console.log(`Picked "${clip.name}" (${clip.id}), ${clip.chromaKeyColor} background, ${clip.durationSeconds ?? '?'} s`);
if (!clip.videoUrl) fail('This key has no media access, so there is no video link.');

// 2. Download. The link is signed for your key and expires after about 6 hours,
//    so keep the file, not the link.
const clipFile = 'greenscreen.mp4';
const res = await fetch(clip.videoUrl);
if (!res.ok) fail(`Download failed: HTTP ${res.status}`);
await pipeline(Readable.fromWeb(res.body), createWriteStream(clipFile));
console.log(`Downloaded ${clipFile}`);

// 3. Composite with the same recipe get_green_screen returns over MCP.
const args = ffmpegArgs({
  background,
  clipFile,
  out,
  keyColor: KEY_COLORS[clip.chromaKeyColor] ?? null,
  bgIsVideo: VIDEO_EXT.test(background),
});
const run = spawnSync('ffmpeg', args, { stdio: 'inherit' });
if (run.error) fail(`Couldn't run ffmpeg: ${run.error.message}. Install it from https://ffmpeg.org/download.html`);
if (run.status !== 0) fail(`ffmpeg exited with ${run.status}`);
console.log(`Done: ${out}`);

function ffmpegArgs({ background, clipFile, out, keyColor, bgIsVideo }) {
  const fg = keyColor ? `[1:v]chromakey=${keyColor}:0.3:0.08,scale=1080:-2[fg]` : '[1:v]scale=1080:-2[fg]';
  let graph = `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[bg];${fg};[bg][fg]overlay=(W-w)/2:H-h:shortest=1,format=yuv420p[v]`;
  let audio = ['-map', '1:a?'];
  // Over a video that has sound: keep it quietly under the clip's own audio.
  if (bgIsVideo && hasAudio(background) && hasAudio(clipFile)) {
    graph += ';[0:a]volume=0.35[bga];[1:a][bga]amix=inputs=2:duration=first:normalize=0[a]';
    audio = ['-map', '[a]'];
  }
  const input = bgIsVideo ? ['-stream_loop', '-1', '-i', background] : ['-loop', '1', '-i', background];
  return ['-y', '-hide_banner', '-loglevel', 'error', ...input, '-i', clipFile,
    '-filter_complex', graph, '-map', '[v]', ...audio, '-c:v', 'libx264', '-crf', '20', '-c:a', 'aac', out];
}

function hasAudio(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return r.status === 0 && r.stdout.trim() !== '';
}

async function api(path) {
  const r = await fetch(API + path, { headers: { authorization: `Bearer ${key}` } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) fail(`API ${r.status}: ${body.error?.message ?? r.statusText}${body.error?.code ? ` (${body.error.code})` : ''}`);
  return body;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
