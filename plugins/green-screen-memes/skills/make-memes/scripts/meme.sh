#!/usr/bin/env bash
# Key a Green Screen Memes clip over a background and add caption lines.
# Output: vertical 1080x1920 H.264/AAC MP4, as long as the clip, with the clip's sound.
#
#   meme.sh BACKGROUND CLIP KEY_COLOR OUT.mp4 ["caption line 1" "caption line 2" ...]
#
#   BACKGROUND  a photo (.jpg/.png/.webp...), a video, or a solid color such as "color:white"
#   CLIP        the downloaded green screen MP4
#   KEY_COLOR   the clip's chromaKeyColor from the API: green, blue, red or none
#   captions    one argument per line; drawtext doesn't wrap, so keep each line short
#
# Environment (all optional):
#   POSITION=bottom|center|top  where the clip sits (default bottom)
#   CLIP_WIDTH=1080             clip width in px
#   SIMILARITY=0.3              chromakey similarity: raise if a fringe stays, lower if the subject loses color
#   BLEND=0.08                  chromakey edge blend
#   BG_VOLUME=0.35              background video's volume under the clip's sound
#   CAPTION_Y=200               y of the first caption line
#   FONTSIZE=64  TEXT_COLOR=white  BOX_COLOR=black  FONT=/path/to/font.ttf
set -euo pipefail

if [ $# -lt 4 ]; then
  sed -n '2,20p' "$0" >&2
  exit 1
fi
bg=$1 clip=$2 color=$3 out=$4
shift 4

position=${POSITION:-bottom}
clip_w=${CLIP_WIDTH:-1080}
sim=${SIMILARITY:-0.3}
blend=${BLEND:-0.08}
bg_volume=${BG_VOLUME:-0.35}
cap_y=${CAPTION_Y:-200}
fontsize=${FONTSIZE:-64}
text_color=${TEXT_COLOR:-white}
box_color=${BOX_COLOR:-black}
border=$(( fontsize * 28 / 100 ))
step=$(( fontsize + 2 * border + 8 ))

case $color in
  green) key=0x00ff00 ;;
  blue)  key=0x0000ff ;;
  red)   key=0xff0000 ;;
  none)  key= ;;
  *) echo "Unknown key color: $color (use green, blue, red or none)" >&2; exit 1 ;;
esac

case $position in
  bottom) xy="(W-w)/2:H-h" ;;
  center) xy="(W-w)/2:(H-h)/2" ;;
  top)    xy="(W-w)/2:0" ;;
  *) echo "Unknown POSITION: $position (use bottom, center or top)" >&2; exit 1 ;;
esac

[ -f "$clip" ] || { echo "Clip not found: $clip" >&2; exit 1; }

has_audio() { [ -n "$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$1" 2>/dev/null)" ]; }

# Background input: solid color, still image, or video (looped if shorter than the clip).
kind=video
case $bg in
  color:*) kind=color; bg_in=(-f lavfi -i "color=c=${bg#color:}:s=1080x1920:r=30") ;;
  *.jpg|*.JPG|*.jpeg|*.JPEG|*.png|*.PNG|*.webp|*.WEBP|*.bmp|*.heic|*.HEIC)
    kind=image; bg_in=(-loop 1 -i "$bg") ;;
  *) bg_in=(-stream_loop -1 -i "$bg") ;;
esac
[ "$kind" = color ] || [ -f "$bg" ] || { echo "Background not found: $bg" >&2; exit 1; }

if [ -n "$key" ]; then fg="[1:v]chromakey=$key:$sim:$blend,scale=$clip_w:-2[fg]"; else fg="[1:v]scale=$clip_w:-2[fg]"; fi
graph="[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[bg];$fg;[bg][fg]overlay=$xy:shortest=1,format=yuv420p"

# Captions: one boxed drawtext per line, read from files so quotes, colons and % need no escaping.
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
font=${FONT:-}
if [ -z "$font" ]; then
  for f in "/System/Library/Fonts/Supplemental/Arial Bold.ttf" \
           /usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf \
           /usr/share/fonts/dejavu/DejaVuSans-Bold.ttf \
           /usr/share/fonts/TTF/DejaVuSans-Bold.ttf \
           /usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf \
           C:/Windows/Fonts/arialbd.ttf; do
    [ -f "$f" ] && { font=$f; break; }
  done
fi
fontopt=
[ -n "$font" ] && fontopt=":fontfile='$font'"

i=0
for line in "$@"; do
  [ -n "$line" ] || continue
  if [ ${#line} -gt $(( 1700 / fontsize )) ]; then
    echo "Warning: caption line may be too wide for 1080px at size $fontsize, split it: $line" >&2
  fi
  printf '%s' "$line" > "$tmp/line$i.txt"
  graph="$graph,drawtext=textfile='$tmp/line$i.txt'$fontopt:expansion=none:fontcolor=$text_color:fontsize=$fontsize:box=1:boxcolor=$box_color:boxborderw=$border:x=(w-text_w)/2:y=$(( cap_y + i * step ))"
  i=$(( i + 1 ))
done
graph="$graph[v]"

# Sound: the clip's own, with a video background's sound mixed in quietly when both have audio.
if [ "$kind" = video ] && has_audio "$bg" && has_audio "$clip"; then
  graph="$graph;[0:a]volume=$bg_volume[bga];[1:a][bga]amix=inputs=2:duration=first:normalize=0[a]"
  audio=(-map "[a]")
else
  audio=(-map "1:a?")
fi

ffmpeg -nostdin -y -hide_banner -loglevel error \
  "${bg_in[@]}" -i "$clip" \
  -filter_complex "$graph" \
  -map "[v]" "${audio[@]}" -c:v libx264 -crf 20 -preset medium -c:a aac -movflags +faststart "$out"

echo "Done: $out"
