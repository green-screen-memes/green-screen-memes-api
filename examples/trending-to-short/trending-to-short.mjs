#!/usr/bin/env node
// Today's #1 trending green screen, keyed over your background as a vertical
// 1080x1920 short, with an optional caption at the top.
//
//   GSM_API_KEY=gsm_live_... node trending-to-short.mjs background.jpg [short.mp4] [--caption "when the invoice arrives"]
//
// The background can be a photo or a video (a video loops under the clip and its
// sound is mixed in quietly). Node 18+ and ffmpeg (with ffprobe). No npm dependencies.

import { spawnSync } from 'node:child_process';
import { createWriteStream, writeFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const API = 'https://api.greenscreenmemes.app';
const KEY_COLORS = { green: '0x00ff00', blue: '0x0000ff', red: '0xff0000' };
const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv)$/i;

const argv = process.argv.slice(2);
let caption = '';
const at = argv.indexOf('--caption');
if (at !== -1) [, caption = ''] = argv.splice(at, 2);
const [background, out = 'short.mp4'] = argv;
const key = process.env.GSM_API_KEY;

if (!background) fail('Usage: node trending-to-short.mjs <background.jpg|background.mp4> [short.mp4] [--caption "text"]');
if (!key) fail('Set GSM_API_KEY to your key (free Sandbox key: https://api.greenscreenmemes.app/dashboard).');

// 1. What people are using most in the Green Screen Memes app right now.
const { data } = await api('/v1/trending?limit=1');
const top = data[0];
if (!top) fail('The trending list is empty right now; try again later.');
console.log(`#${top.rank} trending: "${top.name}" (${top.id}), ${top.chromaKeyColor} background`);
if (!top.videoUrl) fail('This key has no media access, so there is no video link.');

// 2. Download it. Signed link, expires after about 6 hours.
const clipFile = 'trending.mp4';
const res = await fetch(top.videoUrl);
if (!res.ok) fail(`Download failed: HTTP ${res.status}`);
await pipeline(Readable.fromWeb(res.body), createWriteStream(clipFile));

// 3. Key and composite.
const keyColor = KEY_COLORS[top.chromaKeyColor];
const bgIsVideo = VIDEO_EXT.test(background);
const fg = keyColor ? `[1:v]chromakey=${keyColor}:0.3:0.08,scale=1080:-2[fg]` : '[1:v]scale=1080:-2[fg]';
let video = '[bg][fg]overlay=(W-w)/2:H-h:shortest=1,format=yuv420p';
if (caption) {
  // drawtext doesn't wrap: split lines with "\n" and each gets its own drawtext, 90 px apart.
  // textfile= avoids escaping quotes and colons in the caption.
  const font = process.env.FONT_FILE ? `:fontfile='${process.env.FONT_FILE}'` : '';
  caption.split(/\n|\\n/).forEach((line, i) => {
    writeFileSync(`caption-${i}.txt`, line);
    video += `,drawtext=textfile=caption-${i}.txt${font}:fontcolor=white:fontsize=64:box=1:boxcolor=black@0.85:boxborderw=18:x=(w-text_w)/2:y=${200 + i * 90}`;
  });
}
let graph = `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[bg];${fg};${video}[v]`;
let audio = ['-map', '1:a?'];
if (bgIsVideo && hasAudio(background) && hasAudio(clipFile)) {
  graph += ';[0:a]volume=0.35[bga];[1:a][bga]amix=inputs=2:duration=first:normalize=0[a]';
  audio = ['-map', '[a]'];
}
const input = bgIsVideo ? ['-stream_loop', '-1', '-i', background] : ['-loop', '1', '-i', background];
const run = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...input, '-i', clipFile,
  '-filter_complex', graph, '-map', '[v]', ...audio, '-c:v', 'libx264', '-crf', '20', '-c:a', 'aac', '-movflags', '+faststart', out], { stdio: 'inherit' });
if (run.error) fail(`Couldn't run ffmpeg: ${run.error.message}`);
if (run.status !== 0) fail(`ffmpeg exited with ${run.status}${caption ? ' (if drawtext complained about fonts, set FONT_FILE=/path/to/font.ttf)' : ''}`);
console.log(`Done: ${out}`);

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
