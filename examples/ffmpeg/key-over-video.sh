#!/usr/bin/env bash
# Key a green screen clip over a video: vertical 1080x1920, clip at the bottom.
# The background loops if it's shorter than the clip, and its sound is mixed in
# quietly under the clip's own sound.
#
#   ./key-over-video.sh background.mp4 greenscreen.mp4 [green|blue|red|none] [meme.mp4]
#
# The third argument is the clip's chromaKeyColor from the API (default green).
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: $0 background.mp4 greenscreen.mp4 [green|blue|red|none] [out.mp4]" >&2
  exit 1
fi
bg=$1 clip=$2 color=${3:-green} out=${4:-meme.mp4}
bg_volume=${BG_VOLUME:-0.35}

case $color in
  green) key=0x00ff00 ;;
  blue)  key=0x0000ff ;;
  red)   key=0xff0000 ;;
  none)  key= ;;
  *) echo "Unknown key color: $color (use green, blue, red or none)" >&2; exit 1 ;;
esac

if [ -n "$key" ]; then fg="[1:v]chromakey=$key:0.3:0.08,scale=1080:-2[fg]"; else fg="[1:v]scale=1080:-2[fg]"; fi
graph="[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[bg];$fg;[bg][fg]overlay=(W-w)/2:H-h:shortest=1,format=yuv420p[v]"

has_audio() { [ -n "$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$1")" ]; }

# Mix only when both have sound; otherwise keep whatever the clip has.
if has_audio "$bg" && has_audio "$clip"; then
  graph="$graph;[0:a]volume=$bg_volume[bga];[1:a][bga]amix=inputs=2:duration=first:normalize=0[a]"
  audio=(-map "[a]")
else
  audio=(-map "1:a?")
fi

ffmpeg -y -hide_banner -loglevel error \
  -stream_loop -1 -i "$bg" -i "$clip" \
  -filter_complex "$graph" \
  -map "[v]" "${audio[@]}" -c:v libx264 -crf 20 -c:a aac "$out"

echo "Done: $out"
