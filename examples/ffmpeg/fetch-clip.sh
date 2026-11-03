#!/usr/bin/env bash
# Search the API and download the first match as greenscreen.mp4.
# Prints the clip's chromaKeyColor, to pass to key-over-image.sh / key-over-video.sh.
#
#   GSM_API_KEY=gsm_live_... ./fetch-clip.sh "slow clap"
#
# Needs curl and jq.
set -euo pipefail

: "${GSM_API_KEY:?Set GSM_API_KEY (free Sandbox key: https://api.greenscreenmemes.app/dashboard)}"
query=${1:?Usage: $0 "<search words>"}

json=$(curl -fsS -G -H "Authorization: Bearer $GSM_API_KEY" \
  --data-urlencode "q=$query" --data-urlencode "limit=1" \
  https://api.greenscreenmemes.app/v1/memes)

if [ "$(jq '.data | length' <<<"$json")" = 0 ]; then
  echo "Nothing matched \"$query\". Try a feeling or action, like \"shocked\" or \"happy dance\"." >&2
  exit 1
fi

jq -r '.data[0] | "Picked \"\(.name)\" (\(.id)), \(.chromaKeyColor) background"' <<<"$json" >&2
url=$(jq -r '.data[0].videoUrl // empty' <<<"$json")
[ -n "$url" ] || { echo "This key has no media access, so there is no video link." >&2; exit 1; }

# Signed link, expires after about 6 hours: keep the file, not the link.
curl -fsSL -o greenscreen.mp4 "$url"
echo "Downloaded greenscreen.mp4" >&2
jq -r '.data[0].chromaKeyColor' <<<"$json"
