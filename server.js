const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Innertube } = require('youtubei.js');

const app = express();
const PORT = process.env.PORT || 3000;
const DOWNLOADS = path.join(__dirname, 'downloads');

if (!fs.existsSync(DOWNLOADS)) fs.mkdirSync(DOWNLOADS);

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use('/downloads', express.static(DOWNLOADS));

app.post('/convert', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'No URL provided' });

  // Extract video ID from URL
  const match = url.match(/(?:youtu\.be\/|v=|shorts\/)([\w\-]{11})/);
  if (!match) return res.status(400).json({ error: 'Invalid YouTube URL' });
  const videoId = match[1];

  try {
    const youtube = await Innertube.create({ cache: false });
    const info = await youtube.getInfo(videoId);

    // Pick best audio-only format
    const format = info.chooseFormat({ type: 'audio', quality: 'best' });
    if (!format) return res.status(500).json({ error: 'No audio format found' });

    const filename = `track_${Date.now()}.mp3`;
    const outPath = path.join(DOWNLOADS, filename);

    // Stream audio directly to file
    const stream = await info.download({ type: 'audio', quality: 'best' });
    const writeStream = fs.createWriteStream(outPath);

    for await (const chunk of stream) {
      writeStream.write(chunk);
    }

    writeStream.end();

    writeStream.on('finish', () => {
      const fileUrl = `${req.protocol}://${req.get('host')}/downloads/${filename}`;
      console.log(`Done: ${fileUrl}`);
      res.json({ url: fileUrl, filename });
    });

    writeStream.on('error', (err) => {
      console.error(err);
      res.status(500).json({ error: 'Failed to save file' });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Conversion failed: ' + err.message });
  }
});

app.listen(PORT, () => console.log(`🔥 CURS3D running on port ${PORT}`));
