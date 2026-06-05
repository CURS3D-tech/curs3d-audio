const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || '';
const DOWNLOADS = process.env.DOWNLOAD_DIR || path.join(__dirname, 'downloads');

fs.mkdirSync(DOWNLOADS, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));
app.use('/downloads', express.static(DOWNLOADS, {
  setHeaders(res) {
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
}));

function getVideoId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') return parsed.pathname.slice(1).split('/')[0];
    if (parsed.hostname.endsWith('youtube.com')) {
      if (parsed.pathname === '/watch') return parsed.searchParams.get('v');
      if (parsed.pathname.startsWith('/shorts/')) return parsed.pathname.split('/')[2];
      if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/')[2];
    }
  } catch {
    return null;
  }
  return null;
}

function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('python3', ['-m', 'yt_dlp', ...args], {
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || stdout || `yt-dlp exited with code ${code}`));
    });
  });
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/convert', async (req, res) => {
  const { url, quality = '192' } = req.body || {};
  const videoId = typeof url === 'string' ? getVideoId(url.trim()) : null;
  const bitrate = ['128', '192', '320'].includes(String(quality)) ? String(quality) : '192';

  if (!videoId) {
    return res.status(400).json({ error: 'Paste a normal YouTube video, shorts, or youtu.be URL.' });
  }

  const safeName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const outputTemplate = path.join(DOWNLOADS, `${safeName}.%(ext)s`);
  const finalPath = path.join(DOWNLOADS, `${safeName}.mp3`);
  const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    await runYtDlp([
      '--no-playlist',
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', `${bitrate}K`,
      '--ffmpeg-location', '/usr/bin',
      '--output', outputTemplate,
      cleanUrl
    ]);

    if (!fs.existsSync(finalPath)) {
      return res.status(500).json({ error: 'Conversion finished, but the MP3 file was not created.' });
    }

    const host = PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const filename = path.basename(finalPath);
    res.json({
      url: `${host.replace(/\/$/, '')}/downloads/${filename}`,
      filename
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Conversion failed. If this keeps happening, redeploy so yt-dlp updates, or try another YouTube link.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`CURS3D Audio Portal running on port ${PORT}`);
});
