CURS3D Audio Portal fixed version

What this fixes:
- Removes youtubei.js, which is what causes "No valid URL to decipher".
- Uses yt-dlp plus FFmpeg inside Docker.
- Works on Railway as a real backend website, not just a static page.

Railway setup:
1. Upload these files to your GitHub repo.
2. Railway should detect the Dockerfile and deploy using Docker.
3. In Railway, add a Volume and mount it to:
   /data
4. Optional but recommended: set PUBLIC_BASE_URL to your Railway domain, for example:
   https://your-site.up.railway.app

Important:
- Without a Railway Volume mounted to /data, MP3 files can disappear after redeploys.
- Only convert audio you own or have permission to use.
