#!/usr/bin/env bash
# Key a green screen clip over a photo: vertical 1080x1920, clip at the bottom,
# keeps the clip's sound. The same recipe get_green_screen returns over MCP.
#
#   ./key-over-image.sh background.jpg greenscreen.mp4 [green|blue|red|none] [meme.mp4]
#
# The third argument is the clip's chromaKeyColor from the API (default green).
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: $0 background.jpg greenscreen.mp4 [green|blue|red|none] [out.mp4]" >&2
  exit 1
fi
bg=$1 clip=$2 color=${3:-green} out=${4:-meme.mp4}

case $color in
  green) key=0x00ff00 ;;
  blue)  key=0x0000ff ;;
  red)   key=0xff0000 ;;
  none)  key= ;;
  *) echo "Unknown key color: $color (use green, blue, red or none)" >&2; exit 1 ;;
esac

# Raise 0.2 a little if a fringe stays; lower it if the subject turns see-through.
if [ -n "$key" ]; then fg="[1:v]chromakey=$key:0.2:0.05,scale=1080:-2[fg]"; else fg="[1:v]scale=1080:-2[fg]"; fi

ffmpeg -y -hide_banner -loglevel error \
  -loop 1 -i "$bg" -i "$clip" \
  -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[bg];$fg;[bg][fg]overlay=(W-w)/2:H-h:shortest=1,format=yuv420p[v]" \
  -map "[v]" -map "1:a?" -c:v libx264 -crf 20 -c:a aac "$out"

echo "Done: $out"
