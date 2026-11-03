#!/usr/bin/env python3
"""Search the Green Screen Memes API, download the first match and key it over
your own photo or video with ffmpeg. Output: a vertical 1080x1920 MP4 with the
clip at the bottom and its sound.

    GSM_API_KEY=gsm_live_... python3 meme.py "shocked cat" background.jpg [meme.mp4]

Python 3.9+ standard library only, plus ffmpeg (with ffprobe) on your PATH.
"""

import json
import os
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

API = "https://api.greenscreenmemes.app"
KEY_COLORS = {"green": "0x00ff00", "blue": "0x0000ff", "red": "0xff0000"}
VIDEO_EXT = re.compile(r"\.(mp4|mov|m4v|webm|mkv)$", re.IGNORECASE)
USER_AGENT = "greenscreenmemes-examples/1.0 (python)"


def fail(message):
    print(message, file=sys.stderr)
    sys.exit(1)


def api(path, key):
    req = urllib.request.Request(API + path, headers={"Authorization": f"Bearer {key}", "User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            return json.load(res)
    except urllib.error.HTTPError as err:
        try:
            error = json.load(err).get("error", {})
        except ValueError:
            error = {}
        code = f" ({error['code']})" if error.get("code") else ""
        fail(f"API {err.code}: {error.get('message', err.reason)}{code}")
    except urllib.error.URLError as err:
        if "CERTIFICATE_VERIFY_FAILED" in str(err.reason):
            fail("Python can't verify HTTPS certificates. On macOS with the python.org installer, run "
                 "'Install Certificates.command' from your Python folder, or set SSL_CERT_FILE=/etc/ssl/cert.pem.")
        fail(f"Couldn't reach the API: {err.reason}")


def download(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=120) as res, open(path, "wb") as f:
        shutil.copyfileobj(res, f)


def has_audio(path):
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", path],
        capture_output=True, text=True,
    )
    return r.returncode == 0 and r.stdout.strip() != ""


def ffmpeg_args(background, clip_file, out, key_color, bg_is_video):
    fg = f"[1:v]chromakey={key_color}:0.2:0.05,scale=1080:-2[fg]" if key_color else "[1:v]scale=1080:-2[fg]"
    graph = (
        "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[bg];"
        f"{fg};[bg][fg]overlay=(W-w)/2:H-h:shortest=1,format=yuv420p[v]"
    )
    audio = ["-map", "1:a?"]
    # Over a video that has sound: keep it quietly under the clip's own audio.
    if bg_is_video and has_audio(background) and has_audio(clip_file):
        graph += ";[0:a]volume=0.35[bga];[1:a][bga]amix=inputs=2:duration=first:normalize=0[a]"
        audio = ["-map", "[a]"]
    source = ["-stream_loop", "-1", "-i", background] if bg_is_video else ["-loop", "1", "-i", background]
    return ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *source, "-i", clip_file,
            "-filter_complex", graph, "-map", "[v]", *audio, "-c:v", "libx264", "-crf", "20", "-c:a", "aac", out]


def main():
    if len(sys.argv) < 3:
        fail('Usage: python3 meme.py "<search words>" <background.jpg|background.mp4> [out.mp4]')
    query, background = sys.argv[1], sys.argv[2]
    out = sys.argv[3] if len(sys.argv) > 3 else "meme.mp4"
    key = os.environ.get("GSM_API_KEY")
    if not key:
        fail("Set GSM_API_KEY to your key (free Sandbox key: https://api.greenscreenmemes.app/dashboard).")
    if not shutil.which("ffmpeg"):
        fail("ffmpeg isn't on your PATH. Install it from https://ffmpeg.org/download.html")

    # 1. Search. Feelings and actions ("shocked", "slow clap") work better than meme names.
    found = api(f"/v1/memes?q={urllib.parse.quote(query)}&limit=5", key)
    if not found["data"]:
        fail(f'Nothing matched "{query}". Try a feeling or action instead, like "shocked" or "happy dance".')
    clip = found["data"][0]
    print(f'Picked "{clip["name"]}" ({clip["id"]}), {clip["chromaKeyColor"]} background, {clip.get("durationSeconds") or "?"} s')
    if not clip.get("videoUrl"):
        fail("This key has no media access, so there is no video link.")

    # 2. Download. The link is signed for your key and expires after about 6 hours,
    #    so keep the file, not the link.
    clip_file = "greenscreen.mp4"
    download(clip["videoUrl"], clip_file)
    print(f"Downloaded {clip_file}")

    # 3. Composite with the same recipe get_green_screen returns over MCP.
    args = ffmpeg_args(background, clip_file, out, KEY_COLORS.get(clip["chromaKeyColor"]), bool(VIDEO_EXT.search(background)))
    if subprocess.run(args).returncode != 0:
        fail("ffmpeg failed")
    print(f"Done: {out}")


if __name__ == "__main__":
    main()
