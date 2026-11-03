# Python

[`meme.py`](meme.py) does the same as the [Node example](../node): search, pick the
first result, download it and key it over your photo or video with ffmpeg. Standard
library only (Python 3.9+).

```sh
export GSM_API_KEY=gsm_live_...
python3 meme.py "shocked cat" background.jpg            # -> meme.mp4
python3 meme.py "slow clap" background.mp4 clap.mp4     # over a video
```

Needs `ffmpeg` and `ffprobe` on your PATH.

If you see `CERTIFICATE_VERIFY_FAILED` on macOS, your Python (from the python.org
installer) has no CA certificates yet: run `Install Certificates.command` from its
folder in Applications, or set `SSL_CERT_FILE=/etc/ssl/cert.pem`.

The pieces are small enough to lift into your own code: `api()` for authenticated
JSON requests, `download()` for the signed media link (it expires after about 6
hours, so keep the file, not the link) and `ffmpeg_args()` for the compositing
recipe.
