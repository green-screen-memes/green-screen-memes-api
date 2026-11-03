#!/usr/bin/env node
// Search the Green Screen Memes API, download the first match and pre-key it with
// ffmpeg into public/greenscreen.webm (VP9 with an alpha channel), ready for the
// Meme composition. Optionally copies your background into public/.
//
//   GSM_API_KEY=gsm_live_... node fetch-clip.mjs "shocked cat" [path/to/background.jpg]
//
// Node 18+ and ffmpeg built with libvpx (most builds are). No extra dependencies.

import { spawnSync } from 'node:child_process';
import { copyFileSync, createWriteStream, mkdirSync, writeFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const API = 'https://api.greenscreenmemes.app';
const KEY_COLORS = { green: '0x00ff00', blue: '0x0000ff', red: '0xff0000' };

const [query, background] = process.argv.slice(2);
const key = process.env.GSM_API_KEY;
if (!query) fail('Usage: node fetch-clip.mjs "<search words>" [background.jpg]');
if (!key) fail('Set GSM_API_KEY to your key (free Sandbox key: https://api.greenscreenmemes.app/dashboard).');

mkdirSync('public', { recursive: true });
if (background) copyFileSync(background, 'public/background.jpg');

const r = await fetch(`${API}/v1/memes?q=${encodeURIComponent(query)}&limit=5`, { headers: { authorization: `Bearer ${key}` } });
const body = await r.json().catch(() => ({}));
if (!r.ok) fail(`API ${r.status}: ${body.error?.message ?? r.statusText}`);
const clip = body.data[0];
if (!clip) fail(`Nothing matched "${query}". Try a feeling or action, like "shocked" or "happy dance".`);
if (!clip.videoUrl) fail('This key has no media access, so there is no video link.');
console.log(`Picked "${clip.name}" (${clip.id}), ${clip.chromaKeyColor} background`);

// Download (signed link, expires after about 6 hours: keep the file, not the link).
const res = await fetch(clip.videoUrl);
if (!res.ok) fail(`Download failed: HTTP ${res.status}`);
await pipeline(Readable.fromWeb(res.body), createWriteStream('public/greenscreen.mp4'));

// Pre-key: the same chromakey settings as the API's ffmpeg recipe, written as VP9 with
// alpha (yuva420p). -auto-alt-ref 0 is required for libvpx to keep the alpha channel.
const keyColor = KEY_COLORS[clip.chromaKeyColor];
const filter = keyColor ? `chromakey=${keyColor}:0.2:0.05,format=yuva420p` : 'format=yuva420p';
const ff = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', 'public/greenscreen.mp4',
  '-vf', filter, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-auto-alt-ref', '0', '-b:v', '0', '-crf', '30', '-row-mt', '1',
  '-c:a', 'libopus', '-b:a', '128k', 'public/greenscreen.webm'], { stdio: 'inherit' });
if (ff.error) fail(`Couldn't run ffmpeg: ${ff.error.message}`);
if (ff.status !== 0) fail(`ffmpeg exited with ${ff.status}`);

writeFileSync('public/clip.json', JSON.stringify({ id: clip.id, name: clip.name, durationSeconds: clip.durationSeconds ?? probeDuration('public/greenscreen.mp4') }, null, 2));
console.log('Wrote public/greenscreen.webm and public/clip.json. Next: npm run studio');

function probeDuration(file) {
  const p = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return Number(p.stdout.trim()) || null;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
