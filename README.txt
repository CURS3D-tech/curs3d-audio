CURS3D Audio Portal fixed version

What this fixes:
- Removes youtubei.js, which is what causes "No valid URL to decipher".
- Uses yt-dlp plus FFmpeg inside Docker.
- Works on Railway as a real backend website, not just a static page.
- Shows the real yt-dlp error in the red box instead of hiding it.
- Supports YOUTUBE_COOKIES_BASE64 if YouTube blocks Railway as bot traffic.
- Adds /version so you can confirm Railway is running the newest backend.

Railway setup:
1. Upload these files to your GitHub repo.
2. Railway should detect the Dockerfile and deploy using Docker.
3. In Railway, add a Volume and mount it to:
   /data
4. Optional but recommended: set PUBLIC_BASE_URL to your Railway domain, for example:
   https://your-site.up.railway.app

Check the deploy:
- Open https://your-site.up.railway.app/version
- It should say:
  {"version":"3.1-diagnostics", ...}
- If it does not, Railway is still running old code.

Important:
- Without a Railway Volume mounted to /data, MP3 files can disappear after redeploys.
- If the site says YouTube wants sign-in, bot confirmation, or cookies, Railway's server IP is blocked by YouTube.
- In that case export your YouTube cookies as Netscape cookies.txt, base64 encode the file, and add it to Railway as:
  YOUTUBE_COOKIES_BASE64
- Only convert audio you own or have permission to use.
