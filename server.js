const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || path.join(__dirname, 'downloads');
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const COOKIE_ENV = process.env.YOUTUBE_COOKIES_BASE64 || '';
const COOKIE_PATH = path.join('/tmp', 'youtube-cookies.txt');

fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));
app.use('/files', express.static(DOWNLOAD_DIR));

function writeCookiesIfPresent() {
  if (!COOKIE_ENV.trim()) return false;
  try {
    const decoded = Buffer.from(COOKIE_ENV.trim(), 'base64').toString('utf8');
    if (!decoded.includes('youtube.com') && !decoded.includes('.youtube.com')) {
      console.warn('[cookies] YOUTUBE_COOKIES_BASE64 decoded, but it does not look like YouTube cookies.');
    }
    fs.writeFileSync(COOKIE_PATH, decoded, { mode: 0o600 });
    console.log(`[cookies] Wrote YouTube cookies to ${COOKIE_PATH}`);
    return true;
  } catch (err) {
    console.error('[cookies] Failed to decode/write YOUTUBE_COOKIES_BASE64:', err.message);
    return false;
  }
}

function safeQuality(value) {
  const q = String(value || '192');
  return ['128', '192', '320'].includes(q) ? q : '192';
}

function buildPublicUrl(req, filename) {
  const base = PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${base}/files/${encodeURIComponent(filename)}`;
}

app.get('/version', (req, res) => {
  res.json({
    version: '3.2-cookies-fixed',
    cookiesEnabled: Boolean(COOKIE_ENV.trim()),
    cookieFileExists: fs.existsSync(COOKIE_PATH),
    downloadDir: DOWNLOAD_DIR,
    node: process.version
  });
});

app.post('/convert', (req, res) => {
  const { url, quality } = req.body || {};

  if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: 'Paste a valid YouTube URL first.' });
  }

  const cookiesReady = writeCookiesIfPresent();
  const id = crypto.randomBytes(6).toString('hex');
  const outputTemplate = path.join(DOWNLOAD_DIR, `curs3d-${id}.%(ext)s`);
  const bitrate = safeQuality(quality);

  const args = [
    '--no-playlist',
    '--extract-audio',
    '--audio-format', 'mp3',
    '--audio-quality', `${bitrate}K`,
    '--ffmpeg-location', '/usr/bin/ffmpeg',
    '--output', outputTemplate,
    '--print', 'after_move:filepath',
    '--newline'
  ];

  if (cookiesReady) {
    args.unshift('--cookies', COOKIE_PATH);
  }

  args.push(url);

  console.log('[yt-dlp]', args.map(a => a === COOKIE_PATH ? '[COOKIE_FILE]' : a).join(' '));

  const proc = spawn('yt-dlp', args, { env: process.env });
  let stdout = '';
  let stderr = '';

  proc.stdout.on('data', data => { stdout += data.toString(); });
  proc.stderr.on('data', data => { stderr += data.toString(); });

  proc.on('error', err => {
    return res.status(500).json({ error: `Could not start yt-dlp: ${err.message}` });
  });

  proc.on('close', code => {
    if (code !== 0) {
      console.error('[yt-dlp error]', stderr || stdout);
      return res.status(500).json({
        error: (stderr || stdout || `yt-dlp failed with code ${code}`).trim()
      });
    }

    const lines = stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const finalPath = [...lines].reverse().find(line => line.endsWith('.mp3'));

    let filename;
    if (finalPath && fs.existsSync(finalPath)) {
      filename = path.basename(finalPath);
    } else {
      const newest = fs.readdirSync(DOWNLOAD_DIR)
        .filter(f => f.startsWith(`curs3d-${id}`) && f.endsWith('.mp3'))
        .sort((a, b) => fs.statSync(path.join(DOWNLOAD_DIR, b)).mtimeMs - fs.statSync(path.join(DOWNLOAD_DIR, a)).mtimeMs)[0];
      filename = newest;
    }

    if (!filename) {
      return res.status(500).json({ error: 'MP3 was created, but the server could not find the output file.' });
    }

    return res.json({ url: buildPublicUrl(req, filename), filename });
  });
});

writeCookiesIfPresent();
app.listen(PORT, () => {
  console.log(`CURS3D Audio running on port ${PORT}`);
});
