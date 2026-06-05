CURS3D Audio Portal v3.2 cookies fixed

Railway variables:
- YOUTUBE_COOKIES_BASE64 = base64 encoded Netscape cookies.txt
- PUBLIC_BASE_URL = your Railway URL, optional but recommended

Railway volume:
- Mount volume to /data so MP3 files survive redeploys.

Check:
- /version must show cookiesEnabled:true when the env var is present.
- /version must show version 3.2-cookies-fixed.
