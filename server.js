const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const ytDlp = require('yt-dlp-exec');

const app = express();
const PORT = process.env.PORT || 3000;
const DOWNLOADS = path.join(__dirname, 'downloads');

if (!fs.existsSync(DOWNLOADS)) fs.mkdirSync(DOWNLOADS);

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use('/downloads', express.static(DOWNLOADS));

app.post('/convert', async (req, res) => {
  const { url, quality = '192' } = req.body;
  if (!url) return res.status(400).json({ error: 'No URL provided' });

  const filename = `track_${Date.now()}.mp3`;
  const outPath = path.join(DOWNLOADS, filename);

  try {
    await ytDlp(url, {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: `${quality}K`,
      output: outPath,
    });

    // yt-dlp sometimes adds .mp3 extension itself
    const finalName = fs.existsSync(outPath) ? filename : filename;
    const fileUrl = `${req.protocol}://${req.get('host')}/downloads/${finalName}`;

    res.json({ url: fileUrl, filename: finalName });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Conversion failed: ' + err.message });
  }
});

app.listen(PORT, () => console.log(`🔥 CURS3D running on port ${PORT}`));
